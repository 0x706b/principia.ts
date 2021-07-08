/* eslint-disable functional/immutable-data */
import type { Byte, ByteArray } from '../Byte'
import type { Either } from '../Either'
import type { Eq } from '../Eq'
import type * as Ev from '../Eval/core'
import type { ChunkURI } from '../Modules'
import type { Predicate } from '../Predicate'
import type { Refinement } from '../Refinement'
import type { These } from '../These'

import * as A from '../Array/core'
import * as E from '../Either'
import { pipe, unsafeCoerce } from '../function'
import * as HKT from '../HKT'
import * as It from '../Iterable/core'
import * as N from '../number'
import * as O from '../Option'
import { EQ } from '../Ordering'
import { isByte } from '../prelude'
import * as P from '../prelude'
import * as Equ from '../Structural/Equatable'
import * as Ha from '../Structural/Hashable'
import * as Th from '../These'
import { AtomicNumber } from '../util/support/AtomicNumber'

type URI = [HKT.URI<ChunkURI>]

const BUFFER_SIZE = 64

export const ChunkTypeId = Symbol()
export type ChunkTypeId = typeof ChunkTypeId

export const ChunkTag = {
  Empty: 'Empty',
  Concat: 'Concat',
  AppendN: 'AppendN',
  PrependN: 'PrependN',
  Slice: 'Slice',
  Singleton: 'Singleton',
  Arr: 'Arr',
  BinArr: 'BinArr'
} as const

export abstract class Chunk<A> implements Iterable<A>, Ha.Hashable, Equ.Equatable {
  readonly [ChunkTypeId]: ChunkTypeId = ChunkTypeId
  readonly _A!: () => A
  abstract readonly length: number
  abstract [Symbol.iterator](): Iterator<A>

  constructor() {
    this['++'] = this['++'].bind(this)
    this[':+'] = this[':+'].bind(this)
  }

  get [Ha.$hash](): number {
    return Ha.hashIterator(this[Symbol.iterator]())
  }

  [Equ.$equals](that: unknown): boolean {
    return isChunk(that) && corresponds_(this, that, Equ.equals)
  }

  /**
   * Returns the concatenation of this chunk with the specified chunk.
   */
  ['++'](that: Chunk<A>): Chunk<A> {
    return concat_(this, that)
  }

  /**
   * Appends an element to the chunk.
   */
  [':+'](a: A): Chunk<A> {
    return append_(this, a)
  }
}

abstract class ChunkImplementation<A> extends Chunk<A> implements Iterable<A> {
  abstract readonly length: number
  abstract readonly depth: number
  abstract readonly left: Chunk<A>
  abstract readonly right: Chunk<A>
  abstract readonly binary: boolean
  abstract get(n: number): A
  abstract foreach<B>(f: (a: A) => B): void
  abstract toArray(n: number, dest: Array<A> | Uint8Array): void
  abstract arrayIterator(): Iterator<ArrayLike<A>>
  abstract reverseArrayIterator(): Iterator<ArrayLike<A>>
  abstract [Symbol.iterator](): Iterator<A>

  private arrayLikeCache: ArrayLike<unknown> | undefined
  arrayLike(): ArrayLike<A> {
    if (this.arrayLikeCache) {
      return this.arrayLikeCache as ArrayLike<A>
    }
    const arr = this.binary ? alloc(this.length) : new Array(this.length)
    this.toArray(0, arr)
    this.arrayLikeCache = arr
    return arr as ArrayLike<A>
  }

  private arrayCache: Array<unknown> | undefined
  array(): ReadonlyArray<A> {
    if (this.arrayCache) {
      return this.arrayCache as Array<A>
    }
    const arr = new Array(this.length)
    this.toArray(0, arr)
    this.arrayCache = arr
    return arr as Array<A>
  }

  concat(that: ChunkImplementation<A>): ChunkImplementation<A> {
    concrete<A>(this)
    concrete<A>(that)
    if (this._chunkTag === ChunkTag.Empty) {
      return that
    }
    if (that._chunkTag === ChunkTag.Empty) {
      return this
    }
    if (this._chunkTag === ChunkTag.AppendN) {
      const chunk = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return this.start.concat(chunk).concat(that)
    }
    if (that._chunkTag === ChunkTag.PrependN) {
      const chunk = fromArray(A.takeLast_(that.buffer as Array<A>, that.bufferUsed))
      return this.concat(chunk).concat(that)
    }
    const diff = that.depth - this.depth
    if (Math.abs(diff) <= 1) {
      return new Concat(this, that)
    } else if (diff < -1) {
      if (this.left.depth >= this.right.depth) {
        const nr = this.right.concat(that)
        return new Concat(this.left, nr)
      } else {
        concrete(this.right)
        const nrr = this.right.right.concat(that)
        if (nrr.depth === this.depth - 3) {
          const nr = new Concat(this.right.left, nrr)
          return new Concat(this.left, nr)
        } else {
          const nl = new Concat(this.left, this.right.left)
          return new Concat(nl, nrr)
        }
      }
    } else {
      if (that.right.depth >= that.left.depth) {
        const nl = this.concat(that.left)
        return new Concat(nl, that.right)
      } else {
        concrete(that.left)
        const nll = this.concat(that.left.left)
        if (nll.depth === that.depth - 3) {
          const nl = new Concat(nll, that.left.right)
          return new Concat(nl, that.right)
        } else {
          const nr = new Concat(that.left.right, that.right)
          return new Concat(nll, nr)
        }
      }
    }
  }
  take(n: number): ChunkImplementation<A> {
    if (n <= 0) {
      return _Empty
    } else if (n >= this.length) {
      return this
    } else {
      concrete<A>(this)
      switch (this._chunkTag) {
        case ChunkTag.Empty:
          return _Empty
        case ChunkTag.Slice:
          return n >= this.l ? this : new Slice(this.chunk, this.offset, n)
        case ChunkTag.Singleton:
          return this
        default:
          return new Slice(this, 0, n)
      }
    }
  }
  append<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[0]    = a
    return new AppendN<A | A1>(
      this as ChunkImplementation<A | A1>,
      buffer,
      1,
      new AtomicNumber(1),
      this.binary && binary
    )
  }
  prepend<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary            = this.binary && isByte(a)
    const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[BUFFER_SIZE - 1] = a
    return new PrependN<A | A1>(
      this as ChunkImplementation<A | A1>,
      buffer,
      1,
      new AtomicNumber(1),
      this.binary && binary
    )
  }

  /**
   * Materializes a chunk into a chunk backed by an array. This method can
   * improve the performance of bulk operations.
   */
  materialize(): ChunkImplementation<A> {
    concrete(this)
    switch (this._chunkTag) {
      case ChunkTag.Empty:
        return this
      case ChunkTag.Arr:
        return this
      default:
        return fromArray(this.arrayLike())
    }
  }
}

