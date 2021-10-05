import type { Chunk } from '@principia/base/Chunk'
import type { IO } from '@principia/base/IO'
import type * as Q from '@principia/base/IO/Queue'
import type { Maybe } from '@principia/base/Maybe'
import type { Predicate } from '@principia/base/prelude'

declare global {
  export const Queue: QueueStaticOps
  export interface Queue<RA, RB, EA, EB, A, B> extends Q.Queue<RA, RB, EA, EB, A, B> {}
  export interface UQueue<A> extends Q.Queue<unknown, unknown, never, never, A, A> {}
  export interface Dequeue<A> extends Q.Queue<never, unknown, unknown, never, never, A> {}
  export interface Enqueue<A> extends Q.Queue<unknown, never, never, unknown, A, any> {}
}

interface QueueStaticOps {
  /**
   * @rewriteStatic makeSliding from "@principia/base/IO/Queue"
   */
  makeSliding: typeof Q.makeSliding
  /**
   * @rewriteStatic makeBounded from "@principia/base/IO/Queue"
   */
  makeBounded: typeof Q.makeBounded
  /**
   * @rewriteStatic makeUnbounded from "@principia/base/IO/Queue"
   */
  makeUnbounded: typeof Q.makeUnbounded
  /**
   * @rewriteStatic makeDropping from "@principia/base/IO/Queue"
   */
  makeDropping: typeof Q.makeDropping
}

declare module '@principia/base/Queue' {
  export interface Queue<RA, RB, EA, EB, A, B> {
    /**
     * Waits until the queue is shutdown.
     * The `IO` returned by this method will not resume until the queue has been shutdown.
     * If the queue is already shutdown, the `IO` will resume right away.
     *
     * @rewriteGetter awaitShutdown from "@principia/base/Queue"
     * @trace getter
     */
    awaitShutdown: IO<unknown, never, void>

    /**
     * @rewriteGetter capacity from "@principia/base/Queue"
     * @trace getter
     */
    capacity: number

    /**
     * Transforms elements enqueued into this queue with a pure function.
     *
     * @rewrite contramap_ from "@principia/base/Queue"
     * @trace 0
     */
    contramap<RA, RB, EA, EB, A, B, C>(this: Queue<RA, RB, EA, EB, A, B>, f: (_: C) => A): Queue<RA, RB, EA, EB, C, B>

