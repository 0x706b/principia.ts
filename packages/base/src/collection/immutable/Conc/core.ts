import type { Byte } from '../../../Byte'
import type { Either } from '../../../Either'
import type { Eq } from '../../../Eq'
import type { Stack } from '../../../internal/Stack'
import type { Predicate } from '../../../Predicate'
import type { These } from '../../../These'

import * as E from '../../../Either'
import { IndexOutOfBoundsError } from '../../../Error'
import { identity, pipe, unsafeCoerce } from '../../../function'
import * as HKT from '../../../HKT'
import { AtomicNumber } from '../../../internal/AtomicNumber'
import { makeStack } from '../../../internal/Stack'
import * as M from '../../../Maybe'
import * as N from '../../../number'
import { EQ } from '../../../Ordering'
import * as P from '../../../prelude'
import * as Equ from '../../../Structural/Equatable'
import * as Ha from '../../../Structural/Hashable'
import * as Th from '../../../These'
import { tuple } from '../../../tuple/core'
import { isByte } from '../../../util/predicates'
import * as It from '../../Iterable/core'
import * as A from '../Array/core'

export interface ConcF extends HKT.HKT {
  readonly type: Conc<this['A']>
  readonly index: number
  readonly variance: {
    A: '+'
  }
}

const BUFFER_SIZE = 64

const UPDATE_BUFFER_SIZE = 256

export const ConcTypeId = Symbol.for('@principia/base/collection/immutable/Conc')
export type ConcTypeId = typeof ConcTypeId

export const ConcTag = {
  Empty: 'Empty',
  Concat: 'Concat',
  AppendN: 'AppendN',
  PrependN: 'PrependN',
  Update: 'Update',
  Slice: 'Slice',
  Singleton: 'Singleton',
  Conc: 'Chunk',
  ByteChunk: 'ByteChunk'
} as const

export abstract class Conc<A> implements Iterable<A>, Ha.Hashable, Equ.Equatable {
  readonly _typeId: ConcTypeId = ConcTypeId
  readonly _A!: () => A
  abstract readonly length: number
  abstract [Symbol.iterator](): Iterator<A>

  get [Ha.$hash](): number {
    return Ha.hashIterator(this[Symbol.iterator]())
  }

  [Equ.$equals](that: unknown): boolean {
    return isConc(that) && corresponds_(this, that, Equ.equals)
  }
}

abstract class ConcImplementation<A> extends Conc<A> implements Iterable<A> {
  abstract readonly length: number
  abstract readonly binary: boolean
  abstract get(n: number): A
  abstract copyToArray(n: number, dest: Array<A> | Uint8Array): void
  abstract readonly left: ConcImplementation<A>
  abstract readonly right: ConcImplementation<A>

  readonly depth: number = 0

  arrayIterator(): Iterator<ArrayLike<A>> {
    return this.materialize().arrayIterator()
  }

  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    return this.materialize().reverseArrayIterator()
  }

  [Symbol.iterator](): Iterator<A> {
    return this.materialize()[Symbol.iterator]()
  }

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    this.materialize().foreach(startIndex, f)
  }

  private arrayLikeCache: ArrayLike<unknown> | undefined

  arrayLike(): ArrayLike<A> {
    if (this.arrayLikeCache) {
      return this.arrayLikeCache as ArrayLike<A>
    }
    const arr = this.binary ? alloc(this.length) : new Array(this.length)
    this.copyToArray(0, arr)
    this.arrayLikeCache = arr
    return arr as ArrayLike<A>
  }

  private arrayCache: Array<unknown> | undefined

  array(): ReadonlyArray<A> {
    if (this.arrayCache) {
      return this.arrayCache as Array<A>
    }
    const arr = new Array(this.length)
    this.copyToArray(0, arr)
    this.arrayCache = arr
    return arr as Array<A>
  }

  concat(that: ConcImplementation<A>): ConcImplementation<A> {
    concrete<A>(this)
    concrete<A>(that)
    if (this._concTag === ConcTag.Empty) {
      return that
    }
    if (that._concTag === ConcTag.Empty) {
      return this
    }
    if (this._concTag === ConcTag.AppendN) {
      const conc = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return this.start.concat(conc).concat(that)
    }
    if (that._concTag === ConcTag.PrependN) {
      const conc = fromArray(A.takeLast_(that.buffer as Array<A>, that.bufferUsed))
      return this.concat(conc).concat(that.end)
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
  take(n: number): ConcImplementation<A> {
    if (n <= 0) {
      return _Empty
    } else if (n >= this.length) {
      return this
    } else {
      concrete<A>(this)
      switch (this._concTag) {
        case ConcTag.Empty:
          return _Empty
        case ConcTag.Slice:
          return n >= this.l ? this : new Slice(this.conc, this.offset, n)
        case ConcTag.Singleton:
          return this
        default:
          return new Slice(this, 0, n)
      }
    }
  }
  append<A1>(a: A1): ConcImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[0]    = a
    return new AppendN<A | A1>(this as ConcImplementation<A | A1>, buffer, 1, this.binary && binary)
  }
  prepend<A1>(a: A1): ConcImplementation<A | A1> {
    const binary            = this.binary && isByte(a)
    const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[BUFFER_SIZE - 1] = a
    return new PrependN<A | A1>(this as ConcImplementation<A | A1>, buffer, 1, this.binary && binary)
  }

  update<A1>(index: number, a1: A1): ConcImplementation<A | A1> {
    if (index < 0 || index >= this.length) {
      throw new IndexOutOfBoundsError(`Conc.update access to ${index}`)
    }
    const binary        = this.binary && isByte(a1)
    const bufferIndices = Array<number>(UPDATE_BUFFER_SIZE)
    const bufferValues  = binary ? alloc(UPDATE_BUFFER_SIZE) : new Array<any>(UPDATE_BUFFER_SIZE)
    bufferIndices[0]    = index
    bufferValues[0]     = a1
    return new Update(this, bufferIndices, bufferValues, 1, new AtomicNumber(1), binary)
  }

  /**
   * Materializes a Conc into a Conc backed by an array. This method can
   * improve the performance of bulk operations.
   */
  materialize(): ConcImplementation<A> {
    concrete(this)
    switch (this._concTag) {
      case ConcTag.Empty:
        return this
      case ConcTag.Conc:
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

class Empty<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Empty

  length = 0
  depth = 0
  left = this
  right = this
  binary = false
  get(_: number): A {
    throw new ArrayIndexOutOfBoundsException(_)
  }
  foreach<B>(_: number, __: (i: number, a: never) => B): void {
    return
  }
  copyToArray(_: number, __: Array<A> | Uint8Array): void {
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

class Concat<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Concat

  length = this.left.length + this.right.length
  depth = 1 + Math.max(this.left.depth, this.right.depth)
  binary = this.left.binary && this.right.binary
  constructor(readonly left: ConcImplementation<A>, readonly right: ConcImplementation<A>) {
    super()
  }
  get(n: number): A {
    return n < this.left.length ? this.left.get(n) : this.right.get(n - this.left.length)
  }
  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    this.left.foreach(startIndex, f)
    this.right.foreach(startIndex + this.left.length, f)
  }
  copyToArray(n: number, dest: Array<A> | Uint8Array): void {
    this.left.copyToArray(n, dest)
    this.right.copyToArray(n + this.left.length, dest)
  }
  [Symbol.iterator](): Iterator<A> {
    return It.concat_(this.left, this.right)[Symbol.iterator]()
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

class AppendN<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.AppendN

  length = this.start.length + this.bufferUsed
  depth = 0
  left = _Empty
  right = _Empty

  constructor(
    readonly start: ConcImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly binary: boolean
  ) {
    super()
  }

  [Symbol.iterator](): Iterator<A> {
    return It.concat_(this.start, It.take_(this.buffer as Array<A>, this.bufferUsed))[Symbol.iterator]()
  }

  append<A1>(a: A1): ConcImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[this.bufferUsed] = a
        return new AppendN<A | A1>(
          this.start as ConcImplementation<A | A1>,
          this.buffer,
          this.bufferUsed + 1,
          this.binary && binary
        )
      }
      this.buffer[this.bufferUsed] = a
      return new AppendN<A | A1>(
        this.start as ConcImplementation<A | A1>,
        this.buffer,
        this.bufferUsed + 1,
        this.binary && binary
      )
    } else {
      const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[0]    = a
      const conc   = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return new AppendN<A | A1>(
        this.start.concat(conc) as ConcImplementation<A | A1>,
        buffer,
        1,
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

  copyToArray(n: number, dest: Array<A> | Uint8Array): void {
    this.start.copyToArray(n, dest)
    copyArray(this.buffer as ArrayLike<A>, 0, dest, this.start.length + n, this.bufferUsed)
  }

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    this.start.foreach(startIndex, f)
    for (let i = 0; i < this.bufferUsed; i++) {
      f(startIndex + this.start.length + i, this.buffer[i] as A)
    }
  }
}

class PrependN<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.PrependN

  length = this.end.length + this.bufferUsed
  left = _Empty
  right = _Empty

  constructor(
    readonly end: ConcImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly binary: boolean
  ) {
    super()
  }

  [Symbol.iterator](): Iterator<A> {
    return It.concat_(It.take_(this.buffer as Array<A>, this.bufferUsed), this.end)[Symbol.iterator]()
  }

  prepend<A1>(a: A1): ConcImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
        return new PrependN<A | A1>(
          this.end as ConcImplementation<A | A1>,
          buffer,
          this.bufferUsed + 1,
          this.binary && binary
        )
      }
      this.buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
      return new PrependN<A | A1>(
        this.end as ConcImplementation<A | A1>,
        this.buffer,
        this.bufferUsed + 1,
        this.binary && binary
      )
    } else {
      const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[BUFFER_SIZE - 1] = a
      const conc              = fromArray(
        'subarray' in this.buffer
          ? this.buffer.subarray(this.buffer.length - this.bufferUsed)
          : this.buffer.slice(this.buffer.length - this.bufferUsed)
      ) as ConcImplementation<A>
      return new PrependN<A | A1>(conc.concat(this.end) as ConcImplementation<A | A1>, buffer, 1, this.binary && binary)
    }
  }

  get(n: number): A {
    return n < this.bufferUsed
      ? (this.buffer[BUFFER_SIZE - this.bufferUsed + n] as A)
      : this.end.get(n - this.bufferUsed)
  }

  copyToArray(n: number, dest: Array<A> | Uint8Array) {
    const length = Math.min(this.bufferUsed, Math.max(dest.length - n, 0))
    copyArray(this.buffer, BUFFER_SIZE - this.bufferUsed, dest, n, length)
    this.end.copyToArray(n + length, dest)
  }

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    for (let i = BUFFER_SIZE - this.bufferUsed, j = 0; i < BUFFER_SIZE; i++, j++) {
      f(startIndex + j, this.buffer[i] as A)
    }
    this.end.foreach(startIndex + this.bufferUsed, f)
  }
}