const alloc = typeof Buffer !== 'undefined' ? Buffer.alloc : (n: number) => new Uint8Array(n)

class ArrayIndexOutOfBoundsException extends Error {
  constructor(readonly index: number) {
    super()
  }
}

class Empty<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.Empty

  length = 0
  depth  = 0
  left   = this
  right  = this
  binary = false
  get(_: number): A {
    throw new ArrayIndexOutOfBoundsException(_)
  }
  foreach<B>(_: (a: never) => B): void {
    return
  }
  toArray(_: number, __: Array<A> | Uint8Array): void {
    return
  }
  [Symbol.iterator](): Iterator<A> {
    return {
      next: () => {
        return {
          value: null,
          done: true
        }
      }
    }
  }
  arrayIterator(): Iterator<Array<A>> {
    return {
      next: () => ({
        value: undefined,
        done: true
      })
    }
  }
  reverseArrayIterator(): Iterator<Array<A>> {
    return {
      next: () => ({
        value: undefined,
        done: true
      })
    }
  }
}
const _Empty = new Empty<any>()

class Concat<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.Concat

  length = this.left.length + this.right.length
  depth  = 1 + Math.max(this.left.depth, this.right.depth)
  binary = this.left.binary && this.right.binary
  constructor(readonly left: ChunkImplementation<A>, readonly right: ChunkImplementation<A>) {
    super()
  }
  get(n: number): A {
    return n < this.left.length ? this.left.get(n) : this.right.get(n - this.left.length)
  }
  foreach<B>(f: (a: A) => B): void {
    this.left.foreach(f)
    this.right.foreach(f)
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    this.left.toArray(n, dest)
    this.right.toArray(n + this.left.length, dest)
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    return It.concat_(
      It.iterable(() => this.left.arrayIterator()),
      It.iterable(() => this.right.arrayIterator())
    )[Symbol.iterator]()
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    return It.concat_(It.iterable(this.right.reverseArrayIterator), It.iterable(this.left.reverseArrayIterator))[
      Symbol.iterator
    ]()
  }
}

