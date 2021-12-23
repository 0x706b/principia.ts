import type * as Ch from '@principia/base/Channel'
import type * as C from '@principia/base/Chunk'
import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type { Hub, HubDequeue, UHub } from '@principia/base/Hub'
import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type * as Ex from '@principia/base/IO/Exit'
import type { Layer } from '@principia/base/Layer'
import type * as M from '@principia/base/Managed'
import type * as O from '@principia/base/Maybe'
import type * as P from '@principia/base/prelude'
import type { Erase } from '@principia/base/prelude'
import type { Dequeue, Queue, UQueue } from '@principia/base/Queue'
import type { Schedule } from '@principia/base/Schedule'
import type { Sink } from '@principia/base/Sink'
import type * as S from '@principia/base/Stream'
import type { GroupBy } from '@principia/base/Stream/core'
import type { Take } from '@principia/base/Stream/Take'

import * as E from '@principia/base/Either'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Stream: StreamStaticOps
  export interface Stream<R, E, A> extends S.Stream<R, E, A> {}
  export interface UStream<A> extends S.Stream<unknown, never, A> {}
  export interface FStream<E, A> extends S.Stream<unknown, E, A> {}
  export interface URStream<R, A> extends S.Stream<R, never, A> {}
}

interface StreamStaticOps {
  /**
   * @rewriteStatic ask from "@principia/base/Stream"
   */
  ask: typeof S.ask
  /**
   * @rewriteStatic asks from "@principia/base/Stream"
   */
  asks: typeof S.asks
  /**
   * @rewriteStatic asksIO from "@principia/base/Stream"
   */
  asksIO: typeof S.asksIO
  /**
   * @rewriteStatic asksStream from "@principia/base/Stream"
   */
  asksStream: typeof S.asksStream
  /**
   * @rewriteStatic async from "@principia/base/Stream"
   */
  async: typeof S.async
  /**
   * @rewriteStatic asyncIO from "@principia/base/Stream"
   */
  asyncIO: typeof S.asyncIO
  /**
   * @rewriteStatic asyncInterrupt from "@principia/base/Stream"
   */
  asyncInterrupt: typeof S.asyncInterrupt
  /**
   * @rewriteStatic asyncMaybe from "@principia/base/Stream"
   */
  asyncMaybe: typeof S.asyncMaybe
  /**
   * @rewriteStatic fail from "@principia/base/Stream"
   */
  fail: typeof S.fail
  /**
   * @rewriteStatic failCause from "@principia/base/Stream"
   */
  failCause: typeof S.failCause
  /**
   * @rewriteStatic failCauseLazy from "@principia/base/Stream"
   */
  failCauseLazy: typeof S.failCauseLazy
  /**
   * @rewriteStatic failLazy from "@principia/base/Stream"
   */
  failLazy: typeof S.failLazy
  /**
   * @rewriteStatic fromAsyncIterable from "@principia/base/Stream"
   */
  fromAsyncIterable: typeof S.fromAsyncIterable
  /**
   * @rewriteStatic fromChunk from "@principia/base/Stream"
   */
  fromChunk: typeof S.fromChunk
  /**
   * @rewriteStatic fromChunkLazy from "@principia/base/Stream"
   */
  fromChunkLazy: typeof S.fromChunkLazy
  /**
   * @rewriteStatic fromHub from "@principia/base/Stream"
   */
  fromHub: typeof S.fromHub
  /**
   * @rewriteStatic fromIO from "@principia/base/Stream"
   */
  fromIO: typeof S.fromIO
  /**
   * @rewriteStatic fromIOMaybe from "@principia/base/Stream"
   */
  fromIOMaybe: typeof S.fromIOMaybe
  /**
   * @rewriteStatic fromIterable from "@principia/base/Stream"
   */
  fromIterable: typeof S.fromIterable
  /**
   * @rewriteStatic fromManaged from "@principia/base/Stream"
   */
  fromManaged: typeof S.fromManaged
  /**
   * @rewriteStatic fromQueue from "@principia/base/Stream"
   */
  fromQueue: typeof S.fromQueue_
  /**
   * @rewriteStatic fromQueueWithShutdown from "@principia/base/Stream"
   */
  fromQueueWithShutdown: typeof S.fromQueueWithShutdown_
  /**
   * @rewriteStatic halt from "@principia/base/Stream"
   */
  halt: typeof S.halt
  /**
   * @rewriteStatic haltLazy from "@principia/base/Stream"
   */
  haltLazy: typeof S.haltLazy
  /**
   * @rewriteStatic repeatIO from "@principia/base/Stream"
   */
  repeatIO: typeof S.repeatIO
  /**
   * @rewriteStatic repeatIOChunk from "@principia/base/Stream"
   */
  repeatIOChunk: typeof S.repeatIOChunk
  /**
   * @rewriteStatic repeatIOChunkMaybe from "@principia/base/Stream"
   */
  repeatIOChunkMaybe: typeof S.repeatIOChunkMaybe
  /**
   * @rewriteStatic repeatIOMaybe from "@principia/base/Stream"
   */
  repeatIOMaybe: typeof S.repeatIOMaybe
  /**
   * @rewriteStatic repeatIOWith from "@principia/base/Stream"
   */
  repeatIOWith: typeof S.repeatIOWith
  /**
   * @rewriteStatic repeatValue from "@principia/base/Stream"
   */
  repeatValue: typeof S.repeatValue
  /**
   * @rewriteStatic repeatValueWith from "@principia/base/Stream"
   */
  repeatValueWith: typeof S.repeatValueWith
  /**
   * @rewriteStatic succeed from "@principia/base/Stream"
   */
  succeed: typeof S.succeed
  /**
   * @rewriteStatic succeedLazy from "@principia/base/Stream"
   */
  succeedLazy: typeof S.succeedLazy
  /**
   * @rewriteStatic unfoldChunkIO from "@principia/base/Stream"
   */
  unfoldChunkIO: typeof S.unfoldChunkIO
  /**
   * @rewriteStatic unfoldIO from "@principia/base/Stream"
   */
  unfoldIO: typeof S.unfoldIO
}

