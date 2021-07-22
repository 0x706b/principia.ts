import type { Cause } from '@principia/base/Cause'
import type * as C from '@principia/base/Chunk'
import type { Clock } from '@principia/base/Clock'
import type * as Ex from '@principia/base/Exit'
import type * as Ch from '@principia/base/experimental/Channel'
import type { Sink } from '@principia/base/experimental/Sink'
import type { GroupBy } from '@principia/base/experimental/Stream/core'
import type { Take } from '@principia/base/experimental/Stream/Take'
import type { Has } from '@principia/base/Has'
import type { Hub, HubDequeue, UHub } from '@principia/base/Hub'
import type * as I from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type * as M from '@principia/base/Managed'
import type * as O from '@principia/base/Option'
import type * as P from '@principia/base/prelude'
import type { Erase } from '@principia/base/prelude'
import type { Dequeue, Queue, UQueue } from '@principia/base/Queue'
import type { Schedule } from '@principia/base/Schedule'

import * as E from '@principia/base/Either'

declare module '@principia/base/experimental/Stream/core' {
  export interface Stream<R, E, A> {
    /**
     * @rewrite aggregateAsync_ from "@principia/base/experimental/Stream"
     */
    aggregateAsync<R, E extends E1, A extends A1, R1, E1, E2, A1, B>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, E2, A1, B>
    ): Stream<R & R1 & Has<Clock>, E2, B>
    /**
     * @rewrite aggregateAsyncWithin_ from "@principia/base/experimental/Stream"
     */
    aggregateAsyncWithin<R, E extends E1, A extends A1, R1, R2, E1, E2, A1, B, C>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, E2, A1, B>,
      schedule: Schedule<R2, O.Option<B>, C>
    ): Stream<R & R1 & R2 & Has<Clock>, E2, B>
    /**
     * @rewrite aggregateAsyncWithinEither_ from "@principia/base/experimental/Stream"
     */
    aggregateAsyncWithinEither<R, E extends E1, A extends A1, R1, R2, E1, E2, A1, B, C>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E1, A1, E2, A1, B>,
      schedule: Schedule<R2, O.Option<B>, C>
    ): Stream<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>>
    /**
     * @rewrite as_ from "@principia/base/experimental/Stream"
     */
    as<B>(b: B): Stream<R, E, B>
    /**
     * @rewrite bimap_ from "@principia/base/experimental/Stream"
     */
    bimap<E1, A1>(f: (e: E) => E1, g: (a: A) => A1): Stream<R, E1, A1>
    /**
     * @rewrite broadcast_ from "@principia/base/experimental/Stream"
     */
    broadcast(n: number, maximumLag: number): M.Managed<R, never, C.Chunk<Stream<unknown, E, A>>>
    /**
     * @rewrite broadcastDynamic_ from "@principia/base/experimental/Stream"
     */
    broadcastDynamic(maximumLag: number): M.Managed<R, never, Stream<unknown, E, A>>
    /**
     * @rewrite broadcastQueues_ from "@principia/base/experimental/Stream"
     */
    broadcastedQueues(
      n: number,
      maximumLag: number
    ): M.Managed<R, never, C.Chunk<HubDequeue<unknown, never, Take<E, A>>>>
    /**
     * @rewrite broadcastQueuesDynamic_ from "@principia/base/experimental/Stream"
     */
    broadcastedQueuesDynamic(
      maximumLag: number
    ): M.Managed<R, never, M.Managed<unknown, never, HubDequeue<unknown, never, Take<E, A>>>>
    /**
     * @rewrite buffer_ from "@principia/base/experimental/Stream"
     */
    buffer(capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunks_ from "@principia/base/experimental/Stream"
     */
    bufferChunks(capacty: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunksDropping_ from "@principia/base/experimental/Stream"
     */
    bufferChunksDropping(capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferChunksSliding_ from "@principia/base/experimental/Stream"
     */
    bufferChunksSliding(capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferDropping_ from "@principia/base/experimental/Stream"
     */
    bufferDropping(capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferSliding_ from "@principia/base/experimental/Stream"
     */
    bufferSliding(capacity: number): Stream<R, E, A>
    /**
     * @rewrite bufferUnbounded_ from "@principia/base/experimental/Stream"
     */
    bufferUnbounded: Stream<R, E, A>
    /**
     * @rewrite catchAll_ from "@principia/base/experimental/Stream"
     */
    catchAll<R1, E1, A1>(f: (e: E) => Stream<R1, E1, A1>): Stream<R & R1, E1, A1 | A>
    /**
     * @rewrite catchAllCause_ from "@principia/base/experimental/Stream"
     */
    catchAllCause<R1, E1, A1>(f: (cause: Cause<E>) => Stream<R1, E1, A1>): Stream<R & R1, E1, A1 | A>
    /**
     * @rewrite catchSome_ from "@principia/base/experimental/Stream"
     */
    catchSome<R1, E1, A1>(pf: (e: E) => O.Option<Stream<R1, E1, A1>>): Stream<R & R1, E | E1, A1 | A>
    /**
     * @rewrite catchSomeCause_ from "@principia/base/experimental/Stream"
     */
    catchSomeCause<R1, E, E1, A1>(pf: (e: Cause<E>) => O.Option<Stream<R1, E1, A1>>): Stream<R & R1, E | E1, A1 | A>
    /**
     * @rewrite chain_ from "@principia/base/experimental/Stream"
     */
    chain<R1, E1, B>(f: (a: A) => Stream<R1, E1, B>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite chainPar_ from "@principia/base/experimental/Stream"
     */
    chainPar<R1, E1, B>(f: (a: A) => Stream<R1, E1, B>, n: number, bufferSize?: number): Stream<R & R1, E | E1, B>
    /**
     * @rewrite changesWith_ from "@principia/base/experimental/Stream"
     */
    changesWith<A>(f: (x: A, y: A) => boolean): Stream<R, E, A>
    /**
     * @rewrite chunkN_ from "@principia/base/experimental/Stream"
     */
    chunkN(n: number): Stream<R, E, A>
    /**
     * @rewriteGetter chunks from "@principia/base/experimental/Stream"
     */
    chunks: Stream<R, E, C.Chunk<A>>
    /**
     * @rewrite collect_ from "@principia/base/experimental/Stream"
     */
    collect<B>(f: (a: A) => O.Option<B>): Stream<R, E, B>
    /**
     * @rewrite collectIO_ from "@principia/base/experimental/Stream"
     */
    collectIO<R1, E1, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite collectLeft from "@principia/base/experimental/Stream"
     */
    collectLeft<R, E, L1, A>(this: Stream<R, E, E.Either<L1, A>>): Stream<R, E, L1>
    /**
     * @rewrite collectRight from "@principia/base/experimental/Stream"
     */
    collectRight<R, E, A, R1>(this: Stream<R, E, E.Either<A, R1>>): Stream<R, E, R1>
    /**
     * @rewrite collectSome from "@principia/base/experimental/Stream"
     */
    collectSome<R, E, A>(this: Stream<R, E, O.Option<A>>): Stream<R, E, A>
    /**
     * @rewrite collectSuccess from "@principia/base/experimental/Stream"
     */
    collectSuccess<R, E, A, L1>(this: Stream<R, E, Ex.Exit<L1, A>>): Stream<R, E, A>
    /**
     * @rewrite collectWhile_ from "@principia/base/experimental/Stream"
     */
    collectWhile<A1>(pf: (a: A) => O.Option<A1>): Stream<R, E, A1>
    /**
     * @rewrite collectWhileIO_ from "@principia/base/experimental/Stream"
     */
    collectWhileIO<R1, E1, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite collectWhileLeft from "@principia/base/experimental/Stream"
     */
    collectWhileLeft<R, E, A1, L1>(this: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, L1>
    /**
     * @rewrite collectWhileRight from "@principia/base/experimental/Stream"
     */
    collectWhileRight<R, E, A1, L1>(this: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, A1>
    /**
     * @rewrite collectWhileSome from "@principia/base/experimental/Stream"
     */
    collectWhileSome<R, E, A>(this: Stream<R, E, O.Option<A>>): Stream<R, E, A>
    /**
     * @rewrite collectWhileSuccess from "@principia/base/experimental/Stream"
     */
    collectWhileSuccess<R, E, A1, L1>(this: Stream<R, E, Ex.Exit<L1, A1>>): Stream<R, E, A1>
    /**
     * @rewrite combine_ from "@principia/base/experimental/Stream"
     */
    combine<R1, E1, A1, S, R2, A2>(
      that: Stream<R1, E1, A1>,
      s: S,
      f: (
        s: S,
        eff1: I.IO<R, O.Option<E>, A>,
        eff2: I.IO<R1, O.Option<E1>, A1>
      ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [A2, S]>>
    ): Stream<R & R1 & R2, E | E1, A2>
    /**
     * @rewrite combineChunks_ from "@principia/base/experimental/Stream"
     */
    combineChunks<R1, E1, A1, S, R2, A2>(
      that: Stream<R1, E1, A1>,
      s: S,
      f: (
        s: S,
        l: I.IO<R, O.Option<E>, C.Chunk<A>>,
        r: I.IO<R1, O.Option<E1>, C.Chunk<A1>>
      ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [C.Chunk<A2>, S]>>
    ): Stream<R1 & R & R2, E | E1, A2>
    /**
     * @rewrite concat_ from "@principia/base/experimental/Stream"
     */
    concat<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A1 | A>
    /**
     * @rewrite cross_ from "@principia/base/experimental/Stream"
     */
    cross<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, readonly [A, A1]>
    /**
     * @rewrite crossFirst_ from "@principia/base/experimental/Stream"
     */
    crossFirst<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A>
    /**
     * @rewrite crossSecond_ from "@principia/base/experimental/Stream"
     */
    crossSecond<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R & R1, E1 | E, A1>
    /**
     * @rewrite crossWith_ from "@principia/base/experimental/Stream"
     */
    crossWith<R1, E1, B, C>(that: Stream<R1, E1, B>, f: (a: A, b: B) => C): Stream<R & R1, E | E1, C>
    /**
     * @rewrite debounce_ from "@principia/base/experimental/Stream"
     */
    debounce(duration: number): Stream<R & Has<Clock>, E, A>
    /**
     * @rewrite distributedWith_ from "@principia/base/experimental/Stream"
     */
    distributedWith(
      n: number,
      maximumLag: number,
      decide: (_: A) => I.UIO<(_: number) => boolean>
    ): M.Managed<R, never, C.Chunk<Dequeue<Ex.Exit<O.Option<E>, A>>>>
    /**
     * @rewrite distributedWithDynamic_ from "@principia/base/experimental/Stream"
     */
    distributedWithDynamic(
      maximumLag: number,
      decide: (_: A) => I.UIO<(_: symbol) => boolean>,
      done?: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any>
    ): M.Managed<R, never, I.UIO<readonly [symbol, Dequeue<Ex.Exit<O.Option<E>, A>>]>>
    /**
     * @rewrite drop_ from "@principia/base/experimental/Stream"
     */
    drop(n: number): Stream<R, E, A>
    /**
     * @rewrite dropUntil_ from "@principia/base/experimental/Stream"
     */
    dropUntil(predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite dropWhile_ from "@principia/base/experimental/Stream"
     */
    dropWhile(predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewriteGetter either from "@principia/base/experimental/Stream"
     */
    either: Stream<R, never, E.Either<E, A>>
    /**
     * @rewrite ensuring_ from "@principia/base/experimental/Stream"
     */
    ensuring<R1>(fin: I.IO<R1, never, any>): Stream<R & R1, E, A>
    /**
     * @rewrite filter_ from "@principia/base/experimental/Stream"
     */
    filter(predicate: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite filter_ from "@principia/base/experimental/Stream"
     */
    filter<B extends A>(refinement: P.Refinement<A, B>): Stream<R, E, B>
    /**
     * @rewrite filterIO_ from "@principia/base/experimental/Stream"
     */
    filterIO<R1, E1>(f: (a: A) => I.IO<R1, E1, boolean>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite filterMap_ from "@principia/base/experimental/Stream"
     */
    filterMap<B>(f: (a: A) => O.Option<B>): Stream<R, E, B>
    /**
     * @rewrite filterMapIO_ from "@principia/base/experimental/Stream"
     */
    filterMapIO<R1, E1, B>(f: (a: A) => I.IO<R1, E1, O.Option<B>>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite find_ from "@principia/base/experimental/Stream"
     */
    find(f: P.Predicate<A>): Stream<R, E, A>
    /**
     * @rewrite findIO_ from "@principia/base/experimental/Stream"
     */
    findIO<R1, E1>(f: (a: A) => I.IO<R1, E1, boolean>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite flattenChunks from "@principia/base/experimental/Stream"
     */
    flattenChunks<R, E, A>(this: Stream<R, E, C.Chunk<A>>): Stream<R, E, A>
    /**
     * @rewrite flattenExitOption from "@principia/base/experimental/Stream"
     */
    flattenExitOption<R, E, E1, A>(this: Stream<R, E, Ex.Exit<O.Option<E1>, A>>): Stream<R, E | E1, A>
    /**
     * @rewrite flattenTake from "@principia/base/experimental/Stream"
     */
    flattenTake<R, E, E1, A>(this: Stream<R, E, Take<E1, A>>): Stream<R, E | E1, A>
    /**
     * @rewriteGetter forever from "@principia/base/experimental/Stream"
     */
    forever: Stream<R, E, A>
    /**
     * @rewrite give_ from "@principia/base/experimental/Stream"
     */
    give<R, E, A, R0>(this: Stream<R, E, A>, r: R0): Stream<Erase<R, R0>, E, A>
    /**
     * @rewrite giveLayer_ from "@principia/base/experimental/Stream"
     */
    give<R, E, A, R0, E1, A1>(this: Stream<R, E, A>, layer: Layer<R0, E1, A1>): Stream<Erase<R, A1>, E | E1, A>
    /**
     * @rewrite giveAll_ from "@principia/base/experimental/Stream"
     */
    giveAll(r: R): Stream<unknown, E, A>
    /**
     * @rewrite groupBy_ from "@principia/base/experimental/Stream"
     */
    groupBy<R1, E1, K, V>(f: (a: A) => I.IO<R1, E1, readonly [K, V]>, buffer?: number): GroupBy<R & R1, E | E1, K, V>
    /**
     * @rewrite groupByKey_ from "@principia/base/experimental/Stream"
     */
    groupByKey<K>(f: (a: A) => K, buffer?: number): GroupBy<R, E, K, A>
    /**
     * @rewrite endWhen_ from "@principia/base/experimental/Stream"
     */
    endWhen<R1, E1>(io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite interleave_ from "@principia/base/experimental/Stream"
     */
    interleave<R1, E1, B>(sb: Stream<R1, E1, B>): Stream<R & R1, E | E1, A | B>
    /**
     * @rewrite interleaveWith_ from "@principia/base/experimental/Stream"
     */
    interleaveWith<R1, E1, B, R2, E2>(
      sb: Stream<R1, E1, B>,
      b: Stream<R2, E2, boolean>
    ): Stream<R & R1 & R2, E | E1 | E2, A | B>
    /**
     * @rewrite interruptWhen_ from "@principia/base/experimental/Stream"
     */
    interruptWhen<R1, E1>(io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A>
    /**
     * @rewrite intersperse_ from "@principia/base/experimental/Stream"
     */
    intersperse<A1>(middle: A1): Stream<R, E, A | A1>
    /**
     * @rewrite loopOnChunks_ from "@principia/base/experimental/Stream"
     */
    loopOnChunks<R1, E1, A1>(
      f: (a: C.Chunk<A>) => Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite loopOnPartialChunks_ from "@principia/base/experimental/Stream"
     */
    loopOnPartialChunks<R1, E1, A1>(
      f: (a: C.Chunk<A>, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, boolean>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite loopOnPartialChunksElements_ from "@principia/base/experimental/Stream"
     */
    loopOnPartialChunksElements<R1, E1, A1>(
      f: (a: A, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, void>
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite map_ from "@principia/base/experimental/Stream"
     */
    map<B>(f: (a: A) => B): Stream<R, E, B>
    /**
     * @rewrite mapAccum_ from "@principia/base/experimental/Stream"
     */
    mapAccum<S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): Stream<R, E, B>
    /**
     * @rewrite mapAccumIO_ from "@principia/base/experimental/Stream"
     */
    mapAccumIO<S, R1, E1, B>(s: S, f: (s: S, a: A) => I.IO<R1, E1, readonly [B, S]>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapChunks_ from "@principia/base/experimental/Stream"
     */
    mapChunks<A1>(f: (chunk: C.Chunk<A>) => C.Chunk<A1>): Stream<R, E, A1>
    /**
     * @rewrite mapChunksIO_ from "@principia/base/experimental/Stream"
     */
    mapChunksIO<R1, E1, B>(f: (chunk: C.Chunk<A>) => I.IO<R1, E1, C.Chunk<B>>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapConcat_ from "@principia/base/experimental/Stream"
     */
    mapConcat<B>(f: (a: A) => Iterable<B>): Stream<R, E, B>
    /**
     * @rewrite mapConcatChunk_ from "@principia/base/experimental/Stream"
     */
    mapConcatChunk<B>(f: (a: A) => C.Chunk<B>): Stream<R, E, B>
    /**
     * @rewrite mapConcatChunkIO_ from "@principia/base/experimental/Stream"
     */
    mapConcatChunkIO<R1, E1, B>(f: (a: A) => I.IO<R1, E1, C.Chunk<B>>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapConcatIO_ from "@principia/base/experimental/Stream"
     */
    mapConcatIO<R1, E1, B>(f: (a: A) => I.IO<R1, E1, Iterable<B>>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapError_ from "@principia/base/experimental/Stream"
     */
    mapError<E1>(f: (e: E) => E1): Stream<R, E1, A>
    /**
     * @rewrite mapErrorCause_ from "@principia/base/experimental/Stream"
     */
    mapErrorCause<E1>(f: (e: Cause<E>) => Cause<E1>): Stream<R, E1, A>
    /**
     * @rewrite mapIO_ from "@principia/base/experimental/Stream"
     */
    mapIO<A, R1, E1, B>(f: (a: A) => I.IO<R1, E1, B>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapIOPar_ from "@principia/base/experimental/Stream"
     */
    mapIOPar<R1, E1, B>(n: number, f: (a: A) => I.IO<R1, E1, B>): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapIOParUnordered_ from "@principia/base/experimental/Stream"
     */
    mapIOParUnordered<R1, E1, B>(
      f: (a: A) => I.IO<R1, E1, B>,
      n: number,
      bufferSize?: number
    ): Stream<R & R1, E | E1, B>
    /**
     * @rewrite mapIOPartitioned_ from "@principia/base/experimental/Stream"
     */
    mapIOPartitioned<R1, E1, A1, K>(
      f: (a: A) => I.IO<R1, E1, A1>,
      keyBy: (a: A) => K,
      buffer?: number
    ): Stream<R & R1, E | E1, A1>
    /**
     * @rewrite merge_ from "@principia/base/experimental/Stream"
     */
    merge<R1, E1, A1>(sb: Stream<R1, E1, A1>, strategy?: TerminationStrategy): Stream<R & R1, E | E1, A | A1>
    /**
     * @rewrite mergeWith_ from "@principia/base/experimental/Stream"
     */
    mergeWith<R1, E1, A1, B, C>(
      that: Stream<R1, E1, A1>,
      l: (a: A) => B,
      r: (a: A1) => C,
      strategy?: TerminationStrategy
    ): Stream<R & R1, E | E1, B | C>
    /**
     * @rewrite onError_ from "@principia/base/experimental/Stream"
     */
    onError<R1>(cleanup: (e: Cause<E>) => I.IO<R1, never, any>): Stream<R & R1, E, A>
    /**
     * @rewrite orElse_ from "@principia/base/experimental/Stream"
     */
    orElse<R1, E1, A1>(that: () => Stream<R1, E1, A1>): Stream<R & R1, E1, A | A1>
    /**
     * @rewrite orElseEither_ from "@principia/base/experimental/Stream"
     */
    orElseEither<R1, E1, A1>(that: () => Stream<R1, E1, A1>): Stream<R & R1, E | E1, E.Either<A, A1>>
    /**
     * @rewrite orElseFail_ from "@principia/base/experimental/Stream"
     */
    orElseFail<E1>(e: () => E1): Stream<R, E1, A>
    /**
     * @rewrite orElseOptional_ from "@principia/base/experimental/Stream"
     */
    orElseOptional<R, E, A, R1, E1, A1>(
      this: Stream<R, O.Option<E>, A>,
      that: () => Stream<R1, O.Option<E1>, A1>
    ): Stream<R & R1, O.Option<E | E1>, A | A1>
    /**
     * @rewrite orElseSucceed_ from "@principia/base/experimental/Stream"
     */
    orElseSucceed<A1>(a: () => A1): Stream<R, never, A | A1>
    /**
     * @rewrite partition_ from "@principia/base/experimental/Stream"
     */
    partition(
      predicate: P.Predicate<A>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, A>]>
    /**
     * @rewrite partition_ from "@principia/base/experimental/Stream"
     */
    partition<B extends A>(
      refinement: P.Refinement<A, B>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, A>, Stream<unknown, E, B>]>
    /**
     * @rewrite partitionIO_ from "@principia/base/experimental/Stream"
     */
    partitionIO<R1, E1>(
      f: (a: A) => I.IO<R1, E1, boolean>,
      buffer?: number
    ): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, A>, Stream<unknown, E | E1, A>]>
    /**
     * @rewrite partitionMap_ from "@principia/base/experimental/Stream"
     */
    partitionMap<B, C>(
      f: (a: A) => E.Either<B, C>,
      buffer?: number
    ): M.Managed<R, never, readonly [Stream<unknown, E, B>, Stream<unknown, E, C>]>
    /**
     * @rewrite partitionMapIO_ from "@principia/base/experimental/Stream"
     */
    partitionMapIO<R1, E1, B, C>(
      f: (a: A) => I.IO<R1, E1, E.Either<B, C>>,
      buffer?: number
    ): M.Managed<R & R1, E1, readonly [Stream<unknown, E | E1, B>, Stream<unknown, E | E1, C>]>
    /**
     * @rewrite peel_ from "@principia/base/experimental/Stream"
     */
    peel<R, E, A extends A1, R1, E1, A1, Z>(
      this: Stream<R, E, A>,
      sink: Sink<R1, E, A, E1, A1, Z>
    ): M.Managed<R & R1, E1, readonly [Z, Stream<unknown, E | E1, A1>]>
    /**
     * @rewrite refineOrDie_ from "@principia/base/experimental/Stream"
     */
    refineOrDie<E1>(pf: (e: E) => O.Option<E1>): Stream<R, E1, A>
    /**
     * @rewrite refineOrDieWith_ from "@principia/base/experimental/Stream"
     */
    refineOrDieWith<E1>(pf: (e: E) => O.Option<E1>, f: (e: E) => unknown): Stream<R, E1, A>
    /**
     * @rewrite repeat_ from "@principia/base/experimental/Stream"
     */
    repeat<R1, B>(schedule: Schedule<R1, any, B>): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite repeatEither_ from "@principia/base/experimental/Stream"
     */
    repeatEither<R1, B>(schedule: Schedule<R1, any, B>): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>>
    /**
     * @rewrite repeatElements_ from "@principia/base/experimental/Stream"
     */
    repeatElements<R1, B>(schedule: Schedule<R1, A, B>): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite repeatElementsEither_ from "@principia/base/experimental/Stream"
     */
    repeatElementsEither<R1, B>(schedule: Schedule<R1, A, B>): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>>
    /**
     * @rewrite repeatElementsWith_ from "@principia/base/experimental/Stream"
     */
    repeatElementsWith<R1, B, C, D>(
      schedule: Schedule<R1, A, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite repeatWith_ from "@principia/base/experimental/Stream"
     */
    repeatWith<R1, B, C, D>(
      schedule: Schedule<R1, any, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite right from "@principia/base/experimental/Stream"
     */
    right<R, E, A, B>(this: Stream<R, E, E.Either<A, B>>): Stream<R, O.Option<E>, B>
    /**
     * @rewrite rightOrFail_ from "@principia/base/experimental/Stream"
     */
    rightOrFail<R, E, A, B, E1>(this: Stream<R, E, E.Either<A, B>>, e: () => E1): Stream<R, E | E1, B>
    /**
     * @rewrite run_ from "@principia/base/experimental/Stream"
     */
    run<R2, E2, Z>(sink: Sink<R2, E, A, E2, unknown, Z>): I.IO<R & R2, E2, Z>
    /**
     * @rewriteGetter runCollect from "@principia/base/experimental/Stream"
     */
    runCollect: I.IO<R, E, C.Chunk<A>>
    /**
     * @rewriteGetter runDrain from "@principia/base/experimental/Stream"
     */
    runDrain: I.IO<R, E, void>
    /**
     * @rewrite runForeach_ from "@principia/base/experimental/Stream"
     */
    runForeach<R1, E1>(f: (a: A) => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runForeachChunk_ from "@principia/base/experimental/Stream"
     */
    runForeachChunk<R1, E1>(f: (as: C.Chunk<A>) => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runForeachManaged_ from "@principia/base/experimental/Stream"
     */
    runForeachManaged<R1, E1>(f: (a: A) => I.IO<R1, E1, any>): M.Managed<R & R1, E | E1, void>
    /**
     * @rewrite runInto_ from "@principia/base/experimental/Stream"
     */
    runInto<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      queue: Queue<R1, never, never, unknown, Take<E1, A>, any>
    ): I.IO<R & R1, E | E1, void>
    /**
     * @rewrite runIntoElementsManaged_ from "@principia/base/experimental/Stream"
     */
    runIntoElementsManaged<R1, E1>(
      queue: Queue<R1, unknown, never, never, Ex.Exit<O.Option<E | E1>, A>, unknown>
    ): M.Managed<R & R1, E | E1, void>
    /**
     * @rewrite runIntoHubManaged_ from "@principia/base/experimental/Stream"
     */
    runIntoHubManaged<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      hub: Hub<R1, never, never, unknown, Take<E1, A>, any>
    ): M.Managed<R & R1, E1 | E, void>
    /**
     * @rewrite runIntoManaged_ from "@principia/base/experimental/Stream"
     */
    runIntoManaged<R, E extends E1, A, R1, E1>(
      this: Stream<R, E, A>,
      queue: Queue<R1, never, never, unknown, Take<E1, A>, any>
    ): M.Managed<R & R1, E1 | E, void>

    /**
     * @rewrite runManaged_ from "@principia/base/experimental/Stream"
     */
    runManaged<R2, E2, Z>(sink: Sink<R2, E, A, E2, unknown, Z>): M.Managed<R & R2, E | E2, Z>
    /**
     * @rewrite schedule_ from "@principia/base/experimental/Stream"
     */
    schedule<R1>(schedule: Schedule<R1, A, any>): Stream<R & R1 & Has<Clock>, E, A>
    /**
     * @rewrite scheduleEither_ from "@principia/base/experimental/Stream"
     */
    scheduleEither<R1, B>(schedule: Schedule<R1, A, B>): Stream<R & R1 & Has<Clock>, E, E.Either<A, B>>
    /**
     * @rewrite scheduleWith_ from "@principia/base/experimental/Stream"
     */
    scheduleWith<R1, B, C, D>(
      schedule: Schedule<R1, A, B>,
      f: (a: A) => C,
      g: (b: B) => D
    ): Stream<R & R1 & Has<Clock>, E, C | D>
    /**
     * @rewrite subsumeEither from "@principia/base/experimental/Stream"
     */
    subsumeEither<R, E, E2, A>(this: Stream<R, E, E.Either<E2, A>>): Stream<R, E | E2, A>
    /**
     * @rewrite take_ from "@principia/base/experimental/Stream"
     */
    take(n: number): Stream<R, E, A>
    /**
     * @rewriteGetter toAsyncIterable from "@principia/base/experimental/Stream"
     */
    toAsyncIterable: M.Managed<R, never, AsyncIterable<E.Either<E, A>>>
    /**
     * @rewrite toHub_ from "@principia/base/experimental/Stream"
     */
    toHub(capacity: number): M.Managed<R, never, UHub<Take<E, A>>>
    /**
     * @rewriteGetter toPull from "@principia/base/experimental/Stream"
     */
    toPull: M.Managed<R, never, I.IO<R, O.Option<E>, C.Chunk<A>>>
    /**
     * @rewrite toQueue_ from "@principia/base/experimental/Stream"
     */
    toQueue(capacity?: number): M.Managed<R, never, UQueue<Take<E, A>>>
    /**
     * @rewrite toQueueDropping_ from "@principia/base/experimental/Stream"
     */
    toQueueDropping(capacity?: number): M.Managed<R, never, Dequeue<Take<E, A>>>
    /**
     * @rewrite toQueueOfElements_ from "@principia/base/experimental/Stream"
     */
    toQueueOfElements(capacity?: number): M.Managed<R, never, Dequeue<Ex.Exit<O.Option<E>, A>>>
    /**
     * @rewrite toQueueSliding_ from "@principia/base/experimental/Stream"
     */
    toQueueSliding(capacity?: number): M.Managed<R, never, Dequeue<Take<E, A>>>
    /**
     * @rewrite toQueueUnbounded_ from "@principia/base/experimental/Stream"
     */
    toQueueUnbounded: M.Managed<R, never, UQueue<Take<E, A>>>
    /**
     * @rewrite zip_ from "@principia/base/experimental/Stream"
     */
    zip<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, readonly [A, A1]>
    /**
     * @rewrite zipFirst_ from "@principia/base/experimental/Stream"
     */
    zipFirst<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, A>
    /**
     * @rewrite zipSecond_ from "@principia/base/experimental/Stream"
     */
    zipSecond<R1, E1, A1>(that: Stream<R1, E1, A1>): Stream<R1 & R, E | E1, A1>
    /**
     * @rewrite zipWith_ from "@principia/base/experimental/Stream"
     */
    zipWith<R1, E1, A1, B>(that: Stream<R1, E1, A1>, f: (a: A, a1: A1) => B): Stream<R1 & R, E | E1, B>
    /**
     * @rewriteGetter zipWithIndex from "@principia/base/experimental/Stream"
     */
    zipWithIndex: Stream<R, E, readonly [A, number]>
  }
}
