import type { Either } from '@principia/base/Either'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Random } from '@principia/base/Random'
import type { Decision } from '@principia/base/Schedule/Decision'

declare module '@principia/base/Schedule/core' {
  export interface Schedule<R, I, O> {
    /**
     * @rewrite addDelay_ from "@principia/base/Schedule"
     */
    addDelay(f: (o: O) => number): Schedule<R, I, O>
    /**
     * @rewrite addDelayIO_ from "@principia/base/Schedule"
     */
    addDelayIO<R1>(f: (o: O) => I.IO<R1, never, number>): Schedule<R & R1, I, O>
    /**
     * @rewrite andThen_ from "@principia/base/Schedule"
     */
    andThen<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O | O1>
    /**
     * @rewrite andThen_ from "@principia/base/Schedule"
     */
    andThenEither<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, Either<O, O1>>
    /**
     * @rewrite as_ from "@principia/base/Schedule"
     */
    as<O1>(o: O1): Schedule<R, I, O1>
    /**
     * @rewriteGetter asUnit from "@principia/base/Schedule"
     */
    asUnit: Schedule<R, I, void>
    /**
     * @rewrite check_ from "@principia/base/Schedule"
     */
    check(test: (i: I, o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite checkIO_ from "@principia/base/Schedule"
     */
    checkIO<R1>(test: (i: I, o: O) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite choose_ from "@principia/base/Schedule"
     */
    choose<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, Either<I, I1>, Either<O, O1>>
    /**
     * @rewrite chooseMerge_ from "@principia/base/Schedule"
     */
    chooseMerge<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, Either<I, I1>, O1 | O>
    /**
     * @rewriteGetter collectAll from "@principia/base/Schedule"
     */
    collectAll: Schedule<R, I, readonly O[]>
    /**
     * @rewrite compose_ from "@principia/base/Schedule"
     */
    compose<R1, O1>(that: Schedule<R1, O, O1>): Schedule<R & R1, I, O1>
    /**
     * @rewrite delayed_ from "@principia/base/Schedule"
     */
    delayed(f: (d: number) => number): Schedule<R, I, O>
    /**
     * @rewrite delayedFrom_ from "@principia/base/Schedule"
     */
    delayedFrom<R, I>(this: Schedule<R, I, number>): Schedule<R, I, number>
    /**
     * @rewrite delayedIO_ from "@principia/base/Schedule"
     */
    delayedIO<R1>(f: (d: number) => I.IO<R1, never, number>): Schedule<R & R1, I, O>
    /**
     * @rewrite ensuring_ from "@principia/base/Schedule"
     */
    ensuring<R1>(finalizer: I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite fold_ from "@principia/base/Schedule"
     */
    fold<B>(b: B, f: (b: B, o: O) => B): Schedule<R, I, B>
    /**
     * @rewrite foldIO_ from "@principia/base/Schedule"
     */
    foldIO<R1, B>(b: B, f: (b: B, o: O) => I.IO<R1, never, B>): Schedule<R & R1, I, B>
    /**
     * @rewriteConstraint fst from "@principia/base/Schedule"
     */
    fst<A>(): Schedule<R, readonly [I, A], readonly [O, A]>
    /**
     * @rewrite giveAll_ from "@principia/base/Schedule"
     */
    giveAll<R>(r: R): Schedule<unknown, I, O>
    /**
     * @rewrite gives_ from "@principia/base/Schedule"
     */
    gives<R1>(r: (_: R1) => R): Schedule<R1, I, O>
    /**
     * @rewrite intersect_ from "@principia/base/Schedule"
     */
    intersect<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]>
    /**
     * @rewrite intersectInOut_ from "@principia/base/Schedule"
     */
    intersectInOut<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, readonly [I, I1], readonly [O, O1]>
    /**
     * @rewrite intersectMap_ from "@principia/base/Schedule"
     */
    intersectMap<R1, I1, O1, O2>(that: Schedule<R1, I1, O1>, f: (o: O, o1: O1) => O2): Schedule<R & R1, I & I1, O2>
    /**
     * @rewrite intersectl_ from "@principia/base/Schedule"
     */
    intersectl<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O>
    /**
     * @rewrite intersectr_ from "@principia/base/Schedule"
     */
    intersectr<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O1>
    /**
     * @rewrite jittered_ from "@principia/base/Schedule"
     */
    jittered({ max, min }?: { max?: number, min?: number }): Schedule<R & Has<Random>, I, O>
    /**
     * @rewriteConstraint left from "@principia/base/Schedule"
     */
    left<A>(): Schedule<R, Either<I, A>, Either<O, A>>
    /**
     * @rewrite map_ from "@principia/base/Schedule"
     */
    map<B>(f: (a: O) => B): Schedule<R, I, B>
    /**
     * @rewrite mapIO_ from "@principia/base/Schedule"
     */
    mapIO<R1, O1>(f: (o: O) => I.IO<R1, never, O1>): Schedule<R & R1, I, O1>
    /**
     * @rewrite modifyDelay_ from "@principia/base/Schedule"
     */
    modifyDelay(f: (o: O, d: number) => number): Schedule<R, I, O>
    /**
     * @rewrite modifyDelayIO_ from "@principia/base/Schedule"
     */
    modifyDelayIO<R1>(f: (o: O, d: number) => I.IO<R1, never, number>): Schedule<R & R1, I, O>
    /**
     * @rewrite onDecision_ from "@principia/base/Schedule"
     */
    onDecision<R1>(f: (d: Decision<R, I, O>) => I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite reconsider_ from "@principia/base/Schedule"
     */
    reconsider<O1>(f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>): Schedule<R, I, O1>
    /**
     * @rewrite reconsiderIO_ from "@principia/base/Schedule"
     */
    reconsiderIO<R1, O1>(
      f: (d: Decision<R, I, O>) => I.IO<R1, never, Either<O1, readonly [O1, number]>>
    ): Schedule<R & R1, I, O1>
    /**
     * @rewriteGetter repeat from "@principia/base/Schedule"
     */
    repeat: Schedule<R, I, O>
    /**
     * @rewriteGetter repetitions from "@principia/base/Schedule"
     */
    repetitions: Schedule<R, I, number>
    /**
     * @rewrite resetWhen_ from "@principia/base/Schedule"
     */
    resetWhen(f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewriteConstraint right from "@principia/base/Schedule"
     */
    right<A>(): Schedule<R, Either<A, I>, Either<A, O>>
    /**
     * @rewrite run_ from "@principia/base/Schedule"
     */
    run(now: number, i: Iterable<I>): I.IO<R, never, readonly O[]>
    /**
     * @rewrite tapInput_ from "@principia/base/Schedule"
     */
    tapInput<R1>(f: (i: I) => I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite tapOutput_ from "@principia/base/Schedule"
     */
    tapOutput<R1>(f: (o: O) => I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite union_ from "@principia/base/Schedule"
     */
    union<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]>
    /**
     * @rewrite untilInput_ from "@principia/base/Schedule"
     */
    untilInput(f: (i: I) => boolean): Schedule<R, I, O>
    /**
     * @rewrite untilInputIO_ from "@principia/base/Schedule"
     */
    untilInputIO<R1>(f: (i: I) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite untilOutput_ from "@principia/base/Schedule"
     */
    untilOutput(f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite untilOutputIO_ from "@principia/base/Schedule"
     */
    untilOutputIO<R1>(f: (o: O) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite whileInput_ from "@principia/base/Schedule"
     */
    whileInput(f: (i: I) => boolean): Schedule<R, I, O>
    /**
     * @rewrite whileInputIO_ from "@principia/base/Schedule"
     */
    whileInputIO<R1>(f: (i: I) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite whileOutput_ from "@principia/base/Schedule"
     */
    whileOutput(f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite whileOutputIO_ from "@principia/base/Schedule"
     */
    whileOutputIO<R1>(f: (o: O) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
  }
}