    /**
     * Transforms elements enqueued into this queue with an effectful function.
     *
     * @rewrite contramapIO_ from "@principia/base/Queue"
     * @trace 0
     */
    contramapIO<RA, RB, EA, EB, A, B, RC, EC, C>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: C) => IO<RC, EC, A>
    ): Queue<RA & RC, RB, EA | EC, EB, C, B>

    /**
     * Like `crossWith`, but tuples the elements instead of applying a function.
     *
     * @rewrite cross_ from "@principia/base/Queue"
     * @trace call
     */
    cross<RA, RB, EA, EB, A, B, RA1, RB1, EA1, EB1, C extends A, D>(
      this: Queue<RA, RB, EA, EB, A, B>,
      that: Queue<RA1, RB1, EA1, EB1, C, D>
    ): Queue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, C, readonly [B, D]>

    /**
     * Like `crossWithIO`, but uses a pure function.
     *
     * @rewrite crossWith_ from "@principia/base/Queue"
     * @trace 1
     */
    crossWith<RA, RB, EA, EB, A, B, RA1, RB1, EA1, EB1, C extends A, D, F>(
      this: Queue<RA, RB, EA, EB, A, B>,
      that: Queue<RA1, RB1, EA1, EB1, C, D>,
      f: (b: B, d: D) => F
    ): Queue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, C, F>

    /**
     * Creates a new queue from this queue and another. Offering to the composite queue
     * will broadcast the elements to both queues; taking from the composite queue
     * will dequeue elements from both queues and apply the function point-wise.
     *
     * Note that using queues with different strategies may result in surprising behavior.
     * For example, a dropping queue and a bounded queue composed together may apply `f`
     * to different elements.
     *
     * @rewrite crossWithIO_ from "@principia/base/Queue"
     * @trace 1
     */
    crossWithIO<RA, RB, EA, EB, A, B, RA1, RB1, EA1, EB1, C extends A, D, R3, E3, F>(
      this: Queue<RA, RB, EA, EB, A, B>,
      that: Queue<RA1, RB1, EA1, EB1, C, D>,
      f: (b: B, d: D) => IO<R3, E3, F>
    ): Queue<RA & RA1, RB & RB1 & R3, EA | EA1, E3 | EB | EB1, C, F>

    /**
     * Transforms elements enqueued into and dequeued from this queue with the
     * specified functions.
     *
     * @rewrite dimap_ from "@principia/base/Queue"
     * @trace 0
     * @trace 1
     */
    dimap<RA, RB, EA, EB, A, B, C, D>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: C) => A,
      g: (_: B) => D
    ): Queue<RA, RB, EA, EB, C, D>

    /**
     * Transforms elements enqueued into and dequeued from this queue with the
     * specified effectual functions.
     *
     * @rewrite dimapIO_ from "@principia/base/Queue"
     * @trace 0
     * @trace 1
     */
    dimapIO<RA, RB, EA, EB, A, B, RC, EC, C, RD, ED, D>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: C) => IO<RC, EC, A>,
      g: (_: B) => IO<RD, ED, D>
    ): Queue<RA & RC, RB & RD, EA | EC, EB | ED, C, D>

    /**
     * Applies a filter to elements enqueued into this queue. Elements that do not
     * pass the filter will be immediately dropped.
     *
     * @rewrite filterInput_ from "@principia/base/Queue"
     * @trace 0
     */
    filterInput<RA, RB, EA, EB, A, B>(
      this: Queue<RA, RB, EA, EB, A, B>,
      predicate: Predicate<A>
    ): Queue<RA, RB, EA, EB, A, B>

    /**
     * Applies an effectful filter to elements enqueued into this queue. Elements that do not
     * pass the filter will be immediately dropped.
     *
     * @rewrite filterInputIO_ from "@principia/base/Queue"
     * @trace 0
     */
    filterInputIO<RA, RB, EA, EB, A, B, R, E>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: A) => IO<R, E, boolean>
    ): Queue<RA & R, RB, EA | E, EB, A, B>

    /**
     * @rewrite filterOutputIO_ from "@principia/base/Queue"
     * @trace 0
     */
    filterOutputIO<RA, RB, EA, EB, A, B, R, E>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: B) => IO<R, E, boolean>
    ): Queue<RA, RB & R, EA, EB | E, A, B>

    /**
     * @rewriteGetter isShutdown from "@principia/base/Queue"
     * @trace getter
     */
    isShutdown: IO<unknown, never, void>

    /**
     * @rewrite map_ from "@principia/base/Queue"
     * @trace 0
     */
    map<RA, RB, EA, EB, A, B, C>(this: Queue<RA, RB, EA, EB, A, B>, f: (_: B) => C): Queue<RA, RB, EA, EB, A, C>

    /**
     * Transforms elements dequeued from this queue with an effectful function.
     *
     * @rewrite mapIO_ from "@principia/base/Queue"
     * @trace 0
     */
    mapIO<RA, RB, EA, EB, A, B, R, E, C>(
      this: Queue<RA, RB, EA, EB, A, B>,
      f: (_: B) => IO<R, E, C>
    ): Queue<RA, RB & R, EA, EB, A, C>

    /**
     * Places one value in the queue.
     *
     * @rewrite offer_ from "@principia/base/Queue"
     * @trace call
     */
    offer<RA, RB, EA, EB, A, B>(this: Queue<RA, RB, EA, EB, A, B>, a: A): IO<RA, EA, boolean>

    /**
     * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
     * If the queue has reached capacity, then
     * the fiber performing the `offerAll` will be suspended until there is room in
     * the queue.
     *
     * For Unbounded Queue:
     * Places all values in the queue and returns true.
     *
     * For Sliding Queue: uses `Sliding` Strategy
     * If there is room in the queue, it places the values otherwise it removes the old elements and
     * enqueues the new ones. Always returns true.
     *
     * For Dropping Queue: uses `Dropping` Strategy,
     * It places the values in the queue but if there is no room it will not enqueue them and return false.
     *
     * @rewrite offerAll_ from "@principia/base/Queue"
     * @trace call
     */
    offerAll<RA, RB, EA, EB, A, B>(this: Queue<RA, RB, EA, EB, A, B>, as: Iterable<A>): IO<RA, EA, boolean>

    /**
     * Take the head Maybe of values in the queue.
     *
     * @rewriteGetter poll from "@principia/base/Queue"
     * @trace getter
     */
    poll: IO<RB, EB, Maybe<B>>

    /**
     * Interrupts any fibers that are suspended on `offer` or `take`.
     * Future calls to `offer*` and `take*` will be interrupted immediately.
     *
     * @rewriteGetter shutdown from "@principia/base/Queue"
     * @trace getter
     */
    shutdown: IO<unknown, never, void>

    /**
     * Retrieves the size of the queue, which is equal to the number of elements
     * in the queue. This may be negative if fibers are suspended waiting for
     * elements to be added to the queue.
     *
     * @rewriteGetter size from "@principia/base/Queue"
     * @trace getter
     */
    size: IO<unknown, never, number>

    /**
     * Removes the oldest value in the queue. If the queue is empty, this will
     * return a computation that resumes when an item has been added to the queue.
     *
     * @rewriteGetter take from "@principia/base/Queue"
     * @trace getter
     */
    take: IO<RB, EB, B>

    /**
     * Removes all the values in the queue and returns the list of the values. If the queue
     * is empty returns empty list.
     *
     * @rewriteGetter takeAll from "@principia/base/Queue"
     * @trace getter
     */
    takeAll: IO<RB, EB, Chunk<B>>

    /**
     * Takes up to max number of values in the queue.
     *
     * @rewrite takeAllUpTo_ from "@principia/base/Queue"
     * @trace call
     */
    takeAllUpTo<RA, RB, EA, EB, A, B>(this: Queue<RA, RB, EA, EB, A, B>, n: number): IO<RB, EB, Chunk<B>>

    /**
     * Takes between min and max number of values from the queue. If there
     * is less than min items available, it'll block until the items are
     * collected.
     *
     * @rewrite takeBetween_ from "@principia/base/Queue"
     * @trace call
     */
    takeBetween<RA, RB, EA, EB, A, B>(this: Queue<RA, RB, EA, EB, A, B>, min: number, max: number): IO<RB, EB, Chunk<B>>
  }
}