class Update<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Update

  length = this.conc.length
  left = _Empty
  right = _Empty

  constructor(
    readonly conc: ConcImplementation<A>,
    readonly bufferIndices: Array<number>,
    readonly bufferValues: Array<any> | Uint8Array,
    readonly used: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
  }

  get(n: number): A {
    let a: A = null!
    for (let j = this.used; j >= 0; j--) {
      if (this.bufferIndices[j] === n) {
        a = this.bufferValues[j]
        break
      }
    }
    return a !== null ? a : this.conc.get(n)
  }

  update<A1>(i: number, a: A1): ConcImplementation<A | A1> {
    if (i < 0 || i >= this.length) {
      throw new IndexOutOfBoundsError(`Conc.update access to ${i}`)
    }
    const binary = this.binary && isByte(a)
    if (this.used < UPDATE_BUFFER_SIZE && this.chain.compareAndSet(this.used, this.used + 1)) {
      if (this.binary && !binary) {
        const buffer = new Array(UPDATE_BUFFER_SIZE)
        for (let j = 0; j < UPDATE_BUFFER_SIZE; j++) {
          buffer[j] = this.bufferValues[j]
        }
        this.bufferIndices[this.used] = i
        buffer[this.used]             = a
        return new Update(this.conc, this.bufferIndices, buffer, this.used + 1, this.chain, this.binary && binary)
      }
      this.bufferIndices[this.used] = i
      this.bufferValues[this.used]  = a
      return new Update(
        this.conc,
        this.bufferIndices,
        this.bufferValues,
        this.used + 1,
        this.chain,
        this.binary && binary
      )
    } else {
      const bufferIndices = Array<number>(UPDATE_BUFFER_SIZE)
      const bufferValues  = this.binary && binary ? alloc(UPDATE_BUFFER_SIZE) : Array<any>(UPDATE_BUFFER_SIZE)
      bufferIndices[0]    = i
      bufferValues[0]     = a
      const array         = toArray(this.conc)
      return new Update(fromArray(array), bufferIndices, bufferValues, 1, new AtomicNumber(1), this.binary && binary)
    }
  }

  copyToArray(n: number, dest: Array<A>): void {
    this.conc.copyToArray(n, dest)
    for (let i = 0; i < this.used; i++) {
      const index = this.bufferIndices[i]
      const value = this.bufferValues[i]
      dest[index] = value
    }
  }
}

class Singleton<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Singleton

  length = 1
  depth = 0
  left = _Empty
  right = _Empty
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

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    f(startIndex, this.value)
  }

  copyToArray(n: number, dest: Array<A> | Uint8Array) {
    dest[n] = this.value
  }

  [Symbol.iterator] = It.singleton(this.value)[Symbol.iterator]

  arrayIterator = It.singleton([this.value])[Symbol.iterator]

  reverseArrayIterator = this.arrayIterator
}

