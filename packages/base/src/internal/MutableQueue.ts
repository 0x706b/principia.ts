import type { Conc } from '../collection/immutable/Conc/core'

import * as C from '../collection/immutable/Conc/core'
import { assert } from '../util/assert'

export abstract class MutableQueue<A> {
  /**
   * The maximum number of elements that a queue can hold.
   *
   * @note that unbounded queues can still implement this interface
   * with `capacity = MAX_NUMBER`.
   */
  abstract readonly capacity: number
  /**
   * @return whether the enqueue was successful or not.
   */
  abstract enqueue(a: A): boolean
  /**
   * @return elements that were not enqueued
   */
  enqueueAll(as: Iterable<A>): Conc<A> {
    let out      = C.empty<A>()
    let iterator = as[Symbol.iterator]()
    let result: IteratorResult<A>
    while (!(result = iterator.next()).done) {
      if (!this.enqueue(result.value)) {
        out = C.append_(out, result.value)
        break
      }
    }
    while (!(result = iterator.next()).done) {
      out = C.append_(out, result.value)
    }
    return out
  }
  /**
   * A non-blocking dequeue.
   *
   * @return either an element from the queue, or the `default`
   * param.
   *
   * @note that if there's no meaningful default for your type, you
   * can always use `poll(undefined)`. Not the best, but reasonable price
   * to pay for lower heap churn.
   */
  abstract dequeue(a: A): A
  abstract dequeue(a: A | undefined): A | undefined
  abstract dequeue(a: A | undefined): A | undefined
  /**
   * A non-blocking dequeue.
   *
   * @return an array of up to `n` elements
   */
  dequeueUpTo(n: number): Conc<A> {
    let result = C.empty<A>()
    for (let i = n; i > 0; i--) {
      const a = this.dequeue(undefined)
      if (a === undefined) {
        break
      }
      result = C.append_(result, a)
    }
    return result
  }
  /**
   * @return the current number of elements inside the queue.
   *
   * @note that this method can be non-atomic and return the
   * approximate number in a concurrent setting.
   */
  abstract readonly size: number
  /**
   * @return if the queue is empty
   */
  abstract readonly isEmpty: boolean
  /**
   * @return if the queue is full
   */
  abstract readonly isFull: boolean

  forEach(f: (a: A) => void): void {
    let a: A
    while ((a = this.dequeue(undefined)!) !== undefined) {
      f(a)
    }
  }
}

export class OneElementMutableQueue<A> extends MutableQueue<A> {
  private ref: A | undefined = undefined

  capacity = 1

  get isEmpty() {
    return this.ref === undefined
  }

  get isFull(): boolean {
    return !this.isEmpty
  }

  get size() {
    return this.isEmpty ? 0 : 1
  }

  enqueue(a: A): boolean {
    if (this.isFull) {
      return false
    } else {
      this.ref = a
      return true
    }
  }

  dequeue(a: A): A
  dequeue(a: A | undefined): A | undefined
  dequeue(a: A | undefined): A | undefined {
    if (this.isEmpty) {
      return a
    } else {
      const res = this.ref
      this.ref  = undefined
      return res
    }
  }
}

class Node<A> {
  item: A
  next: Node<A> | null = null
  constructor(item: A) {
    this.item = item
  }
}

export class LinkedQueue<A> extends MutableQueue<A> {
  private head: Node<A>
  private tail: Node<A>
  isFull = false
  size = 0
  capacity = Number.MAX_SAFE_INTEGER
  constructor() {
    super()
    this.head      = new Node<A>(null!)
    this.tail      = new Node<A>(null!)
    this.head.next = this.tail
  }
  get isEmpty() {
    return this.size === 0
  }
  enqueue(a: A): boolean {
    const newNode = new Node(a)
    if (this.size === 0) {
      this.head = newNode
    }
    this.tail.next = newNode
    this.tail      = newNode
    this.size     += 1
    return true
  }
  dequeue(def: A): A
  dequeue(def: A | undefined): A | undefined
  dequeue(def: A | undefined): A | undefined {
    if (this.size === 0) {
      return def
    }
    const elem = this.head.item
    this.head  = this.head.next!
    this.size -= 1
    return elem
  }
}

export abstract class RingBuffer<A> extends MutableQueue<A> {
  constructor(readonly capacity: number) {
    super()
  }
  private buf: Array<any> = new Array(this.capacity)
  private head = 0
  private tail = 0

  abstract posToIdx(pos: number, capacity: number): number

  get size(): number {
    return this.tail - this.head
  }

  get enqueuedCount(): number {
    return this.tail
  }

  get dequeuedCount(): number {
    return this.head
  }

  enqueue(a: A): boolean {
    if (this.tail < this.head + this.capacity) {
      const curIdx     = this.posToIdx(this.tail, this.capacity)
      this.buf[curIdx] = a
      this.tail       += 1
      return true
    } else {
      return false
    }
  }

  dequeue(def: A): A
  dequeue(def: A | undefined): A | undefined
  dequeue(def: A): A {
    if (this.head < this.tail) {
      const curIdx     = this.posToIdx(this.head, this.capacity)
      const deqElement = this.buf[curIdx]
      this.buf[curIdx] = null!
      this.head       += 1
      return deqElement
    } else {
      return def
    }
  }

  get isEmpty(): boolean {
    return this.tail === this.head
  }

  get isFull(): boolean {
    return this.tail === this.head + this.capacity
  }
}

function nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}

export class RingBufferArb<A> extends RingBuffer<A> {
  constructor(readonly capacity: number) {
    super(capacity)
    assert(capacity >= 2, `RingBufferArb created with capacity ${capacity}`)
  }
  posToIdx(pos: number, capacity: number): number {
    return pos % capacity
  }
}

export class RingBufferPow2<A> extends RingBuffer<A> {
  constructor(requestedCapacity: number) {
    super(nextPow2(requestedCapacity))
    assert(requestedCapacity > 0, `RingBufferPow2 created with capacity ${requestedCapacity}`)
  }
  posToIdx(pos: number, capacity: number) {
    return pos & (capacity - 1)
  }
}

export function mkRingBuffer<A>(requestedCapacity: number): RingBuffer<A> {
  assert(requestedCapacity >= 2, `RingBuffer created with capacity ${requestedCapacity}`)
  if (nextPow2(requestedCapacity) === requestedCapacity) {
    return new RingBufferPow2(requestedCapacity)
  } else {
    return new RingBufferArb(requestedCapacity)
  }
}

export function bounded<A>(capacity: number): MutableQueue<A> {
  if (capacity === 1) {
    return new OneElementMutableQueue<A>()
  } else {
    return mkRingBuffer<A>(capacity)
  }
}

export function unbounded<A>(): MutableQueue<A> {
  return new LinkedQueue<A>()
}