class AppendN<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.AppendN

  length = this.start.length + this.bufferUsed
  depth  = 0
  left   = _Empty
  right  = _Empty
  constructor(
    readonly start: ChunkImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
  }
  append<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length && this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[this.bufferUsed] = a
        return new AppendN<A | A1>(
          this.start as ChunkImplementation<A | A1>,
          this.buffer,
          this.bufferUsed + 1,
          this.chain,
          this.binary && binary
        )
      }
      this.buffer[this.bufferUsed] = a
      return new AppendN<A | A1>(
        this.start as ChunkImplementation<A | A1>,
        this.buffer,
        this.bufferUsed + 1,
        this.chain,
        this.binary && binary
      )
    } else {
      const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[0]    = a
      const chunk  = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return new AppendN<A | A1>(
        this.start.concat(chunk) as ChunkImplementation<A | A1>,
        buffer,
        1,
        new AtomicNumber(1),
        this.binary && binary
      )
    }
  }
  get(n: number): A {
    if (n < this.start.length) {
      return this.start.get(n)
    } else {
      return this.buffer[n - this.start.length] as A
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    this.start.toArray(n, dest)
    copyArray(this.buffer as ArrayLike<A>, 0, dest, this.start.length + n, this.bufferUsed)
  }
  foreach<B>(f: (a: A) => B): void {
    this.start.foreach(f)
    for (let i = 0; i < this.bufferUsed; i++) {
      f(this.buffer[i] as A)
    }
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    const array = this.arrayLike()
    let done    = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    const array = this.arrayLike()
    let done    = true
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class PrependN<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.PrependN

  length = this.end.length + this.bufferUsed
  depth  = 0
  left   = _Empty
  right  = _Empty
  constructor(
    readonly end: ChunkImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
  }
  prepend<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length && this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
        return new PrependN<A | A1>(
          this.end as ChunkImplementation<A | A1>,
          buffer,
          this.bufferUsed + 1,
          this.chain,
          this.binary && binary
        )
      }
      this.buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
      return new PrependN<A | A1>(
        this.end as ChunkImplementation<A | A1>,
        this.buffer,
        this.bufferUsed + 1,
        this.chain,
        this.binary && binary
      )
    } else {
      const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[BUFFER_SIZE - 1] = a
      const chunk             = fromArray(
        'subarray' in this.buffer
          ? this.buffer.subarray(this.buffer.length - this.bufferUsed)
          : this.buffer.slice(this.buffer.length - this.bufferUsed)
      ) as ChunkImplementation<A>
      return new PrependN<A | A1>(
        chunk.concat(this.end) as ChunkImplementation<A | A1>,
        buffer,
        1,
        new AtomicNumber(1),
        this.binary && binary
      )
    }
  }
  get(n: number): A {
    return n < this.bufferUsed
      ? (this.buffer[BUFFER_SIZE - this.bufferUsed + n] as A)
      : this.end.get(n - this.bufferUsed)
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    const length = Math.min(this.bufferUsed, Math.max(dest.length - n, 0))
    copyArray(this.buffer, BUFFER_SIZE - this.bufferUsed, dest, n, length)
    this.end.toArray(n + length, dest)
  }
  foreach<B>(f: (a: A) => B): void {
    for (let i = BUFFER_SIZE - this.bufferUsed - 1; i < BUFFER_SIZE; i++) {
      f(this.buffer[i] as A)
    }
    this.end.foreach(f)
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Singleton<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.Singleton

  length = 1
  depth  = 0
  left   = _Empty
  right  = _Empty
  binary = isByte(this.value)
  constructor(readonly value: A) {
    super()
  }
  get(n: number): A {
    if (n === 0) {
      return this.value
    }
    throw new ArrayIndexOutOfBoundsException(n)
  }
  foreach<B>(f: (a: A) => B): void {
    f(this.value)
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    // eslint-disable-next-line functional/immutable-data
    dest[n] = this.value
  }
  [Symbol.iterator](): Iterator<A> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.value,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: [this.value],
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: [this.value],
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Slice<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.Slice

  length = this.l
  depth  = 0
  left   = _Empty
  right  = _Empty
  binary = this.chunk.binary
  constructor(readonly chunk: ChunkImplementation<A>, readonly offset: number, readonly l: number) {
    super()
  }
  get(n: number): A {
    return this.chunk.get(this.offset + n)
  }
  foreach<B>(f: (a: A) => B): void {
    let i = 0
    while (i < this.length) {
      f(this.get(i))
      i++
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    let i = 0
    let j = n
    while (i < this.length) {
      dest[j] = this.get(i)
      i++
      j++
    }
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Arr<A> extends ChunkImplementation<A> {
  readonly _chunkTag = ChunkTag.Arr

  length = this._array.length
  depth  = 0
  left   = _Empty
  right  = _Empty
  binary = false
  constructor(readonly _array: ReadonlyArray<A>) {
    super()
  }
  get(n: number): A {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this._array[n]
  }
  foreach<B>(f: (a: A) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(this._array[i])
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    copyArray(this._array, 0, dest, n, this.length)
  }
  [Symbol.iterator](): Iterator<A> {
    return this._array[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ReadonlyArray<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ReadonlyArray<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class BinArr extends ChunkImplementation<Byte> {
  readonly _chunkTag = ChunkTag.BinArr

  length = this._array.length
  depth  = 0
  left   = _Empty
  right  = _Empty
  binary = true
  constructor(readonly _array: ByteArray) {
    super()
  }
  get(n: number): Byte {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this._array[n]
  }
  foreach<B>(f: (a: Byte) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(this._array[i])
    }
  }
  [Symbol.iterator](): Iterator<Byte> {
    return this._array[Symbol.iterator]()
  }
  toArray(n: number, dest: Array<Byte> | Uint8Array): void {
    copyArray(this._array, 0, dest, n, this.length)
  }
  arrayIterator(): Iterator<ArrayLike<Byte>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<Byte>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

/**
 * @optimize remove
 */
export function concrete<A>(
  _: Chunk<A>
): asserts _ is Empty<A> | Singleton<A> | Concat<A> | AppendN<A> | PrependN<A> | Slice<A> | Arr<A> {
  //
}

function copyArray<A>(
  source: ArrayLike<A>,
  sourcePos: number,
  dest: Array<A> | Uint8Array,
  destPos: number,
  length: number
): void {
  const j = Math.min(source.length, sourcePos + length)
  for (let i = sourcePos; i < j; i++) {
    // eslint-disable-next-line functional/immutable-data
    dest[destPos + i - sourcePos] = source[i]
  }
}

function fromArray<A>(array: ArrayLike<A>): ChunkImplementation<A> {
  if (array.length === 0) {
    return _Empty
  } else {
    return 'buffer' in array ? (new BinArr(array as any) as any) : new Arr(Array.from(array))
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export class ChunkBuilder<A> {
  constructor(private chunk: Chunk<A>) {}
  append(a: A): ChunkBuilder<A> {
    this.chunk = append_(this.chunk, a)
    return this
  }
  result(): Chunk<A> {
    return this.chunk
  }
}

export function builder<A>(): ChunkBuilder<A> {
  return new ChunkBuilder(empty())
}

export function empty<B>(): Chunk<B> {
  return new Empty()
}

export function from<A>(as: Iterable<A>): Chunk<A> {
  return new Arr(A.from(as))
}

export function fromBuffer(bytes: Uint8Array): Chunk<Byte> {
  return new BinArr(bytes as any)
}

export function make<A>(...as: ReadonlyArray<A>): Chunk<A> {
  return new Arr(as)
}

export function range(start: number, end: number): Chunk<number> {
  return fromArray(A.range(start, end))
}

export function replicate<A>(n: number, a: A): Chunk<A> {
  return fill(n, () => a)
}

export function single<A>(a: A): Chunk<A> {
  return new Singleton(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * predicates
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(chunk: Chunk<A>): boolean {
  concrete(chunk)
  return chunk.length === 0
}

export function isNonEmpty<A>(chunk: Chunk<A>): boolean {
  return !isEmpty(chunk)
}

export function isChunk<A>(u: Iterable<A>): u is Chunk<A>
export function isChunk(u: unknown): u is Chunk<unknown>
export function isChunk(u: unknown): u is Chunk<unknown> {
  return P.isObject(u) && ChunkTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Equatable
 * -------------------------------------------------------------------------------------------------
 */

export function corresponds_<A, B>(as: Chunk<A>, bs: Chunk<B>, f: (a: A, b: B) => boolean): boolean {
  if (as.length !== bs.length) {
    return false
  }

  concrete(as)
  concrete(bs)

  const leftIterator  = as.arrayIterator()
  const rightIterator = bs.arrayIterator()

  let left: ArrayLike<A> | undefined  = undefined
  let right: ArrayLike<B> | undefined = undefined
  let leftLength                      = 0
  let rightLength                     = 0
  let i                               = 0
  let j                               = 0
  let equal                           = true
  let done                            = false

  let leftNext
  let rightNext

  while (equal && !done) {
    if (i < leftLength && j < rightLength) {
      const a = left![i]
      const b = right![j]
      if (!f(a, b)) {
        equal = false
      }
      i++
      j++
    } else if (i === leftLength && !(leftNext = leftIterator.next()).done) {
      left       = leftNext.value
      leftLength = left.length
      i          = 0
    } else if (j === rightLength && !(rightNext = rightIterator.next()).done) {
      right       = rightNext.value
      rightLength = right.length
      j           = 0
    } else if (i === leftLength && j === rightLength) {
      done = true
    } else {
      equal = false
    }
  }

  return equal
}

export function corresponds<A, B>(bs: Chunk<B>, f: (a: A, b: B) => boolean): (as: Chunk<A>) => boolean {
  return (as) => corresponds_(as, bs, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function head<A>(chunk: Chunk<A>): O.Option<A> {
  concrete(chunk)
  if (isEmpty(chunk)) {
    return O.none()
  }
  return O.some(chunk.get(0))
}

export function init<A>(chunk: Chunk<A>): O.Option<Chunk<A>> {
  if (isEmpty(chunk)) {
    return O.none()
  }
  return O.some(take_(chunk, chunk.length - 1))
}

export function last<A>(chunk: Chunk<A>): O.Option<A> {
  concrete(chunk)
  if (isEmpty(chunk)) {
    return O.none()
  }
  return O.some(chunk.get(chunk.length - 1))
}

export function tail<A>(chunk: Chunk<A>): O.Option<Chunk<A>> {
  concrete(chunk)
  if (isEmpty(chunk)) {
    return O.none()
  }
  return O.some(drop_(chunk, 1))
}

export function toArray<A>(chunk: Chunk<A>): ReadonlyArray<A> {
  concrete(chunk)
  return chunk.array()
}

export function toArrayLike<A>(chunk: Chunk<A>): ArrayLike<A> {
  concrete(chunk)
  return chunk.arrayLike()
}

export function toBuffer(chunk: Chunk<Byte>): Uint8Array {
  return unsafeCoerce(toArrayLike(chunk))
}

/*
 * -------------------------------------------------------------------------------------------------
 * ops
 * -------------------------------------------------------------------------------------------------
 */

export function append_<A, A1>(chunk: Chunk<A>, a1: A1): Chunk<A | A1> {
  concrete(chunk)
  return chunk.append(a1)
}

export function append<A>(a: A): (chunk: Chunk<A>) => Chunk<A> {
  return (chunk) => append_(chunk, a)
}

export function concatW_<A, B>(as: Chunk<A>, bs: Chunk<B>): Chunk<A | B> {
  concrete(as)
  concrete(bs)
  return as.concat(bs as any)
}

export function concatW<B>(bs: Chunk<B>): <A>(as: Chunk<A>) => Chunk<A | B> {
  return (as) => concatW_(as, bs)
}

export function concat_<A>(xs: Chunk<A>, ys: Chunk<A>): Chunk<A> {
  concrete(xs)
  concrete(ys)
  return xs.concat(ys)
}

export function concat<A>(ys: Chunk<A>): (xs: Chunk<A>) => Chunk<A> {
  return (xs) => concat_(xs, ys)
}

export function foreach_<A, B>(chunk: Chunk<A>, f: (a: A) => B): void {
  concrete(chunk)
  chunk.foreach(f)
}

export function foreach<A, B>(f: (a: A) => B): (chunk: Chunk<A>) => void {
  return (chunk) => foreach_(chunk, f)
}

export function prepend_<A>(chunk: Chunk<A>, a: A): Chunk<A> {
  concrete(chunk)
  return chunk.prepend(a)
}

export function prepend<A>(a: A): (chunk: Chunk<A>) => Chunk<A> {
  return (chunk) => prepend_(chunk, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<A, B, C>(fa: Chunk<A>, fb: Chunk<B>, f: (_: These<A, B>) => C): Chunk<C> {
  concrete(fa)
  concrete(fb)
  const out    = builder<C>()
  const minlen = Math.min(fa.length, fb.length)
  const maxlen = Math.max(fa.length, fb.length)
  for (let i = 0; i < minlen; i++) {
    out.append(f(Th.both(fa.get(i), fb.get(i))))
  }
  if (minlen === maxlen) {
    return out.result()
  } else if (fa.length > fb.length) {
    for (let i = minlen; i < maxlen; i++) {
      out.append(f(Th.left(fa.get(i))))
    }
  } else {
    for (let i = minlen; i < maxlen; i++) {
      out.append(f(Th.right(fb.get(i))))
    }
  }
  return out.result()
}

export function alignWith<A, B, C>(fb: Chunk<B>, f: (_: These<A, B>) => C): (fa: Chunk<A>) => Chunk<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: Chunk<A>, fb: Chunk<B>): Chunk<These<A, B>> {
  return alignWith_(fa, fb, P.identity)
}

export function align<B>(fb: Chunk<B>): <A>(fa: Chunk<A>) => Chunk<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure = single

export function unit(): Chunk<void> {
  return single(undefined)
}
/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<A, B>(fab: Chunk<(a: A) => B>, fa: Chunk<A>): Chunk<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<A>(fa: Chunk<A>): <B>(fab: Chunk<(a: A) => B>) => Chunk<B> {
  return (fab) => ap_(fab, fa)
}

export function cross_<A, B>(as: Chunk<A>, bs: Chunk<B>): Chunk<readonly [A, B]> {
  return crossWith_(as, bs, P.tuple)
}

export function cross<B>(bs: Chunk<B>): <A>(as: Chunk<A>) => Chunk<readonly [A, B]> {
  return (as) => cross_(as, bs)
}

export function crossWith_<A, B, C>(as: Chunk<A>, bs: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> {
  return chain_(as, (a) => map_(bs, (b) => f(a, b)))
}

export function crossWith<A, B, C>(bs: Chunk<B>, f: (a: A, b: B) => C): (as: Chunk<A>) => Chunk<C> {
  return (as) => crossWith_(as, bs, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Chunk<A>> {
  return P.Eq((xs, ys) => corresponds_(xs, ys, E.equals_))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function imap_<A, B>(chunk: Chunk<A>, f: (i: number, a: A) => B): Chunk<B> {
  concrete<A>(chunk)
  if (chunk._chunkTag === ChunkTag.Singleton) {
    return new Singleton(f(0, chunk.value))
  }
  const b        = builder<B>()
  const iterator = chunk.arrayIterator()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const as = result.value
    for (let j = 0; j < as.length; j++) {
      b.append(f(i, as[j]))
      i++
    }
  }
  return b.result()
}

export function imap<A, B>(f: (a: A) => B): (chunk: Chunk<A>) => Chunk<B> {
  return (chunk) => map_(chunk, f)
}

export function map_<A, B>(chunk: Chunk<A>, f: (a: A) => B): Chunk<B> {
  return imap_(chunk, (_, a) => f(a))
}

export function map<A, B>(f: (a: A) => B): (chunk: Chunk<A>) => Chunk<B> {
  return (chunk) => map_(chunk, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  concrete(ma)
  const iterator = ma.arrayIterator()
  let result: IteratorResult<ArrayLike<A>>
  let out        = empty<B>()
  while (!(result = iterator.next()).done) {
    const arr    = result.value
    const length = arr.length
    for (let i = 0; i < length; i++) {
      const a = arr[i]
      out     = concat_(out, f(a))
    }
  }
  return out
}

export function chain<A, B>(f: (a: A) => Chunk<B>): (ma: Chunk<A>) => Chunk<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: Chunk<Chunk<A>>): Chunk<A> {
  return chain_(mma, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<A>(fa: Chunk<A>, that: () => Chunk<A>): Chunk<A> {
  return concat_(fa, that())
}

export function alt<A>(that: () => Chunk<A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Zip
 * -------------------------------------------------------------------------------------------------
 */

export function zipWith_<A, B, C>(as: Chunk<A>, bs: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> {
  concrete(as)
  concrete(bs)
  const length = Math.min(as.length, bs.length)
  if (length === 0) {
    return empty()
  } else {
    const leftIterator                      = as.arrayIterator()
    const rightIterator                     = bs.arrayIterator()
    const out                               = builder<C>()
    let left: IteratorResult<ArrayLike<A>>  = null as any
    let right: IteratorResult<ArrayLike<B>> = null as any
    let leftLength                          = 0
    let rightLength                         = 0
    let i                                   = 0
    let j                                   = 0
    let k                                   = 0
    while (i < length) {
      if (j < leftLength && k < rightLength) {
        const a = left.value[j]
        const b = right.value[k]
        const c = f(a, b)
        out.append(c)
        i++
        j++
        k++
      } else if (j === leftLength && !(left = leftIterator.next()).done) {
        leftLength = left.value.length
        j          = 0
      } else if (k === rightLength && !(right = rightIterator.next()).done) {
        rightLength = right.value.length
        k           = 0
      }
    }
    return out.result()
  }
}

export function zipWith<A, B, C>(bs: Chunk<B>, f: (a: A, b: B) => C): (as: Chunk<A>) => Chunk<C> {
  return (as) => zipWith_(as, bs, f)
}

export function zip_<A, B>(as: Chunk<A>, bs: Chunk<B>): Chunk<readonly [A, B]> {
  return zipWith_(as, bs, P.tuple)
}

export function zip<B>(bs: Chunk<B>): <A>(as: Chunk<A>) => Chunk<readonly [A, B]> {
  return (as) => zip_(as, bs)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function ifilter_<A, B extends A>(fa: Chunk<A>, refinement: P.RefinementWithIndex<number, A, B>): Chunk<B>
export function ifilter_<A>(fa: Chunk<A>, predicate: P.PredicateWithIndex<number, A>): Chunk<A>
export function ifilter_<A>(fa: Chunk<A>, predicate: P.PredicateWithIndex<number, A>): Chunk<A> {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const out      = builder<A>()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      const a = array[j]
      if (predicate(i, a)) {
        out.append(a)
      }
      i++
    }
  }
  return out.result()
}

export function ifilter<A, B extends A>(refinement: P.RefinementWithIndex<number, A, B>): (fa: Chunk<A>) => Chunk<B>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Chunk<A>) => Chunk<A>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => Chunk<B>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<A, B>(fa: Chunk<A>, f: (i: number, a: A) => O.Option<B>): Chunk<B> {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const out      = builder<B>()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      const ob = f(i, array[j])
      if (O.isSome(ob)) {
        out.append(ob.value)
      }
      i++
    }
  }
  return out.result()
}

export function ifilterMap<A, B>(f: (i: number, a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => ifilterMap_(self, f)
}

export function filterMap_<A, B>(fa: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => filterMap_(self, f)
}

export function ipartition_<A, B extends A>(
  fa: Chunk<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [Chunk<A>, Chunk<B>]
export function ipartition_<A>(fa: Chunk<A>, predicate: P.PredicateWithIndex<number, A>): readonly [Chunk<A>, Chunk<A>]
export function ipartition_<A>(
  fa: Chunk<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Chunk<A>, Chunk<A>] {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const left     = builder<A>()
  const right    = builder<A>()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      const a = array[j]
      if (predicate(i, a)) {
        right.append(a)
      } else {
        left.append(a)
      }
      i++
    }
  }
  return [left.result(), right.result()]
}

export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<B>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): readonly [Chunk<A>, Chunk<B>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

export function partition<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<B>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (fa) => partition_(fa, predicate)
}

export function ipartitionMap_<A, B, C>(
  fa: Chunk<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Chunk<B>, Chunk<C>] {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const left     = builder<B>()
  const right    = builder<C>()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      const eab = f(i, array[j])
      E.match_(
        eab,
        (b) => left.append(b),
        (c) => right.append(c)
      )
      i++
    }
  }
  return [left.result(), right.result()]
}

export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (fa: Chunk<A>) => readonly [Chunk<B>, Chunk<C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<A, B, C>(fa: Chunk<A>, f: (a: A) => Either<B, C>): readonly [Chunk<B>, Chunk<C>] {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const left     = builder<B>()
  const right    = builder<C>()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      const eab = f(array[i])
      E.match_(
        eab,
        (b) => left.append(b),
        (c) => right.append(c)
      )
    }
  }
  return [left.result(), right.result()]
}

export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>): (fa: Chunk<A>) => readonly [Chunk<B>, Chunk<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldl_<A, B>(fa: Chunk<A>, b: B, f: (b: B, i: number, a: A) => B): B {
  concrete(fa)
  const iterator = fa.arrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      out = f(out, i, array[i])
      i++
    }
  }
  return out
}

export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: Chunk<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: Chunk<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Chunk<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function ifoldr_<A, B>(fa: Chunk<A>, b: B, f: (a: A, i: number, b: B) => B): B {
  concrete(fa)
  const iterator = fa.reverseArrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  let i          = fa.length - 1
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = array.length - 1; j >= 0; j--) {
      out = f(array[i], i, out)
      i--
    }
  }
  return out
}

export function ifoldr<A, B>(b: B, f: (a: A, i: number, b: B) => B): (fa: Chunk<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

export function foldr_<A, B>(fa: Chunk<A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Chunk<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: Chunk<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => ifoldl_(fa, M.nat, (b, i, a) => M.combine_(b, f(i, a)))
}

export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Chunk<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Chunk<A>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Chunk<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function compact<A>(as: Chunk<O.Option<A>>): Chunk<A> {
  return filterMap_(as, P.identity)
}

export function separate<E, A>(as: Chunk<Either<E, A>>): readonly [Chunk<E>, Chunk<A>] {
  concrete(as)
  const left     = builder<E>()
  const right    = builder<A>()
  const iterator = as.arrayIterator()
  let result: IteratorResult<ArrayLike<Either<E, A>>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    const len   = array.length
    for (let i = 0; i < len; i++) {
      const ea = array[i]
      E.match_(
        ea,
        (e) => left.append(e),
        (a) => right.append(a)
      )
    }
  }
  return [left.result(), right.result()]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Ord
 * -------------------------------------------------------------------------------------------------
 */

export function getOrd<A>(O: P.Ord<A>): P.Ord<Chunk<A>> {
  return P.Ord({
    compare_: (a, b) => {
      concrete(a)
      concrete(b)

      const leftLength  = a.length
      const rightLength = b.length
      const length      = Math.min(leftLength, rightLength)

      const leftIterator                  = a.arrayIterator()
      const rightIterator                 = b.arrayIterator()
      let left: ArrayLike<A> | undefined  = undefined
      let right: ArrayLike<A> | undefined = undefined
      let leftArrayLength                 = 0
      let rightArrayLength                = 0
      let i                               = 0
      let j                               = 0
      let k                               = 0

      let leftNext
      let rightNext

      while (k < length) {
        if (i < leftArrayLength && j < rightArrayLength) {
          const a        = left![i]
          const b        = right![j]
          const ordering = O.compare_(a, b)
          if (ordering === EQ) {
            return ordering
          }
          i++
          j++
          k++
        } else if (i === leftArrayLength && !(leftNext = leftIterator.next()).done) {
          left            = leftNext.value
          leftArrayLength = left.length
          i               = 0
        } else if (j === rightArrayLength && !(rightNext = rightIterator.next()).done) {
          right            = rightNext.value
          rightArrayLength = right.length
          j                = 0
        }
      }
      return N.Ord.compare_(leftLength, rightLength)
    },
    equals_: getEq(O).equals_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const imapA_: P.MapWithIndexAFn_<URI> = (A) => (ta, f) =>
  ifoldl_(ta, A.pure(empty()), (fbs, i, a) => A.crossWith_(fbs, f(i, a), append_))

export const imapA: P.MapWithIndexAFn<URI> = (G) => {
  const itraverseG_ = imapA_(G)
  return (f) => (ta) => itraverseG_(ta, f)
}

export const mapA_: P.MapAFn_<URI> = (G) => {
  const itraverseG_ = imapA_(G)
  return (ta, f) => itraverseG_(ta, (_, a) => f(a))
}

export const mapA: P.MapAFn<URI> = (G) => {
  const traverseG_ = mapA_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<URI> = (G) => {
  const traverseG_ = mapA_(G)
  return (ta) => traverseG_(ta, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unfoldable
 * -------------------------------------------------------------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => O.Option<readonly [A, B]>): Chunk<A> {
  const out = builder<A>()
  let bb    = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    if (O.isSome(mt)) {
      const [a, b] = mt.value
      out.append(a)
      bb = b
    } else {
      return out.result()
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const ifilterMapA_: P.FilterMapWithIndexAFn_<URI> = (A) => {
  const _ = imapA_(A)
  return (wa, f) => pipe(_(wa, f), A.map(compact))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const ifilterMapA: P.FilterMapWithIndexAFn<URI> = (A) => {
  const _ = ifilterMapA_(A)
  return (f) => (wa) => _(wa, f)
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const filterMapA_: P.FilterMapAFn_<URI> = (A) => {
  const _ = ifilterMapA_(A)
  return (wa, f) => _(wa, (_, a) => f(a))
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const filterMapA: P.FilterMapAFn<URI> = (A) => {
  const _ = filterMapA_(A)
  return (f) => (wa) => _(wa, f)
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const ipartitionMapA_: P.PartitionMapWithIndexAFn_<URI> = (A) => {
  const _ = imapA_(A)
  return (wa, f) => pipe(_(wa, f), A.map(separate))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const ipartitionMapA: P.PartitionMapWithIndexAFn<URI> = (A) => {
  const _ = ipartitionMapA_(A)
  return (f) => (wa) => _(wa, f)
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const partitionMapA_: P.PartitionMapAFn_<URI> = (A) => {
  const _ = ipartitionMapA_(A)
  return (wa, f) => _(wa, (_, a) => f(a))
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const partitionMapA: P.PartitionMapAFn<URI> = (A) => {
  const _ = partitionMapA_(A)
  return (f) => (wa) => _(wa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function chop_<A, B>(as: Chunk<A>, f: (as: Chunk<A>) => readonly [B, Chunk<A>]): Chunk<B> {
  const out        = builder<B>()
  let cs: Chunk<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    out.append(b)
    cs = c
  }
  return out.result()
}

export function chop<A, B>(f: (as: Chunk<A>) => readonly [B, Chunk<A>]): (as: Chunk<A>) => Chunk<B> {
  return (as) => chop_(as, f)
}

export function chunksOf_<A>(as: Chunk<A>, n: number): Chunk<Chunk<A>> {
  return chop_(as, splitAt(n))
}

export function chunksOf(n: number): <A>(as: Chunk<A>) => Chunk<Chunk<A>> {
  return chop(splitAt(n))
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 */
export function collectWhile_<A, B>(self: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  concrete(self)

  switch (self._chunkTag) {
    case ChunkTag.Singleton: {
      return O.match_(f(self.value), () => empty(), single)
    }
    case ChunkTag.Arr: {
      const array = self.arrayLike()
      let dest    = empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (O.isSome(rhs)) {
          dest = append_(dest, rhs.value)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhile_(self.materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 *
 * @dataFirst collectWhile_
 */
export function collectWhile<A, B>(f: (a: A) => O.Option<B>): (self: Chunk<A>) => Chunk<B> {
  return (self) => collectWhile_(self, f)
}

export function drop_<A>(as: Chunk<A>, n: number): Chunk<A> {
  concrete(as)
  const len = as.length
  if (len <= 0) {
    return as
  } else if (n >= len) {
    return empty()
  } else {
    switch (as._chunkTag) {
      case ChunkTag.Slice:
        return new Slice(as.chunk, as.offset + n, as.l - n)
      case ChunkTag.Singleton:
        return n > 0 ? empty() : as
      case ChunkTag.Empty:
        return empty()
      default:
        return new Slice(as, n, len - n)
    }
  }
}

export function drop(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => drop_(as, n)
}

export function dropWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  concrete(as)
  switch (as._chunkTag) {
    case ChunkTag.Arr: {
      const arr = as.arrayLike()
      let i     = 0
      while (i < arr.length && predicate(arr[i])) {
        i++
      }
      return drop_(as, i)
    }
    default: {
      const iterator = as.arrayIterator()
      let result: IteratorResult<ArrayLike<A>>
      let cont       = true
      let i          = 0
      while (cont && !(result = iterator.next()).done) {
        const array = result.value
        let j       = 0
        while (cont && j < array.length) {
          if (predicate(array[j])) {
            i++
            j++
          } else {
            cont = false
          }
        }
      }
      return drop_(as, i)
    }
  }
}

export function dropWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => dropWhile_(as, predicate)
}

/**
 * Fills a chunk with the result of applying `f` `n` times
 */
export function fill<A>(n: number, f: (n: number) => A): Chunk<A> {
  if (n <= 0) {
    return empty<A>()
  }
  let builder = empty<A>()
  for (let i = 0; i < n; i++) {
    builder = append_(builder, f(i))
  }
  return builder
}

export function find_<A>(as: Chunk<A>, f: (a: A) => boolean): O.Option<A> {
  concrete(as)
  const iterator = as.arrayIterator()
  let out        = O.none<A>()
  let result: IteratorResult<ArrayLike<A>>
  while (O.isNone(out) && !(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    for (let i = 0; O.isNone(out) && i < length; i++) {
      const a = array[i]
      if (f(a)) {
        out = O.some(a)
      }
    }
  }
  return out
}

export function find<A>(f: (a: A) => boolean): (as: Chunk<A>) => O.Option<A> {
  return (as) => find_(as, f)
}

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlWhile_<A, B>(as: Chunk<A>, b: B, predicate: Predicate<B>, f: (b: B, a: A) => B): B {
  concrete(as)
  const iterator = as.arrayIterator()
  let s          = b
  let cont       = predicate(s)
  let result: IteratorResult<ArrayLike<A>>
  while (cont && !(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; cont && i < array.length; i++) {
      s    = f(s, array[i])
      cont = predicate(s)
    }
  }
  return s
}

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlWhile<A, B>(b: B, predicate: Predicate<B>, f: (b: B, a: A) => B): (as: Chunk<A>) => B {
  return (as) => foldlWhile_(as, b, predicate, f)
}

export function get_<A>(as: Chunk<A>, n: number): O.Option<A> {
  return O.tryCatch(() => unsafeGet_(as, n))
}

export function get(n: number): <A>(as: Chunk<A>) => O.Option<A> {
  return (as) => get_(as, n)
}

export function join_(chunk: Chunk<string>, separator: string): string {
  if (chunk.length === 0) {
    return ''
  }
  return foldl_(unsafeTail(chunk), unsafeGet_(chunk, 0), (b, s) => b + separator + s)
}

export function join(separator: string): (chunk: Chunk<string>) => string {
  return (chunk) => join_(chunk, separator)
}

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function mapAccum_<A, S, B>(as: Chunk<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Chunk<B>, S] {
  concrete(as)
  const iterator = as.arrayIterator()
  const out      = builder<B>()
  let state      = s
  let result
  while (!(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    for (let i = 0; i < length; i++) {
      const a   = array[i]
      const tup = f(state, a)
      out.append(tup[0])
      state = tup[1]
    }
  }
  return P.tuple(out.result(), s)
}

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function mapAccum<A, S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): (as: Chunk<A>) => readonly [Chunk<B>, S] {
  return (as) => mapAccum_(as, s, f)
}

export function reverse<A>(as: Chunk<A>): Iterable<A> {
  concrete(as)
  const arr = as.arrayLike()
  return It.iterable<A>(() => {
    let i = arr.length - 1
    return {
      next: () => {
        if (i >= 0 && i < arr.length) {
          const k = arr[i]
          i--
          return {
            value: k,
            done: false
          }
        } else {
          return {
            value: undefined,
            done: true
          }
        }
      }
    }
  })
}

export function splitAt_<A>(as: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>] {
  return [take_(as, n), drop_(as, n)]
}

export function splitAt(n: number): <A>(as: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (as) => splitAt_(as, n)
}

/**
 * Splits this chunk on the first element that matches this predicate.
 */
export function splitWhere_<A>(self: Chunk<A>, f: (a: A) => boolean): readonly [Chunk<A>, Chunk<A>] {
  concrete(self)
  const iterator = self.arrayIterator()
  let next
  let cont       = true
  let i          = 0

  while (cont && (next = iterator.next()) && !next.done) {
    const array = next.value
    const len   = array.length
    let j       = 0
    while (cont && j < len) {
      const a = array[j]!
      if (f(a)) {
        cont = false
      } else {
        i++
        j++
      }
    }
  }

  return splitAt_(self, i)
}

/**
 * Splits this chunk on the first element that matches this predicate.
 *
 * @dataFirst splitWhere_
 */
export function splitWhere<A>(f: (a: A) => boolean): (self: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (self) => splitWhere_(self, f)
}

export function take_<A>(as: Chunk<A>, n: number): Chunk<A> {
  concrete(as)
  return as.take(n)
}

export function take(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => take_(as, n)
}

export function takeWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  concrete(as)
  switch (as._chunkTag) {
    case ChunkTag.Arr: {
      const arr = as.arrayLike()
      let i     = 0
      while (i < arr.length && predicate(arr[i])) {
        i++
      }
      return take_(as, i)
    }
    default: {
      const iterator = as.arrayIterator()
      let result: IteratorResult<ArrayLike<A>>
      let cont       = true
      let i          = 0
      while (cont && !(result = iterator.next()).done) {
        const array = result.value
        let j       = 0
        while (cont && j < array.length) {
          if (!predicate(array[j])) {
            cont = false
          } else {
            i++
            j++
          }
        }
      }
      return take_(as, i)
    }
  }
}

export function takeWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => takeWhile_(as, predicate)
}

export function unsafeGet_<A>(as: Chunk<A>, n: number): A {
  concrete(as)
  return as.get(n)
}

export function unsafeGet(n: number): <A>(as: Chunk<A>) => A {
  return (as) => unsafeGet_(as, n)
}

/**
 * Returns the first element of this chunk. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `head` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the first element of the chunk.
 */
export function unsafeHead<A>(as: Chunk<A>): A {
  concrete(as)
  return as.get(0)
}

/**
 * Returns every element after the first. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `tail` to explicitly handle the possibility that the chunk is empty
 */
export function unsafeTail<A>(self: Chunk<A>): Chunk<A> {
  concrete(self)
  if (self.length === 0) {
    throw new ArrayIndexOutOfBoundsException(1)
  }

  return drop_(self, 1)
}

export function zipWithIndexOffset_<A>(as: Chunk<A>, offset: number): Chunk<readonly [A, number]> {
  concrete(as)
  const iterator = as.arrayIterator()
  let next: IteratorResult<ArrayLike<A>>
  let i          = offset
  let out        = builder<readonly [A, number]>()
  while (!(next = iterator.next()).done) {
    const array = next.value
    const len   = array.length
    for (let j = 0; i < len; j++, i++) {
      out.append([array[j], i])
    }
  }
  return out.result()
}

export function zipWithIndexOffset(offset: number): <A>(as: Chunk<A>) => Chunk<readonly [A, number]> {
  return (as) => zipWithIndexOffset_(as, offset)
}

export function zipWithIndex<A>(as: Chunk<A>): Chunk<readonly [A, number]> {
  return zipWithIndexOffset_(as, 0)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Align = P.Align<URI>({
  map_,
  alignWith_,
  nil: empty
})

export const alignCombine_ = P.alignCombineF_<URI>(Align)
export const alignCombine  = P.alignCombineF<URI>(Align)
export const padZip_       = P.padZipF_<URI>(Align)
export const padZip        = P.padZipF<URI>(Align)
export const padZipWith_   = P.padZipWithF_<URI>(Align)
export const padZipWith    = P.padZipWithF<URI>(Align)
export const zipAll_       = P.zipAllF_<URI>(Align)
export const zipAll        = P.zipAllF<URI>(Align)

export const Functor = P.Functor<URI>({
  map_
})

export const flap_   = P.flapF_<URI>(Functor)
export const flap    = P.flapF<URI>(Functor)
export const as_     = P.asF_<URI>(Functor)
export const as      = P.asF<URI>(Functor)
export const fcross_ = P.fcrossF_<URI>(Functor)
export const fcross  = P.fcrossF<URI>(Functor)
export const tupled  = P.tupledF<URI>(Functor)

export const FunctorWithIndex = P.FunctorWithIndex<URI>({
  imap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<URI>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure: single,
  unit
})

export const Zip = P.Zip<URI>({
  zip_,
  zipWith_
})

export const Alt = P.Alt<URI>({
  map_,
  alt_
})

export const Alternative = P.Alternative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  alt_,
  nil: empty
})

export const Compactable = HKT.instance<P.Compactable<URI>>({
  compact,
  separate
})

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<URI>({
  imap_,
  ifilter_,
  ifilterMap_,
  ipartition_,
  ipartitionMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_,
  ifoldr_,
  ifoldMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  chain_,
  flatten
})

export const Traversable = P.Traversable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  mapA_
})

export const TraversableWithIndex = P.TraversableWithIndex<URI>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  imapA_
})

export const Witherable = P.Witherable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  filterMapA_,
  partitionMapA_,
  mapA_,
  filterMap_,
  filter_,
  partitionMap_,
  partition_
})

export const WitherableWithIndex = P.WitherableWithIndex<URI>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  ifilterMapA_,
  ipartitionMapA_,
  imapA_,
  ifilterMap_,
  ifilter_,
  ipartitionMap_,
  ipartition_
})

export const Unfoldable = HKT.instance<P.Unfoldable<URI>>({
  unfold
})

/*
 * -------------------------------------------------------------------------------------------------
 * util
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Determines whether at least one element of the Chunk is equal to the given element
 *
 * @category utils
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): (as: Chunk<A>, a: A) => boolean {
  return (as, a) => exists_(as, (el) => E.equals_(el, a))
}

/**
 * Determines whether at least one element of the Chunk is equal to the given element
 *
 * @category utils
 * @since 1.0.0
 */
export function elem<A>(E: Eq<A>): (a: A) => (as: Chunk<A>) => boolean {
  const elemE = elem_(E)
  return (a) => (as) => elemE(as, a)
}

/**
 * Determines whether every element of the Chunk satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function every_<A, B extends A>(as: Chunk<A>, refinement: P.Refinement<A, B>): as is Chunk<B>
export function every_<A>(as: Chunk<A>, predicate: P.Predicate<A>): boolean
export function every_<A>(as: Chunk<A>, predicate: P.Predicate<A>): boolean {
  concrete(as)
  const iterator = as.arrayIterator()
  let every      = true
  let result: IteratorResult<ArrayLike<A>>
  while (every && !(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; every && i < array.length; i++) {
      every = predicate(array[i])
    }
  }
  return every
}

/**
 * Determines whether every element of the Chunk satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function every<A, B extends A>(refinement: P.Refinement<A, B>): (as: Chunk<A>) => as is Chunk<B>
export function every<A>(predicate: P.Predicate<A>): (as: Chunk<A>) => boolean
export function every<A>(predicate: P.Predicate<A>): (as: Chunk<A>) => boolean {
  return (as) => every_(as, predicate)
}

/**
 * Determines whether at least one element of the Chunk satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function exists_<A>(as: Chunk<A>, predicate: P.Predicate<A>): boolean {
  concrete(as)
  const iterator = as.arrayIterator()
  let exists     = false
  let result: IteratorResult<ArrayLike<A>>
  while (!exists && !(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; !exists && i < array.length; i++) {
      exists = predicate(array[i])
    }
  }
  return exists
}

/**
 * Determines whether at least one element of the Chunk satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function exists<A>(predicate: P.Predicate<A>): (as: Chunk<A>) => boolean {
  return (as) => exists_(as, predicate)
}

/**
 * Returns the length of the given chunk
 *
 * @category util
 * @since 1.0.0
 */
export function size<A>(as: Chunk<A>): number {
  concrete(as)
  return as.length
}