class Slice<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Slice

  length = this.l
  depth = 0
  left = _Empty
  right = _Empty
  binary = this.conc.binary

  constructor(readonly conc: ConcImplementation<A>, readonly offset: number, readonly l: number) {
    super()
  }

  get(n: number): A {
    return this.conc.get(this.offset + n)
  }

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    let i = 0
    while (i < this.length) {
      f(startIndex + i, this.get(i))
      i++
    }
  }

  copyToArray(n: number, dest: Array<A> | Uint8Array) {
    let i = 0
    let j = n
    while (i < this.length) {
      dest[j] = this.get(i)
      i++
      j++
    }
  }
}

class Chunk<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.Conc

  length = this._array.length
  depth = 0
  left = _Empty
  right = _Empty
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

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(startIndex + i, this._array[i])
    }
  }

  copyToArray(n: number, dest: Array<A> | Uint8Array): void {
    copyArray(this._array, 0, dest, n, this.length)
  }

  [Symbol.iterator](): Iterator<A> {
    return this._array[Symbol.iterator]()
  }

  arrayIterator = It.singleton(this._array)[Symbol.iterator]

  reverseArrayIterator = this.arrayIterator
}

class ByteChunk<A> extends ConcImplementation<A> {
  readonly _concTag = ConcTag.ByteChunk

  length = this._array.length
  depth = 0
  left = _Empty
  right = _Empty
  binary = true

  constructor(readonly _array: Uint8Array) {
    super()
  }

  get(n: number): A {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return unsafeCoerce(this._array[n])
  }

  foreach<B>(startIndex: number, f: (i: number, a: A) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(startIndex + i, unsafeCoerce(this._array[i]))
    }
  }

  [Symbol.iterator](): Iterator<A> {
    return unsafeCoerce(this._array[Symbol.iterator]())
  }

  copyToArray(n: number, dest: Array<A> | Uint8Array): void {
    copyArray(this._array, 0, unsafeCoerce(dest), n, this.length)
  }

  arrayIterator(): Iterator<Array<A>> {
    return unsafeCoerce(It.singleton(this._array)[Symbol.iterator]())
  }

  reverseArrayIterator(): Iterator<Array<A>> {
    return unsafeCoerce(this.arrayIterator())
  }
}

/**
 * @optimize remove
 */
export function concrete<A>(
  _: Conc<A>
): asserts _ is Empty<A> | Singleton<A> | Concat<A> | AppendN<A> | PrependN<A> | Slice<A> | Chunk<A> | ByteChunk<A> {
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
    dest[destPos + i - sourcePos] = source[i]
  }
}

