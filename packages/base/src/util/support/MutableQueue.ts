import type { Chunk } from '../../Chunk/core'

import * as C from '../../Chunk/core'
import { DoublyLinkedList } from './DoublyLinkedList'

export interface MutableQueue<A> {
  /**
   * The maximum number of elements that a queue can hold.
   *
   * @note that unbounded queues can still implement this interface
   * with `capacity = MAX_NUMBER`.
   */
  readonly capacity: number
  /**
   * A non-blocking enqueue.
   *
   * @return whether the enqueue was successful or not.
   */
  readonly offer: (a: A) => boolean
  /**
   * A non-blocking enqueue.
   *
   * @return elements that were not enqueued
   */
  readonly offerAll: (a: Iterable<A>) => Chunk<A>
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
  readonly poll: (a: A | undefined) => A | undefined
  /**
   * A non-blocking dequeue.
   *
   * @return an array of up to `n` elements
   */
  readonly pollUpTo: (n: number) => Chunk<A>
  /**
   * @return the current number of elements inside the queue.
   *
   * @note that this method can be non-atomic and return the
   * approximate number in a concurrent setting.
   */
  readonly size: number
  /**
   * @return if the queue is empty
   */
  readonly isEmpty: boolean
  /**
   * @return if the queue is full
   */
  readonly isFull: boolean
}

export class Unbounded<A> implements MutableQueue<A> {
  private queue = new DoublyLinkedList<A>()

  get size() {
    return this.queue.length
  }

  get isEmpty() {
    return this.size === 0
  }

  get isFull() {
    return false
  }

  get capacity() {
    return Number.MAX_SAFE_INTEGER
  }

  offer(a: A) {
    this.queue.add(a)
    return true
  }

  offerAll(as: Iterable<A>): Chunk<A> {
    for (const a of as) {
      this.offer(a)
    }

    return C.empty()
  }

  poll(a: A | undefined) {
    if (this.isEmpty) {
      return a
    }
    return this.queue.shift()
  }

  pollUpTo(n: number): Chunk<A> {
    let result = C.empty<A>()

    for (let count = 0; count < n; count++) {
      const elem = this.poll(undefined)

      if (elem === undefined) {
        break
      }

      result = C.append_(result, elem)
    }

    return result
  }
}

export class Bounded<A> implements MutableQueue<A> {
  private queue = new DoublyLinkedList<A>()
  private n: number

  constructor(n: number) {
    this.n = n
  }

  get size() {
    return this.queue.length
  }

  get isEmpty() {
    return this.size === 0
  }

  get isFull() {
    return this.size === this.capacity
  }

  get capacity() {
    return this.n
  }

  offer(a: A) {
    if (this.isFull) {
      return false
    }
    this.queue.add(a)
    return true
  }

  offerAll(as: Iterable<A>): Chunk<A> {
    const iterator = as[Symbol.iterator]()
    let remainder  = C.empty<A>()
    let offering   = true
    let next

    while (offering && (next = iterator.next()) && !next.done) {
      offering = this.offer(next.value)
    }

    while (next && !next.done) {
      remainder = C.append_(remainder, next.value)
      next      = iterator.next()
    }

    return remainder
  }

  poll(a: A | undefined) {
    if (this.isEmpty) {
      return a
    }
    return this.queue.shift()
  }

  pollUpTo(n: number): Chunk<A> {
    let result  = C.empty<A>()
    const count = 0

    while (count < n) {
      const elem = this.poll(undefined)

      if (elem === undefined) {
        break
      }

      result = C.append_(result, elem)
    }

    return result
  }
}