declare module '@principia/base/Stream/core' {
  export interface Stream<R, E, A> {
    /**
     * @rewrite aggregateAsync_ from "@principia/base/Stream"
     */
    aggregateAsync<R, E, A extends A1, R1, E1, A1, B>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, A1, B>
    ): Stream<R & R1 & Has<Clock>, E | E1, B>
    /**
     * @rewrite aggregateAsyncWithin_ from "@principia/base/Stream"
     */
    aggregateAsyncWithin<R, E, A extends A1, R1, E1, A1, B, R2, C>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, A1, B>,
      schedule: Schedule<R2, Maybe<B>, C>
    ): Stream<R & R1 & R2 & Has<Clock>, E | E1, B>
    /**
     * @rewrite aggregateAsyncWithinEither_ from "@principia/base/Stream"
     */
    aggregateAsyncWithinEither<R, E, A extends A1, R1, E1, A1, B, R2, C>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, A1, B>,
      schedule: Schedule<R2, Maybe<B>, C>
    ): Stream<R & R1 & R2 & Has<Clock>, E | E1, E.Either<C, B>>
    /**
     * @rewrite apFirst_ from "@principia/base/Stream"
     */
    apFirst<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A>
    /**
     * @rewrite apSecond_ from "@principia/base/Stream"
     */
    apSecond<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite as_ from "@principia/base/Stream"
     */
    as<R, E, A, B>(this: Stream<R, E, A>, b: B): Stream<R, E, B>
    /**
     * @rewrite bimap_ from "@principia/base/Stream"
     */
    bimap<R, E, A, E1, A1>(this: Stream<R, E, A>, f: (e: E) => E1, g: (a: A) => A1): Stream<R, E1, A1>
    /**
     * @rewrite broadcast_ from "@principia/base/Stream"
     */
    broadcast<R, E, A>(
      this: Stream<R, E, A>,
      n: number,
      maximumLag: number
    ): M.Managed<R, never, C.Chunk<Stream<unknown, E, A>>>
    /**
     * @rewrite broadcastDynamic_ from "@principia/base/Stream"
     */
    broadcastDynamic<R, E, A>(this: Stream<R, E, A>, maximumLag: number): M.Managed<R, never, Stream<unknown, E, A>>
    /**
     * @rewrite broadcastQueues_ from "@principia/base/Stream"
     */
    broadcastedQueues<R, E, A>(
      this: Stream<R, E, A>,
      n: number,
      maximumLag: number
    ): M.Managed<R, never, C.Chunk<HubDequeue<unknown, never, Take<E, A>>>>
    /**
     * @rewrite broadcastQueuesDynamic_ from "@principia/base/Stream"
     */
    broadcastedQueuesDynamic<R, E, A>(
      this: Stream<R, E, A>,
      maximumLag: number
    ): M.Managed<R, never, M.Managed<unknown, never, HubDequeue<unknown, never, Take<E, A>>>>
    /**
     * @rewrite buffer_ from "@principia/base/Stream"
     */
    buffer<R, E, A>(this: Stream<R, E, A>, capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunks_ from "@principia/base/Stream"
     */
    bufferChunks<R, E, A>(this: Stream<R, E, A>, capacty: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunksDropping_ from "@principia/base/Stream"
     */
    bufferChunksDropping<R, E, A>(this: Stream<R, E, A>, capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunksSliding_ from "@principia/base/Stream"
     */
    bufferChunksSliding<R, E, A>(this: Stream<R, E, A>, capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferDropping_ from "@principia/base/Stream"
     */
    bufferDropping<R, E, A>(this: Stream<R, E, A>, capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferSliding_ from "@principia/base/Stream"
     */
    bufferSliding<R, E, A>(this: Stream<R, E, A>, capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferUnbounded_ from "@principia/base/Stream"
     */
    bufferUnbounded: Stream<R, E, A>
    /**
     * @rewrite catchAll_ from "@principia/base/Stream"
     */
    catchAll<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, f: (e: E) => Stream<R1, E1, A1>): Stream<R & R1, E1, A1 | A>
    /**
     * @rewrite catchAllCause_ from "@principia/base/Stream"
     */
    catchAllCause<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      f: (cause: Cause<E>) => Stream<R1, E1, A1>
    ): Stream<R & R1, E1, A1 | A>
    /**
     * @rewrite catchJust_ from "@principia/base/Stream"
     */
    catchJust<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      pf: (e: E) => O.Maybe<Stream<R1, E1, A1>>
    ): Stream<R & R1, E | E1, A1 | A>
    /**
     * @rewrite catchJustCause_ from "@principia/base/Stream"
     */
    catchJustCause<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      pf: (e: Cause<E>) => O.Maybe<Stream<R1, E1, A1>>
    ): Stream<R & R1, E | E1, A1 | A>
    /**
     * @rewrite chain_ from "@principia/base/Stream"
     */
    chain<R, E, A, R1, E1, B>(this: Stream<R, E, A>, f: (a: A) => Stream<R1, E1, B>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite changesWith_ from "@principia/base/Stream"
     */
    changesWith<R, E, A>(this: Stream<R, E, A>, f: (x: A, y: A) => boolean): Stream<R, E, A>
    /**
     * @rewrite chunkN_ from "@principia/base/Stream"
     */
    chunkN<R, E, A>(this: Stream<R, E, A>, n: number): Stream<R, E, A>
    /**
     * @rewriteGetter chunks from "@principia/base/Stream"
     */
    chunks: Stream<R, E, C.Chunk<A>>
    /**
     * @rewrite collect_ from "@principia/base/Stream"
     */
    collect<R, E, A, B>(this: Stream<R, E, A>, f: (a: A) => O.Maybe<B>): Stream<R, E, B>
    /**
     * @rewrite collectIO_ from "@principia/base/Stream"
     */
    collectIO<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      pf: (a: A) => O.Maybe<I.IO<R1, E1, A1>>
    ): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite collectJust from "@principia/base/Stream"
     */
    collectJust<R, E, A>(this: Stream<R, E, O.Maybe<A>>): Stream<R, E, A>
    /**
     * @rewrite collectLeft from "@principia/base/Stream"
     */
    collectLeft<R, E, L1, A>(this: Stream<R, E, E.Either<L1, A>>): Stream<R, E, L1>
    /**
     * @rewrite collectRight from "@principia/base/Stream"
     */
    collectRight<R, E, A, R1>(this: Stream<R, E, E.Either<A, R1>>): Stream<R, E, R1>
    /**
     * @rewrite collectSuccess from "@principia/base/Stream"
     */
    collectSuccess<R, E, A, L1>(this: Stream<R, E, Ex.Exit<L1, A>>): Stream<R, E, A>
    /**
     * @rewrite collectWhile_ from "@principia/base/Stream"
     */
    collectWhile<R, E, A, A1>(this: Stream<R, E, A>, pf: (a: A) => O.Maybe<A1>): Stream<R, E, A1>
    /**
     * @rewrite collectWhileIO_ from "@principia/base/Stream"
     */
    collectWhileIO<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      pf: (a: A) => O.Maybe<I.IO<R1, E1, A1>>
    ): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite collectWhileJust from "@principia/base/Stream"
     */
    collectWhileJust<R, E, A>(this: Stream<R, E, O.Maybe<A>>): Stream<R, E, A>
    /**
     * @rewrite collectWhileLeft from "@principia/base/Stream"
     */
    collectWhileLeft<R, E, A1, L1>(this: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, L1>
    /**
     * @rewrite collectWhileRight from "@principia/base/Stream"
     */
    collectWhileRight<R, E, A1, L1>(this: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, A1>
    /**
     * @rewrite collectWhileSuccess from "@principia/base/Stream"
     */
    collectWhileSuccess<R, E, A1, L1>(this: Stream<R, E, Ex.Exit<L1, A1>>): Stream<R, E, A1>
    /**
     * @rewrite combine_ from "@principia/base/Stream"
     */
    combine<R, E, A, R1, E1, A1, S, R2, A2>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, A1>,
      s: S,
      f: (
        s: S,
        eff1: I.IO<R, O.Maybe<E>, A>,
        eff2: I.IO<R1, O.Maybe<E1>, A1>
      ) => I.IO<R2, never, Ex.Exit<O.Maybe<E | E1>, readonly [A2, S]>>
    ): Stream<R & R1 & R2, E | E1, A2>
    /**
     * @rewrite combineChunks_ from "@principia/base/Stream"
     */
    combineChunks<R, E, A, R1, E1, A1, S, R2, A2>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, A1>,
      s: S,
      f: (
        s: S,
        l: I.IO<R, O.Maybe<E>, C.Chunk<A>>,
        r: I.IO<R1, O.Maybe<E1>, C.Chunk<A1>>
      ) => I.IO<R2, never, Ex.Exit<O.Maybe<E | E1>, readonly [C.Chunk<A2>, S]>>
    ): Stream<R1 & R & R2, E | E1, A2>
    /**
     * @rewrite concat_ from "@principia/base/Stream"
     */
    concat<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A1 | A>
    /**
     * @rewrite cross_ from "@principia/base/Stream"
     */
    cross<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, A1>
    ): Stream<R & R1, E1 | E, readonly [A, A1]>
    /**
     * @rewrite crossWith_ from "@principia/base/Stream"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Stream<R & R1, E | E1, C>
    /**
     * @rewrite debounce_ from "@principia/base/Stream"
     */
    debounce<R, E, A>(this: Stream<R, E, A>, duration: number): Stream<R & Has<Clock>, E, A>
    /**
     * @rewrite distributedWith_ from "@principia/base/Stream"
     */
    distributedWith<R, E, A>(
      this: Stream<R, E, A>,
      n: number,
      maximumLag: number,
      decide: (_: A) => I.UIO<(_: number) => boolean>
    ): M.Managed<R, never, C.Chunk<Dequeue<Ex.Exit<O.Maybe<E>, A>>>>
    /**
     * @rewrite distributedWithDynamic_ from "@principia/base/Stream"
     */
    distributedWithDynamic<R, E, A>(
      this: Stream<R, E, A>,
      maximumLag: number,
      decide: (_: A) => I.UIO<(_: symbol) => boolean>,
      done?: (_: Ex.Exit<O.Maybe<E>, never>) => I.UIO<any>
    ): M.Managed<R, never, I.UIO<readonly [symbol, Dequeue<Ex.Exit<O.Maybe<E>, A>>]>>
    /**
     * @rewrite drop_ from "@principia/base/Stream"
     */
    drop<R, E, A>(this: Stream<R, E, A>, n: number): Stream<R, E, A>
    /**
     * @rewrite dropUntil_ from "@principia/base/Stream"
     */
    dropUntil<R, E, A>(this: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite dropWhile_ from "@principia/base/Stream"
     */
    dropWhile<R, E, A>(this: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewriteGetter either from "@principia/base/Stream"
     */
    either: Stream<R, never, E.Either<E, A>>
    /**
     * @rewrite endWhen_ from "@principia/base/Stream"
     */
    endWhen<R, E, A, R1, E1>(this: Stream<R, E, A>, io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite ensuring_ from "@principia/base/Stream"
     */
    ensuring<R, E, A, R1>(this: Stream<R, E, A>, fin: I.IO<R1, never, any>): Stream<R & R1, E, A>
    /**
     * @rewrite filter_ from "@principia/base/Stream"
     */
    filter<R, E, A, B extends A>(this: Stream<R, E, A>, refinement: P.Refinement<A, B>): Stream<R, E, B>
    /**
     * @rewrite filter_ from "@principia/base/Stream"
     */
    filter<R, E, A>(this: Stream<R, E, A>, predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite filterIO_ from "@principia/base/Stream"
     */
    filterIO<R, E, A, R1, E1>(this: Stream<R, E, A>, f: (a: A) => I.IO<R1, E1, boolean>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite filterMap_ from "@principia/base/Stream"
     */
    filterMap<R, E, A, B>(this: Stream<R, E, A>, f: (a: A) => O.Maybe<B>): Stream<R, E, B>
    /**
     * @rewrite filterMapIO_ from "@principia/base/Stream"
     */
    filterMapIO<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, O.Maybe<B>>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite find_ from "@principia/base/Stream"
     */
    find(f: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite findIO_ from "@principia/base/Stream"
     */
    findIO<R, E, A, R1, E1>(this: Stream<R, E, A>, f: (a: A) => I.IO<R1, E1, boolean>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite flattenChunks from "@principia/base/Stream"
     */
    flattenChunks<R, E, A>(this: Stream<R, E, C.Chunk<A>>): Stream<R, E, A>
    /**
     * @rewrite flattenExitMaybe from "@principia/base/Stream"
     */
    flattenExitMaybe<R, E, E1, A>(this: Stream<R, E, Ex.Exit<O.Maybe<E1>, A>>): Stream<R, E | E1, A>
    /**
     * @rewrite flattenTake from "@principia/base/Stream"
     */
    flattenTake<R, E, E1, A>(this: Stream<R, E, Take<E1, A>>): Stream<R, E | E1, A>
    /**
     * @rewriteGetter forever from "@principia/base/Stream"
     */
    forever: Stream<R, E, A>
    /**
     * @rewrite give_ from "@principia/base/Stream"
     */
    give(r: R): Stream<unknown, E, A>
    /**
     * @rewrite giveSome_ from "@principia/base/Stream"
     */
    giveSome<R, E, A, R0>(this: Stream<R, E, A>, r: R0): Stream<Erase<R, R0>, E, A>
    /**
     * @rewrite giveSomeLayer_ from "@principia/base/Stream"
     */
    giveSome<R, E, A, R0, E1, A1>(this: Stream<R, E, A>, layer: Layer<R0, E1, A1>): Stream<Erase<R, A1>, E | E1, A>
    /**
     * @rewrite groupBy_ from "@principia/base/Stream"
     */
    groupBy<R, E, A, R1, E1, K, V>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
      buffer?: number
    ): GroupBy<R & R1, E | E1, K, V>
    /**
     * @rewrite groupByKey_ from "@principia/base/Stream"
     */
    groupByKey<R, E, A, K>(this: Stream<R, E, A>, f: (a: A) => K, buffer?: number): GroupBy<R, E, K, A>
    /**
     * @rewrite interleave_ from "@principia/base/Stream"
     */
    interleave<R, E, A, R1, E1, B>(this: Stream<R, E, A>, sb: Stream<R1, E1, B>): Stream<R & R1, E | E1, A | B>
    /**
     * @rewrite interleaveWith_ from "@principia/base/Stream"
     */
    interleaveWith<R, E, A, R1, E1, B, R2, E2>(
      this: Stream<R, E, A>,
      sb: Stream<R1, E1, B>,
      b: Stream<R2, E2, boolean>
    ): Stream<R & R1 & R2, E | E1 | E2, A | B>
    /**
     * @rewrite interruptWhen_ from "@principia/base/Stream"
     */
    interruptWhen<R, E, A, R1, E1>(this: Stream<R, E, A>, io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite intersperse_ from "@principia/base/Stream"
     */
    intersperse<R, E, A, A1>(this: Stream<R, E, A>, middle: A1): Stream<R, E, A | A1>
    /**
     * @rewrite loopOnChunks_ from "@principia/base/Stream"
     */
    loopOnChunks<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      f: (a: C.Chunk<A>) => Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite loopOnPartialChunks_ from "@principia/base/Stream"
     */
    loopOnPartialChunks<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      f: (a: C.Chunk<A>, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, boolean>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite loopOnPartialChunksElements_ from "@principia/base/Stream"
     */
    loopOnPartialChunksElements<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      f: (a: A, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, void>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite map_ from "@principia/base/Stream"
     */
    map<R, E, A, B>(this: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B>
    /**
     * @rewrite mapAccum_ from "@principia/base/Stream"
     */
    mapAccum<R, E, A, S, B>(this: Stream<R, E, A>, s: S, f: (s: S, a: A) => readonly [B, S]): Stream<R, E, B>
    /**
     * @rewrite mapAccumIO_ from "@principia/base/Stream"
     */
    mapAccumIO<R, E, A, S, R1, E1, B>(
      this: Stream<R, E, A>,
      s: S,
      f: (s: S, a: A) => I.IO<R1, E1, readonly [B, S]>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapChunks_ from "@principia/base/Stream"
     */
    mapChunks<R, E, A, A1>(this: Stream<R, E, A>, f: (chunk: C.Chunk<A>) => C.Chunk<A1>): Stream<R, E, A1>
    /**
     * @rewrite mapChunksIO_ from "@principia/base/Stream"
     */
    mapChunksIO<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (chunk: C.Chunk<A>) => I.IO<R1, E1, C.Chunk<B>>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapConcat_ from "@principia/base/Stream"
     */
    mapConcat<R, E, A, B>(this: Stream<R, E, A>, f: (a: A) => Iterable<B>): Stream<R, E, B>
    /**
     * @rewrite mapConcatChunk_ from "@principia/base/Stream"
     */
    mapConcatChunk<R, E, A, B>(this: Stream<R, E, A>, f: (a: A) => C.Chunk<B>): Stream<R, E, B>
    /**
     * @rewrite mapConcatChunkIO_ from "@principia/base/Stream"
     */
    mapConcatChunkIO<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, C.Chunk<B>>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapConcatIO_ from "@principia/base/Stream"
     */
    mapConcatIO<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, Iterable<B>>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapError_ from "@principia/base/Stream"
     */
    mapError<R, E, A, E1>(this: Stream<R, E, A>, f: (e: E) => E1): Stream<R, E1, A>
    /**
     * @rewrite mapErrorCause_ from "@principia/base/Stream"
     */
    mapErrorCause<R, E, A, E1>(this: Stream<R, E, A>, f: (e: Cause<E>) => Cause<E1>): Stream<R, E1, A>
    /**
     * @rewrite mapIO_ from "@principia/base/Stream"
     */
    mapIO<R, E, A, R1, E1, B>(this: Stream<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapIOC_ from "@principia/base/Stream"
     */
    mapIOC<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      n: number,
      f: (a: A) => I.IO<R1, E1, B>
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapIOPartitioned_ from "@principia/base/Stream"
     */
    mapIOPartitioned<R, E, A, R1, E1, A1, K>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, A1>,
      keyBy: (a: A) => K,
      buffer?: number
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite merge_ from "@principia/base/Stream"
     */
    merge<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      sb: Stream<R1, E1, A1>,
      strategy?: TerminationStrategy
    ): Stream<R & R1, E | E1, A | A1>
    /**
     * @rewrite mergeMap_ from "@principia/base/Stream"
     */
    mergeMap<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (a: A) => Stream<R1, E1, B>,
      n: number,
      bufferSize?: number
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mergeMapIO_ from "@principia/base/Stream"
     */
    mergeMapIO<R, E, A, R1, E1, B>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, B>,
      n: number,
      bufferSize?: number
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mergeWith_ from "@principia/base/Stream"
     */
    mergeWith<R, E, A, R1, E1, A1, B, C>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, A1>,
      l: (a: A) => B,
      r: (a: A1) => C,
      strategy?: TerminationStrategy
    ): Stream<R & R1, E | E1, B | C>
    /**
     * @rewrite onError_ from "@principia/base/Stream"
     */
    onError<R, E, A, R1>(this: Stream<R, E, A>, cleanup: (e: Cause<E>) => I.IO<R1, never, any>): Stream<R & R1, E, A>
    /**
     * @rewrite orElse_ from "@principia/base/Stream"
     */
    orElse<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: () => Stream<R1, E1, A1>): Stream<R & R1, E1, A | A1>
    /**
     * @rewrite orElseEither_ from "@principia/base/Stream"
     */
    orElseEither<R, E, A, R1, E1, A1>(
      this: Stream<R, E, A>,
      that: () => Stream<R1, E1, A1>
    ): Stream<R & R1, E | E1, E.Either<A, A1>>
    /**
     * @rewrite orElseFail_ from "@principia/base/Stream"
     */
    orElseFail<R, E, A, E1>(this: Stream<R, E, A>, e: () => E1): Stream<R, E1, A>
    /**
     * @rewrite orElseOptional_ from "@principia/base/Stream"
     */
    orElseOptional<R, E, A, R1, E1, A1>(
      this: Stream<R, O.Maybe<E>, A>,
      that: () => Stream<R1, O.Maybe<E1>, A1>
    ): Stream<R & R1, O.Maybe<E | E1>, A | A1>
    /**
     * @rewrite orElseSucceed_ from "@principia/base/Stream"
     */
    orElseSucceed<R, E, A, A1>(this: Stream<R, E, A>, a: () => A1): Stream<R, never, A | A1>
    /**
     * @rewrite partition_ from "@principia/base/Stream"
     */
    partition(
      predicate: P.Predicate<A>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]>
    /**
     * @rewrite partition_ from "@principia/base/Stream"
     */
    partition<R, E, A, B extends A>(
      this: Stream<R, E, A>,
      refinement: P.Refinement<A, B>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, B>]>
    /**
     * @rewrite partitionIO_ from "@principia/base/Stream"
     */
    partitionIO<R, E, A, R1, E1>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, boolean>,
      buffer?: number
    ): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, A>, Stream<unknown, E | E1, A>]>
    /**
     * @rewrite partitionMap_ from "@principia/base/Stream"
     */
    partitionMap<R, E, A, B, C>(
      this: Stream<R, E, A>,
      f: (a: A) => E.Either<B, C>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, B>, Stream<unknown, E, C>]>
    /**
     * @rewrite partitionMapIO_ from "@principia/base/Stream"
     */
    partitionMapIO<R, E, A, R1, E1, B, C>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, E.Either<B, C>>,
      buffer?: number
    ): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, B>, Stream<unknown, E | E1, C>]>
    /**
     * @rewrite peel_ from "@principia/base/Stream"
     */
    peel<R, E, A extends A1, R1, E1, A1, Z>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, A1, Z>
    ): Managed<R & R1, E1, readonly [Z, Stream<unknown, E | E1, A1>]>
    /**
     * @rewrite refineOrHalt_ from "@principia/base/Stream"
     */
    refineOrHalt<R, E, A, E1>(this: Stream<R, E, A>, pf: (e: E) => O.Maybe<E1>): Stream<R, E1, A>
    /**
     * @rewrite refineOrHaltWith_ from "@principia/base/Stream"
     */
    refineOrHaltWith<R, E, A, E1>(
      this: Stream<R, E, A>,
      pf: (e: E) => O.Maybe<E1>,
      f: (e: E) => unknown
    ): Stream<R, E1, A>
    /**
     * @rewrite repeat_ from "@principia/base/Stream"
     */
    repeat<R, E, A, R1, B>(this: Stream<R, E, A>, schedule: Schedule<R1, any, B>): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite repeatEither_ from "@principia/base/Stream"
     */
    repeatEither<R, E, A, R1, B>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, any, B>
    ): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>>
    /**
     * @rewrite repeatElements_ from "@principia/base/Stream"
     */
    repeatElements<R, E, A, R1, B>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, A, B>
    ): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite repeatElementsEither_ from "@principia/base/Stream"
     */
    repeatElementsEither<R, E, A, R1, B>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, A, B>
    ): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>>
    /**
     * @rewrite repeatElementsWith_ from "@principia/base/Stream"
     */
    repeatElementsWith<R, E, A, R1, B, C, D>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, A, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite repeatWith_ from "@principia/base/Stream"
     */
    repeatWith<R, E, A, R1, B, C, D>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, any, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite right from "@principia/base/Stream"
     */
    right<R, E, A, B>(this: Stream<R, E, E.Either<A, B>>): Stream<R, O.Maybe<E>, B>
    /**
     * @rewrite rightOrFail_ from "@principia/base/Stream"
     */
    rightOrFail<R, E, A, B, E1>(this: Stream<R, E, E.Either<A, B>>, e: () => E1): Stream<R, E | E1, B>
    /**
     * @rewrite run_ from "@principia/base/Stream"
     */
    run<R, E, A, R2, E2, Z>(this: Stream<R, E, A>, sink: Sink<R2, E2, A, unknown, Z>): I.IO<R & R2, E | E2, Z>
    /**
     * @rewriteGetter runCollect from "@principia/base/Stream"
     */
    runCollect: I.IO<R, E, C.Chunk<A>>
    /**
     * @rewriteGetter runDrain from "@principia/base/Stream"
     */
    runDrain: I.IO<R, E, void>
    /**
     * @rewrite runForeach_ from "@principia/base/Stream"
     */
    runForeach<R, E, A, R1, E1>(this: Stream<R, E, A>, f: (a: A) => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runForeachChunk_ from "@principia/base/Stream"
     */
    runForeachChunk<R, E, A, R1, E1>(
      this: Stream<R, E, A>,
      f: (as: C.Chunk<A>) => I.IO<R1, E1, any>
    ): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runForeachManaged_ from "@principia/base/Stream"
     */
    runForeachManaged<R, E, A, R1, E1>(
      this: Stream<R, E, A>,
      f: (a: A) => I.IO<R1, E1, any>
    ): M.Managed<R & R1, E | E1, void>
    /**
     * @rewrite runInto_ from "@principia/base/Stream"
     */
    runInto<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      queue: Queue<R1, never, never, unknown, Take<E1, A>, any>
    ): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runIntoElementsManaged_ from "@principia/base/Stream"
     */
    runIntoElementsManaged<R, E, A, R1, E1>(
      this: Stream<R, E, A>,
      queue: Queue<R1, unknown, never, never, Ex.Exit<O.Maybe<E | E1>, A>, unknown>
    ): M.Managed<R & R1, E | E1, void>
    /**
     * @rewrite runIntoHubManaged_ from "@principia/base/Stream"
     */
    runIntoHubManaged<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      hub: Hub<R1, never, never, unknown, Take<E1, A>, any>
    ): M.Managed<R & R1, E1 | E, void>
    /**
     * @rewrite runIntoManaged_ from "@principia/base/Stream"
     */
    runIntoManaged<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      queue: Queue<R1, never, never, unknown, Take<E1, A>, any>
    ): M.Managed<R & R1, E1 | E, void>

    /**
     * @rewrite runManaged from "@principia/base/Stream"
     */
    runManaged<R, E, A, R2, E2, Z>(this: Stream<R, E, A>, sink: Sink<R2, E2, A, unknown, Z>): Managed<R & R2, E | E2, Z>
    /**
     * @rewrite schedule_ from "@principia/base/Stream"
     */
    schedule<R, E, A, R1>(this: Stream<R, E, A>, schedule: Schedule<R1, A, any>): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite scheduleEither_ from "@principia/base/Stream"
     */
    scheduleEither<R, E, A, R1, B>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, A, B>
    ): Stream<R & R1 & Has<Clock>, E, E.Either<A, B>>
    /**
     * @rewrite scheduleWith_ from "@principia/base/Stream"
     */
    scheduleWith<R, E, A, R1, B, C, D>(
      this: Stream<R, E, A>,
      schedule: Schedule<R1, A, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite subsumeEither from "@principia/base/Stream"
     */
    subsumeEither<R, E, E2, A>(this: Stream<R, E, E.Either<E2, A>>): Stream<R, E | E2, A>
    /**
     * @rewrite take_ from "@principia/base/Stream"
     */
    take<R, E, A>(this: Stream<R, E, A>, n: number): Stream<R, E, A>
    /**
     * @rewriteGetter toAsyncIterable from "@principia/base/Stream"
     */
    toAsyncIterable: M.Managed<R, never, AsyncIterable<E.Either<E, A>>>
    /**
     * @rewrite toHub_ from "@principia/base/Stream"
     */
    toHub<R, E, A>(this: Stream<R, E, A>, capacity: number): M.Managed<R, never, UHub<Take<E, A>>>
    /**
     * @rewriteGetter toPull from "@principia/base/Stream"
     */
    toPull: M.Managed<R, never, I.IO<R, O.Maybe<E>, C.Chunk<A>>>
    /**
     * @rewrite toQueue_ from "@principia/base/Stream"
     */
    toQueue<R, E, A>(this: Stream<R, E, A>, capacity?: number): M.Managed<R, never, UQueue<Take<E, A>>>
    /**
     * @rewrite toQueueDropping_ from "@principia/base/Stream"
     */
    toQueueDropping<R, E, A>(this: Stream<R, E, A>, capacity?: number): M.Managed<R, never, Dequeue<Take<E, A>>>
    /**
     * @rewrite toQueueOfElements_ from "@principia/base/Stream"
     */
    toQueueOfElements<R, E, A>(
      this: Stream<R, E, A>,
      capacity?: number
    ): M.Managed<R, never, Dequeue<Ex.Exit<O.Maybe<E>, A>>>
    /**
     * @rewrite toQueueSliding_ from "@principia/base/Stream"
     */
    toQueueSliding<R, E, A>(this: Stream<R, E, A>, capacity?: number): M.Managed<R, never, Dequeue<Take<E, A>>>
    /**
     * @rewrite toQueueUnbounded_ from "@principia/base/Stream"
     */
    toQueueUnbounded: M.Managed<R, never, UQueue<Take<E, A>>>
    /**
     * @rewrite zip_ from "@principia/base/Stream"
     */
    zip<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, readonly [A, A1]>
    /**
     * @rewrite zipFirst_ from "@principia/base/Stream"
     */
    zipFirst<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, A>
    /**
     * @rewrite zipSecond_ from "@principia/base/Stream"
     */
    zipSecond<R, E, A, R1, E1, A1>(this: Stream<R, E, A>, that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, A1>
    /**
     * @rewrite zipWith_ from "@principia/base/Stream"
     */
    zipWith<R, E, A, R1, E1, A1, B>(
      this: Stream<R, E, A>,
      that: Stream<R1, E1, A1>,
      f: (a: A, a1: A1) => B
    ): Stream<R1 & R, E | E1, B>
    /**
     * @rewriteGetter zipWithIndex from "@principia/base/Stream"
     */
    zipWithIndex: Stream<R, E, readonly [A, number]>
  }
}