function fromArray<A>(array: ArrayLike<A>): ConcImplementation<A> {
  if (array.length === 0) {
    return _Empty
  } else {
    return 'buffer' in array ? (new ByteChunk(array as any) as any) : new Chunk(Array.from(array))
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export class ConcBuilder<A> {
  constructor(private conc: Conc<A>) {}
  append(a: A): ConcBuilder<A> {
    this.conc = append_(this.conc, a)
    return this
  }
  result(): Conc<A> {
    return this.conc
  }
}

export function builder<A>(): ConcBuilder<A> {
  return new ConcBuilder(empty())
}

export function empty<B>(): Conc<B> {
  return new Empty()
}

export function from<A>(as: Iterable<A>): Conc<A> {
  return new Chunk(A.from(as))
}

export function fromBuffer(bytes: Uint8Array): Conc<Byte> {
  return new ByteChunk(bytes as any)
}

export function make<A>(...as: ReadonlyArray<A>): Conc<A> {
  return new Chunk(as)
}

export function range(start: number, end: number): Conc<number> {
  return fromArray(A.range(start, end))
}

export function replicate<A>(n: number, a: A): Conc<A> {
  return fill(n, () => a)
}

export function single<A>(a: A): Conc<A> {
  return new Singleton(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * predicates
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(conc: Conc<A>): boolean {
  concrete(conc)
  return conc.length === 0
}

export function isNonEmpty<A>(conc: Conc<A>): boolean {
  return !isEmpty(conc)
}

export function isConc<A>(u: Iterable<A>): u is Conc<A>
export function isConc(u: unknown): u is Conc<unknown>
export function isConc(u: unknown): u is Conc<unknown> {
  return P.isObject(u) && '_typeId' in u && u['_typeId'] === ConcTypeId
}

/*
 * -------------------------------------------------------------------------------------------------
 * Equatable
 * -------------------------------------------------------------------------------------------------
 */

export function corresponds_<A, B>(as: Conc<A>, bs: Conc<B>, f: (a: A, b: B) => boolean): boolean {
  if (as.length !== bs.length) {
    return false
  }

  concrete(as)
  concrete(bs)

  const leftIterator  = as.arrayIterator()
  const rightIterator = bs.arrayIterator()

  let left: ArrayLike<A> | undefined  = undefined
  let right: ArrayLike<B> | undefined = undefined
  let leftLength  = 0
  let rightLength = 0
  let i           = 0
  let j           = 0
  let equal       = true
  let done        = false

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

/**
 * @dataFirst corresponds_
 */
export function corresponds<A, B>(bs: Conc<B>, f: (a: A, b: B) => boolean): (as: Conc<A>) => boolean {
  return (as) => corresponds_(as, bs, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function head<A>(conc: Conc<A>): M.Maybe<A> {
  concrete(conc)
  if (isEmpty(conc)) {
    return M.nothing()
  }
  return M.just(conc.get(0))
}

export function init<A>(conc: Conc<A>): M.Maybe<Conc<A>> {
  if (isEmpty(conc)) {
    return M.nothing()
  }
  return M.just(take_(conc, conc.length - 1))
}

export function last<A>(conc: Conc<A>): M.Maybe<A> {
  concrete(conc)
  if (isEmpty(conc)) {
    return M.nothing()
  }
  return M.just(conc.get(conc.length - 1))
}

export function tail<A>(conc: Conc<A>): M.Maybe<Conc<A>> {
  concrete(conc)
  if (isEmpty(conc)) {
    return M.nothing()
  }
  return M.just(drop_(conc, 1))
}

export function toArray<A>(conc: Conc<A>): ReadonlyArray<A> {
  concrete(conc)
  return conc.array()
}

export function toArrayLike<A>(conc: Conc<A>): ArrayLike<A> {
  concrete(conc)
  return conc.arrayLike()
}

export function toBuffer(conc: Conc<Byte>): Uint8Array {
  return unsafeCoerce(toArrayLike(conc))
}

/*
 * -------------------------------------------------------------------------------------------------
 * ops
 * -------------------------------------------------------------------------------------------------
 */

export function append_<A, A1>(as: Conc<A>, a: A1): Conc<A | A1> {
  concrete(as)
  return as.append(a)
}

/**
 * @dataFirst append_
 */
export function append<A>(a: A): (as: Conc<A>) => Conc<A> {
  return (as) => append_(as, a)
}

export function concat_<A, B>(xs: Conc<A>, ys: Conc<B>): Conc<A | B> {
  concrete(xs)
  concrete(ys)
  return (xs as ConcImplementation<A | B>).concat(ys)
}

/**
 * @dataFirst concat_
 */
export function concat<A>(ys: Conc<A>): (xs: Conc<A>) => Conc<A> {
  return (xs) => concat_(xs, ys)
}

export function iforEach_<A, B>(as: Conc<A>, f: (i: number, a: A) => B): void {
  concrete(as)
  as.foreach(0, f)
}

/**
 * @dataFirst iforEach_
 */
export function iforEach<A, B>(f: (i: number, a: A) => B): (as: Conc<A>) => void {
  return (as) => iforEach_(as, f)
}

export function forEach_<A, B>(as: Conc<A>, f: (a: A) => B): void {
  concrete(as)
  return as.foreach(0, (_, a) => f(a))
}

/**
 * @dataFirst forEach_
 */
export function forEach<A, B>(f: (a: A) => B): (as: Conc<A>) => void {
  return (as) => forEach_(as, f)
}

export function prepend_<A>(as: Conc<A>, a: A): Conc<A> {
  concrete(as)
  return as.prepend(a)
}

/**
 * @dataFirst prepend_
 */
export function prepend<A>(a: A): (conc: Conc<A>) => Conc<A> {
  return (conc) => prepend_(conc, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<A, B, C>(fa: Conc<A>, fb: Conc<B>, f: (_: These<A, B>) => C): Conc<C> {
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

/**
 * @dataFirst alignWith_
 */
export function alignWith<A, B, C>(fb: Conc<B>, f: (_: These<A, B>) => C): (fa: Conc<A>) => Conc<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: Conc<A>, fb: Conc<B>): Conc<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

/**
 * @dataFirst align_
 */
export function align<B>(fb: Conc<B>): <A>(fa: Conc<A>) => Conc<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure = single

export function unit(): Conc<void> {
  return single(undefined)
}
/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<A, B>(fab: Conc<(a: A) => B>, fa: Conc<A>): Conc<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst ap_
 */
export function ap<A>(fa: Conc<A>): <B>(fab: Conc<(a: A) => B>) => Conc<B> {
  return (fab) => ap_(fab, fa)
}

export function cross_<A, B>(fa: Conc<A>, fb: Conc<B>): Conc<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
export function cross<B>(bs: Conc<B>): <A>(as: Conc<A>) => Conc<readonly [A, B]> {
  return (as) => cross_(as, bs)
}

export function crossWith_<A, B, C>(fa: Conc<A>, fb: Conc<B>, f: (a: A, b: B) => C): Conc<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Conc<B>, f: (a: A, b: B) => C): (fa: Conc<A>) => Conc<C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Conc<A>> {
  return P.Eq((xs, ys) => corresponds_(xs, ys, E.equals_))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

function mapArrayLike<A, B>(as: ArrayLike<A>, len: number, startIndex: number, f: (i: number, a: A) => B): Conc<B> {
  let bs = empty<B>()
  for (let i = 0; i < len; i++) {
    bs = append_(bs, f(i + startIndex, as[i]))
  }
  return bs
}

function mapArrayLikeReverse<A, B>(
  as: ArrayLike<A>,
  len: number,
  endIndex: number,
  f: (i: number, a: A) => B
): Conc<B> {
  let bs = empty<B>()
  for (let i = BUFFER_SIZE - len, j = len - 1; i < BUFFER_SIZE; i++, j--) {
    bs = append_(bs, f(endIndex - j, as[i]))
  }
  return bs
}

class DoneFrame {
  readonly _tag = 'Done'
}

class ConcatLeftFrame<A> {
  readonly _tag = 'ConcatLeft'

  constructor(readonly conc: Concat<A>, readonly currentIndex: number) {}
}

class ConcatRightFrame<B> {
  readonly _tag = 'ConcatRight'
  constructor(readonly leftResult: Conc<B>) {}
}

class AppendFrame<A> {
  readonly _tag = 'Append'
  constructor(readonly buffer: ArrayLike<A>, readonly bufferUsed: number, readonly startIndex: number) {}
}

class PrependFrame<A, B> {
  readonly _tag = 'Prepend'
  constructor(readonly pre: Conc<B>, readonly end: Conc<A>) {}
}

type Frame<A, B> = DoneFrame | ConcatLeftFrame<A> | ConcatRightFrame<B> | AppendFrame<A> | PrependFrame<A, B>

export function imap_<A, B>(fa: Conc<A>, f: (i: number, a: A) => B): Conc<B> {
  let current = fa

  let index = 0

  let stack: Stack<Frame<A, B>> = makeStack(new DoneFrame())

  let result: Conc<B> = empty()

  recursion: while (stack) {
    // eslint-disable-next-line no-constant-condition
    pushing: while (true) {
      concrete<A>(current)
      switch (current._concTag) {
        case ConcTag.Singleton: {
          result = new Singleton(f(index++, current.value))
          break pushing
        }
        case ConcTag.Empty: {
          result = _Empty
          break pushing
        }
        case ConcTag.Conc: {
          result = new Chunk(A.imap_(current._array, (i, a) => f(i + index, a)))
          index += current.length
          break pushing
        }
        case ConcTag.Concat: {
          stack   = makeStack(new ConcatLeftFrame(current, index), stack)
          current = current.left
          continue pushing
        }
        case ConcTag.AppendN: {
          stack   = makeStack(new AppendFrame(current.buffer as ArrayLike<A>, current.bufferUsed, index), stack)
          current = current.start
          continue pushing
        }
        case ConcTag.PrependN: {
          stack = makeStack(
            new PrependFrame(
              mapArrayLikeReverse(
                current.buffer as ArrayLike<A>,
                current.bufferUsed,
                index + current.bufferUsed - 1,
                f
              ),
              current.end
            ),
            stack
          )
          index += current.bufferUsed
          break pushing
        }
        case ConcTag.Slice: {
          let r = empty<B>()
          for (let i = 0; i < current.length; i++) {
            r = append_(r, f(i + index, unsafeGet_(current, i)))
          }
          result = r
          index += current.length
          break pushing
        }
      }
    }
    // eslint-disable-next-line no-constant-condition
    popping: while (true) {
      const top = stack.value
      stack     = stack.previous!
      switch (top._tag) {
        case 'Done': {
          return result
        }
        case 'ConcatLeft': {
          current = top.conc.right
          stack   = makeStack(new ConcatRightFrame(result), stack)
          continue recursion
        }
        case 'ConcatRight': {
          result = concat_(top.leftResult, result)
          continue popping
        }
        case 'Append': {
          result = concat_(result, mapArrayLike(top.buffer, top.bufferUsed, index, f))
          continue popping
        }
        case 'Prepend': {
          current = top.end
          stack   = makeStack(new ConcatRightFrame(top.pre), stack)
          continue recursion
        }
      }
    }
  }
  throw new Error('bug')
}

/**
 * @dataFirst imap_
 */
export function imap<A, B>(f: (i: number, a: A) => B): (fa: Conc<A>) => Conc<B> {
  return (fa) => imap_(fa, f)
}

export function map_<A, B>(fa: Conc<A>, f: (a: A) => B): Conc<B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Conc<A>) => Conc<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Conc<A>, f: (a: A) => Conc<B>): Conc<B> {
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

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Conc<B>): (ma: Conc<A>) => Conc<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: Conc<Conc<A>>): Conc<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<A>(fa: Conc<A>, that: () => Conc<A>): Conc<A> {
  return concat_(fa, that())
}

/**
 * @dataFirst alt_
 */
export function alt<A>(that: () => Conc<A>): (fa: Conc<A>) => Conc<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Zip
 * -------------------------------------------------------------------------------------------------
 */

export function zipWith_<A, B, C>(fa: Conc<A>, fb: Conc<B>, f: (a: A, b: B) => C): Conc<C> {
  concrete(fa)
  concrete(fb)
  const length = Math.min(fa.length, fb.length)
  if (length === 0) {
    return empty()
  } else {
    const leftIterator  = fa.arrayIterator()
    const rightIterator = fb.arrayIterator()
    const out           = builder<C>()
    let left: IteratorResult<ArrayLike<A>>  = null as any
    let right: IteratorResult<ArrayLike<B>> = null as any
    let leftLength  = 0
    let rightLength = 0
    let i           = 0
    let j           = 0
    let k           = 0
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

/**
 * @dataFirst zipWith_
 */
export function zipWith<A, B, C>(fb: Conc<B>, f: (a: A, b: B) => C): (fa: Conc<A>) => Conc<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zip_<A, B>(fa: Conc<A>, fb: Conc<B>): Conc<readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

/**
 * @dataFirst zip_
 */
export function zip<B>(fb: Conc<B>): <A>(fa: Conc<A>) => Conc<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function ifilter_<A, B extends A>(fa: Conc<A>, refinement: P.RefinementWithIndex<number, A, B>): Conc<B>
export function ifilter_<A>(fa: Conc<A>, predicate: P.PredicateWithIndex<number, A>): Conc<A>
export function ifilter_<A>(fa: Conc<A>, predicate: P.PredicateWithIndex<number, A>): Conc<A> {
  concrete(fa)
  switch (fa._concTag) {
    case ConcTag.Empty: {
      return _Empty
    }
    case ConcTag.Conc: {
      const arr   = fa.arrayLike()
      let builder = empty<A>()
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]
        if (predicate(i, a)) {
          builder = append_(builder, a)
        }
      }
      return builder
    }
    case ConcTag.Singleton: {
      if (predicate(0, fa.value)) {
        return fa
      }
      return _Empty
    }
    default: {
      const iterator = fa.arrayIterator()
      let out        = empty<A>()
      let result: IteratorResult<ArrayLike<A>>
      let i          = 0
      while (!(result = iterator.next()).done) {
        const array = result.value
        for (let j = 0; j < array.length; j++) {
          const a = array[j]
          if (predicate(i, a)) {
            out = append_(out, a)
          }
          i++
        }
      }
      return out
    }
  }
}

/**
 * @dataFirst ifilter_
 */
export function ifilter<A, B extends A>(refinement: P.RefinementWithIndex<number, A, B>): (fa: Conc<A>) => Conc<B>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Conc<A>) => Conc<A>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Conc<A>) => Conc<A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<A, B extends A>(fa: Conc<A>, refinement: P.Refinement<A, B>): Conc<B>
export function filter_<A>(fa: Conc<A>, predicate: P.Predicate<A>): Conc<A>
export function filter_<A>(fa: Conc<A>, predicate: P.Predicate<A>): Conc<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

/**
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Conc<A>) => Conc<B>
export function filter<A>(predicate: P.Predicate<A>): (fa: Conc<A>) => Conc<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Conc<A>) => Conc<A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<A, B>(fa: Conc<A>, f: (i: number, a: A) => M.Maybe<B>): Conc<B> {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const out      = builder<B>()
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      const ob = f(i, array[j])
      if (M.isJust(ob)) {
        out.append(ob.value)
      }
      i++
    }
  }
  return out.result()
}

/**
 * @dataFirst ifilterMap_
 */
export function ifilterMap<A, B>(f: (i: number, a: A) => M.Maybe<B>): (fa: Conc<A>) => Conc<B> {
  return (self) => ifilterMap_(self, f)
}

export function filterMap_<A, B>(fa: Conc<A>, f: (a: A) => M.Maybe<B>): Conc<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => M.Maybe<B>): (fa: Conc<A>) => Conc<B> {
  return (fa) => filterMap_(fa, f)
}

export function ipartition_<A, B extends A>(
  fa: Conc<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [Conc<A>, Conc<B>]
export function ipartition_<A>(fa: Conc<A>, predicate: P.PredicateWithIndex<number, A>): readonly [Conc<A>, Conc<A>]
export function ipartition_<A>(fa: Conc<A>, predicate: P.PredicateWithIndex<number, A>): readonly [Conc<A>, Conc<A>] {
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

/**
 * @dataFirst ipartition_
 */
export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Conc<A>) => readonly [Conc<A>, Conc<B>]
export function ipartition<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Conc<A>) => readonly [Conc<A>, Conc<A>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Conc<A>) => readonly [Conc<A>, Conc<A>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<A, B extends A>(fa: Conc<A>, refinement: P.Refinement<A, B>): readonly [Conc<A>, Conc<B>]
export function partition_<A>(fa: Conc<A>, predicate: P.Predicate<A>): readonly [Conc<A>, Conc<A>]
export function partition_<A>(fa: Conc<A>, predicate: P.Predicate<A>): readonly [Conc<A>, Conc<A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

/**
 * @dataFirst partition_
 */
export function partition<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Conc<A>) => readonly [Conc<A>, Conc<B>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Conc<A>) => readonly [Conc<A>, Conc<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Conc<A>) => readonly [Conc<A>, Conc<A>] {
  return (fa) => partition_(fa, predicate)
}

export function ipartitionMap_<A, B, C>(
  fa: Conc<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Conc<B>, Conc<C>] {
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

/**
 * @dataFirst ipartitionMap_
 */
export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (fa: Conc<A>) => readonly [Conc<B>, Conc<C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<A, B, C>(fa: Conc<A>, f: (a: A) => Either<B, C>): readonly [Conc<B>, Conc<C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>): (fa: Conc<A>) => readonly [Conc<B>, Conc<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldl_<A, B>(fa: Conc<A>, b: B, f: (i: number, b: B, a: A) => B): B {
  concrete(fa)
  const iterator = fa.arrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  let i          = 0
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = 0; j < array.length; j++) {
      out = f(i, out, array[i])
      i++
    }
  }
  return out
}

/**
 * @dataFirst ifoldl_
 */
export function ifoldl<A, B>(b: B, f: (i: number, b: B, a: A) => B): (fa: Conc<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: Conc<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (_, b, a) => f(b, a))
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Conc<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function ifoldr_<A, B>(fa: Conc<A>, b: B, f: (i: number, a: A, b: B) => B): B {
  concrete(fa)
  const iterator = fa.reverseArrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  let i          = fa.length - 1
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let j = array.length - 1; j >= 0; j--) {
      out = f(i, array[i], out)
      i--
    }
  }
  return out
}

/**
 * @dataFirst ifoldr_
 */
export function ifoldr<A, B>(b: B, f: (i: number, a: A, b: B) => B): (fa: Conc<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

export function foldr_<A, B>(fa: Conc<A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (_, a, b) => f(a, b))
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Conc<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: Conc<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => ifoldl_(fa, M.nat, (i, b, a) => M.combine_(b, f(i, a)))
}

/**
 * @dataFirst ifoldMap_
 */
export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Conc<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Conc<A>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Conc<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function compact<A>(as: Conc<M.Maybe<A>>): Conc<A> {
  return filterMap_(as, identity)
}

export function separate<E, A>(as: Conc<Either<E, A>>): readonly [Conc<E>, Conc<A>] {
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

export function getOrd<A>(O: P.Ord<A>): P.Ord<Conc<A>> {
  return P.Ord({
    compare_: (xs, ys) => {
      concrete(xs)
      concrete(ys)

      const leftLength  = xs.length
      const rightLength = ys.length
      const length      = Math.min(leftLength, rightLength)

      const leftIterator                  = xs.arrayIterator()
      const rightIterator                 = ys.arrayIterator()
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
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRecDepthFirst_<A, B>(a: A, f: (a: A) => Conc<Either<A, B>>): Conc<B> {
  let buffer = f(a)
  let out    = empty<B>()

  while (buffer.length > 0) {
    const e = unsafeHead(buffer)
    buffer  = unsafeTail(buffer)
    if (e._tag === 'Left') {
      buffer = concat_(f(e.left), buffer)
    } else {
      out = append_(out, e.right)
    }
  }

  return out
}

/**
 * @dataFirst chainRecDepthFirst_
 */
export function chainRecDepthFirst<A, B>(f: (a: A) => Conc<Either<A, B>>): (a: A) => Conc<B> {
  return (a) => chainRecDepthFirst_(a, f)
}

export function chainRecBreadthFirst_<A, B>(a: A, f: (a: A) => Conc<Either<A, B>>): Conc<B> {
  const initial = f(a)
  let buffer    = empty<Either<A, B>>()
  let out       = empty<B>()

  function go(e: Either<A, B>): void {
    if (e._tag === 'Left') {
      forEach_(f(e.left), (ab) => ((buffer = append_(buffer, ab)), undefined))
    } else {
      out = append_(out, e.right)
    }
  }

  for (const e of initial) {
    go(e)
  }

  while (buffer.length > 0) {
    const ab = unsafeHead(buffer)
    buffer   = unsafeTail(buffer)
    go(ab)
  }

  return out
}

/**
 * @dataFirst chainRecBreadthFirst_
 */
export function chainRecBreadthFirst<A, B>(f: (a: A) => Conc<Either<A, B>>): (a: A) => Conc<B> {
  return (a) => chainRecBreadthFirst_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const itraverse_: P.TraverseIndexFn_<ConcF> = P.implementTraverseWithIndex_<ConcF>()(
  () => (A) => (ta, f) => ifoldl_(ta, A.pure(empty()), (i, fbs, a) => A.crossWith_(fbs, f(i, a), append_))
)

/**
 * @dataFirst itraverse_
 */
export const itraverse: P.MapWithIndexAFn<ConcF> = (G) => {
  const itraverseG_ = itraverse_(G)
  return (f) => (ta) => itraverseG_(ta, f)
}

export const traverse_: P.TraverseFn_<ConcF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (ta, f) => itraverseA_(ta, (_, a) => f(a))
}

/**
 * @dataFirst traverse_
 */
export const traverse: P.TraverseFn<ConcF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (ta) => itraverseA_(ta, (_, a) => f(a))
}

export const sequence: P.SequenceFn<ConcF> = (G) => {
  const traverseG_ = traverse_(G)
  return (ta) => traverseG_(ta, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unfoldable
 * -------------------------------------------------------------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => M.Maybe<readonly [A, B]>): Conc<A> {
  const out = builder<A>()
  let bb    = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    if (M.isJust(mt)) {
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
export const iwither_: P.WitherWithIndexFn_<ConcF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (wa, f) => pipe(itraverseA_(wa, f), A.map(compact))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 *
 * @dataFirst iwither_
 */
export const iwither: P.WitherWithIndexFn<ConcF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (f) => (wa) => iwitherA_(wa, f)
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const wither_: P.WitherFn_<ConcF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (wa, f) => iwitherA_(wa, (_, a) => f(a))
}

/**
 * @category Witherable
 * @since 1.0.0
 *
 * @dataFirst wither_
 */
export const wither: P.WitherFn<ConcF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (f) => (wa) => iwitherA_(wa, (_, a) => f(a))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const iwilt_: P.WiltWithIndexFn_<ConcF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (wa, f) => pipe(itraverseA_(wa, f), A.map(separate))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 *
 * @dataFirst iwilt_
 */
export const iwilt: P.WiltWithIndexFn<ConcF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (f) => (wa) => iwiltA_(wa, f)
}

/**
 * @category Witherable
 * @since 1.0.0
 */
export const wilt_: P.WiltFn_<ConcF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (wa, f) => iwiltA_(wa, (_, a) => f(a))
}

/**
 * @category Witherable
 * @since 1.0.0
 *
 * @dataFirst wilt_
 */
export const wilt: P.WiltFn<ConcF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (f) => (wa) => iwiltA_(wa, (_, a) => f(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function chop_<A, B>(as: Conc<A>, f: (as: Conc<A>) => readonly [B, Conc<A>]): Conc<B> {
  const out       = builder<B>()
  let cs: Conc<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    out.append(b)
    cs = c
  }
  return out.result()
}

/**
 * @dataFirst chop_
 */
export function chop<A, B>(f: (as: Conc<A>) => readonly [B, Conc<A>]): (as: Conc<A>) => Conc<B> {
  return (as) => chop_(as, f)
}

export function chunksOf_<A>(as: Conc<A>, n: number): Conc<Conc<A>> {
  return chop_(as, splitAt(n))
}

/**
 * @dataFirst chunksOf_
 */
export function chunksOf(n: number): <A>(as: Conc<A>) => Conc<Conc<A>> {
  return chop(splitAt(n))
}

/**
 * Transforms all elements of the Conc for as long as the specified partial function is defined.
 */
export function collectWhile_<A, B>(as: Conc<A>, f: (a: A) => M.Maybe<B>): Conc<B> {
  concrete(as)

  switch (as._concTag) {
    case ConcTag.Singleton: {
      return M.match_(f(as.value), () => empty(), single)
    }
    case ConcTag.Conc: {
      const array = as.arrayLike()
      let dest    = empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (M.isJust(rhs)) {
          dest = append_(dest, rhs.value)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhile_(as.materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the Conc for as long as the specified partial function is defined.
 *
 * @dataFirst collectWhile_
 */
export function collectWhile<A, B>(f: (a: A) => M.Maybe<B>): (as: Conc<A>) => Conc<B> {
  return (as) => collectWhile_(as, f)
}

export function drop_<A>(as: Conc<A>, n: number): Conc<A> {
  concrete(as)
  const len = as.length
  if (len <= 0) {
    return as
  } else if (n >= len) {
    return empty()
  } else {
    switch (as._concTag) {
      case ConcTag.Slice:
        return new Slice(as.conc, as.offset + n, as.l - n)
      case ConcTag.Singleton:
        return n > 0 ? empty() : as
      case ConcTag.Empty:
        return empty()
      default:
        return new Slice(as, n, len - n)
    }
  }
}

/**
 * @dataFirst drop_
 */
export function drop(n: number): <A>(as: Conc<A>) => Conc<A> {
  return (as) => drop_(as, n)
}

export function dropWhile_<A>(as: Conc<A>, predicate: Predicate<A>): Conc<A> {
  concrete(as)
  switch (as._concTag) {
    case ConcTag.Conc: {
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

/**
 * @dataFirst dropWhile_
 */
export function dropWhile<A>(predicate: Predicate<A>): (as: Conc<A>) => Conc<A> {
  return (as) => dropWhile_(as, predicate)
}

/**
 * Fills a Conc with the result of applying `f` `n` times
 */
export function fill<A>(n: number, f: (n: number) => A): Conc<A> {
  if (n <= 0) {
    return empty<A>()
  }
  let builder = empty<A>()
  for (let i = 0; i < n; i++) {
    builder = append_(builder, f(i))
  }
  return builder
}

export function find_<A>(as: Conc<A>, f: (a: A) => boolean): M.Maybe<A> {
  concrete(as)
  const iterator = as.arrayIterator()
  let out        = M.nothing<A>()
  let result: IteratorResult<ArrayLike<A>>
  while (M.isNothing(out) && !(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    for (let i = 0; M.isNothing(out) && i < length; i++) {
      const a = array[i]
      if (f(a)) {
        out = M.just(a)
      }
    }
  }
  return out
}

/**
 * @dataFirst find_
 */
export function find<A>(f: (a: A) => boolean): (as: Conc<A>) => M.Maybe<A> {
  return (as) => find_(as, f)
}

/**
 * Folds over the elements in this Conc from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlWhile_<A, B>(as: Conc<A>, b: B, predicate: Predicate<B>, f: (b: B, a: A) => B): B {
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
 * Folds over the elements in this Conc from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst foldlWhile_
 */
export function foldlWhile<A, B>(b: B, predicate: Predicate<B>, f: (b: B, a: A) => B): (as: Conc<A>) => B {
  return (as) => foldlWhile_(as, b, predicate, f)
}

export function get_<A>(as: Conc<A>, n: number): M.Maybe<A> {
  return M.tryCatch(() => unsafeGet_(as, n))
}

/**
 * @dataFirst get_
 */
export function get(n: number): <A>(as: Conc<A>) => M.Maybe<A> {
  return (as) => get_(as, n)
}

export function join_(strings: Conc<string>, separator: string): string {
  if (strings.length === 0) {
    return ''
  }
  return foldl_(unsafeTail(strings), unsafeGet_(strings, 0), (b, s) => b + separator + s)
}

/**
 * @dataFirst join_
 */
export function join(separator: string): (strings: Conc<string>) => string {
  return (strings) => join_(strings, separator)
}

/**
 * Statefully maps over the Conc, producing new elements of type `B`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function mapAccum_<A, S, B>(as: Conc<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Conc<B>, S] {
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
  return tuple(out.result(), s)
}

/**
 * Statefully maps over the Conc, producing new elements of type `B`.
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst mapAccum_
 */
export function mapAccum<A, S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): (as: Conc<A>) => readonly [Conc<B>, S] {
  return (as) => mapAccum_(as, s, f)
}

export function reverse<A>(as: Conc<A>): Iterable<A> {
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

export function splitAt_<A>(as: Conc<A>, n: number): readonly [Conc<A>, Conc<A>] {
  return [take_(as, n), drop_(as, n)]
}

/**
 * @dataFirst splitAt_
 */
export function splitAt(n: number): <A>(as: Conc<A>) => readonly [Conc<A>, Conc<A>] {
  return (as) => splitAt_(as, n)
}

/**
 * Splits this Conc on the first element that matches this predicate.
 */
export function splitWhere_<A>(as: Conc<A>, f: (a: A) => boolean): readonly [Conc<A>, Conc<A>] {
  concrete(as)
  const iterator = as.arrayIterator()
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

  return splitAt_(as, i)
}

/**
 * Splits this Conc on the first element that matches this predicate.
 *
 * @dataFirst splitWhere_
 */
export function splitWhere<A>(f: (a: A) => boolean): (as: Conc<A>) => readonly [Conc<A>, Conc<A>] {
  return (as) => splitWhere_(as, f)
}

export function take_<A>(as: Conc<A>, n: number): Conc<A> {
  concrete(as)
  return as.take(n)
}

/**
 * @dataFirst take_
 */
export function take(n: number): <A>(as: Conc<A>) => Conc<A> {
  return (as) => take_(as, n)
}

export function takeWhile_<A>(as: Conc<A>, predicate: Predicate<A>): Conc<A> {
  concrete(as)
  switch (as._concTag) {
    case ConcTag.Conc: {
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

/**
 * @dataFirst takeWhile_
 */
export function takeWhile<A>(predicate: Predicate<A>): (as: Conc<A>) => Conc<A> {
  return (as) => takeWhile_(as, predicate)
}

export function unsafeGet_<A>(as: Conc<A>, n: number): A {
  concrete(as)
  return as.get(n)
}

/**
 * @dataFirst unsafeGet_
 */
export function unsafeGet(n: number): <A>(as: Conc<A>) => A {
  return (as) => unsafeGet_(as, n)
}

/**
 * Returns the first element of this Conc. Note that this method is partial
 * in that it will throw an exception if the Conc is empty. Consider using
 * `head` to explicitly handle the possibility that the Conc is empty
 * or iterating over the elements of the Conc in lower level, performance
 * sensitive code unless you really only need the first element of the Conc.
 */
export function unsafeHead<A>(as: Conc<A>): A {
  concrete(as)
  return as.get(0)
}

/**
 * Returns every element after the first. Note that this method is partial
 * in that it will throw an exception if the Conc is empty. Consider using
 * `tail` to explicitly handle the possibility that the Conc is empty
 */
export function unsafeTail<A>(as: Conc<A>): Conc<A> {
  concrete(as)
  if (as.length === 0) {
    throw new ArrayIndexOutOfBoundsException(1)
  }

  return drop_(as, 1)
}

export function unsafeUpdateAt_<A, A1>(as: Conc<A>, i: number, a: A1): Conc<A | A1> {
  concrete(as)
  return as.update(i, a)
}

export function unsafeUpdateAt<A1>(i: number, a: A1): <A>(as: Conc<A>) => Conc<A | A1> {
  return (as) => unsafeUpdateAt_(as, i, a)
}

export function updateAt_<A, A1>(as: Conc<A>, i: number, a: A1): M.Maybe<Conc<A | A1>> {
  try {
    return M.just(unsafeUpdateAt_(as, i, a))
  } catch {
    return M.nothing()
  }
}

export function updateAt<A1>(i: number, a: A1): <A>(as: Conc<A>) => M.Maybe<Conc<A | A1>> {
  return (as) => updateAt_(as, i, a)
}

export function zipWithIndexOffset_<A>(as: Conc<A>, offset: number): Conc<readonly [A, number]> {
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

/**
 * @dataFirst zipWithIndexOffset_
 */
export function zipWithIndexOffset(offset: number): <A>(as: Conc<A>) => Conc<readonly [A, number]> {
  return (as) => zipWithIndexOffset_(as, offset)
}

export function zipWithIndex<A>(as: Conc<A>): Conc<readonly [A, number]> {
  return zipWithIndexOffset_(as, 0)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Align = P.Align<ConcF>({
  map_,
  alignWith_,
  nil: empty
})

export const alignCombine_ = P.alignCombineF_<ConcF>({ map_, align_, alignWith_ })
/**
 * @dataFirst alignCombine_
 */
export const alignCombine = P.alignCombineF<ConcF>({ map_, align_, alignWith_ })

export const padZip_ = P.padZipF_<ConcF>({ map_, align_, alignWith_ })
/**
 * @dataFirst padZip_
 */
export const padZip = P.padZipF<ConcF>({ map_, align_, alignWith_ })

export const padZipWith_ = P.padZipWithF_<ConcF>({ map_, align_, alignWith_ })
/**
 * @dataFirst padZipWith_
 */
export const padZipWith = P.padZipWithF<ConcF>({ map_, align_, alignWith_ })

export const zipAll_ = P.zipAllF_<ConcF>({ map_, align_, alignWith_ })
/**
 * @dataFirst zipAll_
 */
export const zipAll = P.zipAllF<ConcF>({ map_, align_, alignWith_ })

export const Functor = P.Functor<ConcF>({
  map_
})

export const flap_ = P.flapF_<ConcF>({ map_ })
/**
 * @dataFirst flap_
 */
export const flap = P.flapF<ConcF>({ map_ })

export const as_ = P.asF_<ConcF>({ map_ })
/**
 * @dataFirst as_
 */
export const as = P.asF<ConcF>({ map_ })

export const fcross_ = P.fcrossF_<ConcF>({ map_ })
/**
 * @dataFirst fcross_
 */
export const fcross = P.fcrossF<ConcF>({ map_ })

export const tupled = P.tupledF<ConcF>({ map_ })

export const FunctorWithIndex = P.FunctorWithIndex<ConcF>({
  imap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<ConcF>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<ConcF>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<ConcF>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<ConcF>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure: single,
  unit
})

export const Zip = P.Zip<ConcF>({
  zip_,
  zipWith_
})

export const Alt = P.Alt<ConcF>({
  map_,
  alt_
})

export const Alternative = P.Alternative<ConcF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  alt_,
  nil: empty
})

export const Compactable = HKT.instance<P.Compactable<ConcF>>({
  compact,
  separate
})

export const Filterable = P.Filterable<ConcF>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<ConcF>({
  imap_,
  ifilter_,
  ifilterMap_,
  ipartition_,
  ipartitionMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<ConcF>({
  ifoldl_,
  ifoldr_,
  ifoldMap_
})

export const Foldable = P.Foldable<ConcF>({
  foldl_,
  foldr_,
  foldMap_
})

export const Monad = P.Monad<ConcF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  chain_,
  flatten
})

export const Traversable = P.Traversable<ConcF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export const TraversableWithIndex = P.TraversableWithIndex<ConcF>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  itraverse_
})

export const Witherable = P.Witherable<ConcF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  wither_,
  wilt_,
  traverse_,
  filterMap_,
  filter_,
  partitionMap_,
  partition_
})

export const WitherableWithIndex = P.WitherableWithIndex<ConcF>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  iwither_,
  iwilt_,
  itraverse_,
  ifilterMap_,
  ifilter_,
  ipartitionMap_,
  ipartition_
})

export const Unfoldable = HKT.instance<P.Unfoldable<ConcF>>({
  unfold
})

/*
 * -------------------------------------------------------------------------------------------------
 * util
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Determines whether at least one element of the Conc is equal to the given element
 *
 * @category utils
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): (as: Conc<A>, a: A) => boolean {
  return (as, a) => exists_(as, (el) => E.equals_(el, a))
}

/**
 * Determines whether at least one element of the Conc is equal to the given element
 *
 * @category utils
 * @since 1.0.0
 *
 * @dataFirst elem_
 */
export function elem<A>(E: Eq<A>): (a: A) => (as: Conc<A>) => boolean {
  const elemE = elem_(E)
  return (a) => (as) => elemE(as, a)
}

/**
 * Determines whether every element of the Conc satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function every_<A, B extends A>(as: Conc<A>, refinement: P.Refinement<A, B>): as is Conc<B>
export function every_<A>(as: Conc<A>, predicate: P.Predicate<A>): boolean
export function every_<A>(as: Conc<A>, predicate: P.Predicate<A>): boolean {
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
 * Determines whether every element of the Conc satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 *
 * @dataFirst every_
 */
export function every<A, B extends A>(refinement: P.Refinement<A, B>): (as: Conc<A>) => as is Conc<B>
export function every<A>(predicate: P.Predicate<A>): (as: Conc<A>) => boolean
export function every<A>(predicate: P.Predicate<A>): (as: Conc<A>) => boolean {
  return (as) => every_(as, predicate)
}

/**
 * Determines whether at least one element of the Conc satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function exists_<A>(as: Conc<A>, predicate: P.Predicate<A>): boolean {
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
 * Determines whether at least one element of the Conc satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 *
 * @dataFirst exists_
 */
export function exists<A>(predicate: P.Predicate<A>): (as: Conc<A>) => boolean {
  return (as) => exists_(as, predicate)
}

/**
 * Returns the length of the given Conc
 *
 * @category util
 * @since 1.0.0
 */
export function size<A>(as: Conc<A>): number {
  concrete(as)
  return as.length
}
