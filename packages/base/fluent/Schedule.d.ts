import type { Either } from '@principia/base/Either'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Random } from '@principia/base/Random'
import type * as Sc from '@principia/base/Schedule'
import type { Decision } from '@principia/base/Schedule/Decision'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Schedule: ScheduleStaticOps
  export interface Schedule<R, I, O> extends Sc.Schedule<R, I, O> {}
}

interface ScheduleStaticOps {
  /**
   * @rewriteStatic exponential from "@principia/base/Schedule"
   */
  exponential: typeof Sc.exponential
  /**
   * @rewriteStatic fixed from "@principia/base/Schedule"
   */
  fixed: typeof Sc.fixed
  /**
   * @rewriteStatic forever from "@principia/base/Schedule"
   */
  forever: typeof Sc.forever
  /**
   * @rewriteStatic fromFunction from "@principia/base/Schedule"
   */
  fromFunction: typeof Sc.fromFunction
  /**
   * @rewriteStatic identity from "@principia/base/Schedule"
   */
  identity: typeof Sc.identity
  /**
   * @rewriteStatic linear from "@principia/base/Schedule"
   */
  linear: typeof Sc.linear
  /**
   * @rewriteStatic once from "@principia/base/Schedule"
   */
  once: typeof Sc.once
  /**
   * @rewriteStatic recur from "@principia/base/Schedule"
   */
  recur: typeof Sc.recur
  /**
   * @rewriteStatic recurUntil from "@principia/base/Schedule"
   */
  recurUntil: typeof Sc.recurUntil
  /**
   * @rewriteStatic recurUntilEqual from "@principia/base/Schedule"
   */
  recurUntilEqual: typeof Sc.recurUntilEqual
  /**
   * @rewriteStatic recurUntilIO from "@principia/base/Schedule"
   */
  recurUntilIO: typeof Sc.recurUntilIO
  /**
   * @rewriteStatic recurWhile from "@principia/base/Schedule"
   */
  recurWhile: typeof Sc.recurWhile
  /**
   * @rewriteStatic recurWhileEqual from "@principia/base/Schedule"
   */
  recurWhileEqual: typeof Sc.recurWhileEqual
  /**
   * @rewriteStatic recurWhileIO from "@principia/base/Schedule"
   */
  recurWhileIO: typeof Sc.recurWhileIO
  /**
   * @rewriteStatic spaced from "@principia/base/Schedule"
   */
  spaced: typeof Sc.spaced
  /**
   * @rewriteStatic stop from "@principia/base/Schedule"
   */
  stop: typeof Sc.stop
  /**
   * @rewriteStatic unfold from "@principia/base/Schedule"
   */
  unfold: typeof Sc.unfold
  /**
   * @rewriteStatic unfoldIO from "@principia/base/Schedule"
   */
  unfoldIO: typeof Sc.unfoldIO
  /**
   * @rewriteStatic windowed from "@principia/base/Schedule"
   */
  windowed: typeof Sc.windowed
}

declare module '@principia/base/Schedule/core' {
  export interface Schedule<R, I, O> {
    /**
     * @rewrite addDelay_ from "@principia/base/Schedule"
     */
    addDelay<R, I, O>(this: Schedule<R, I, O>, f: (o: O) => number): Schedule<R, I, O>
    /**
     * @rewrite addDelayIO_ from "@principia/base/Schedule"
     */
    addDelayIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, number>): Schedule<R & R1, I, O>
    /**
     * @rewrite andThen_ from "@principia/base/Schedule"
     */
    andThenEither<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, I & I1, Either<O, O1>>
    /**
     * @rewrite as_ from "@principia/base/Schedule"
     */
    as<R, I, O, O1>(this: Schedule<R, I, O>, o: O1): Schedule<R, I, O1>
    /**
     * @rewriteGetter asUnit from "@principia/base/Schedule"
     */
    asUnit: Schedule<R, I, void>
    /**
     * @rewrite check_ from "@principia/base/Schedule"
     */
    check<R, I, O>(this: Schedule<R, I, O>, test: (i: I, o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite checkIO_ from "@principia/base/Schedule"
     */
    checkIO<R, I, O, R1>(
      this: Schedule<R, I, O>,
      test: (i: I, o: O) => I.IO<R1, never, boolean>
    ): Schedule<R & R1, I, O>
    /**
     * @rewrite choose_ from "@principia/base/Schedule"
     */
    choose<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, Either<I, I1>, Either<O, O1>>
    /**
     * @rewrite chooseMerge_ from "@principia/base/Schedule"
     */
    chooseMerge<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, Either<I, I1>, O1 | O>
    /**
     * @rewriteGetter collectAll from "@principia/base/Schedule"
     */
    collectAll: Schedule<R, I, readonly O[]>
    /**
     * @rewrite compose_ from "@principia/base/Schedule"
     */
    compose<R, I, O, R1, I1, O1>(this: Schedule<R, I, O>, that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O | O1>
    /**
     * @rewrite delayed_ from "@principia/base/Schedule"
     */
    delayed<R, I, O>(this: Schedule<R, I, O>, f: (d: number) => number): Schedule<R, I, O>
    /**
     * @rewrite delayedFrom_ from "@principia/base/Schedule"
     */
    delayedFrom<R, I>(this: Schedule<R, I, number>): Schedule<R, I, number>
    /**
     * @rewrite delayedIO_ from "@principia/base/Schedule"
     */
    delayedIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (d: number) => I.IO<R1, never, number>): Schedule<R & R1, I, O>
    /**
     * @rewrite ensuring_ from "@principia/base/Schedule"
     */
    ensuring<R, I, O, R1>(this: Schedule<R, I, O>, finalizer: I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite fold_ from "@principia/base/Schedule"
     */
    fold<R, I, O, B>(this: Schedule<R, I, O>, b: B, f: (b: B, o: O) => B): Schedule<R, I, B>
    /**
     * @rewrite foldIO_ from "@principia/base/Schedule"
     */
    foldIO<R, I, O, R1, B>(this: Schedule<R, I, O>, b: B, f: (b: B, o: O) => I.IO<R1, never, B>): Schedule<R & R1, I, B>
    /**
     * @rewriteConstraint fst from "@principia/base/Schedule"
     */
    fst<A>(): Schedule<R, readonly [I, A], readonly [O, A]>
    /**
     * @rewrite give_ from "@principia/base/Schedule"
     */
    give<R, I, O>(this: Schedule<R, I, O>, r: R): Schedule<unknown, I, O>
    /**
     * @rewrite gives_ from "@principia/base/Schedule"
     */
    gives<R, I, O, R1>(this: Schedule<R, I, O>, r: (_: R1) => R): Schedule<R1, I, O>
    /**
     * @rewrite intersect_ from "@principia/base/Schedule"
     */
    intersect<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, I & I1, readonly [O, O1]>
    /**
     * @rewrite intersectInOut_ from "@principia/base/Schedule"
     */
    intersectInOut<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, readonly [I, I1], readonly [O, O1]>
    /**
     * @rewrite intersectMap_ from "@principia/base/Schedule"
     */
    intersectMap<R, I, O, R1, I1, O1, O2>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>,
      f: (o: O, o1: O1) => O2
    ): Schedule<R & R1, I & I1, O2>
    /**
     * @rewrite intersectl_ from "@principia/base/Schedule"
     */
    intersectl<R, I, O, R1, I1, O1>(this: Schedule<R, I, O>, that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O>
    /**
     * @rewrite intersectr_ from "@principia/base/Schedule"
     */
    intersectr<R, I, O, R1, I1, O1>(this: Schedule<R, I, O>, that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O1>
    /**
     * @rewrite jittered_ from "@principia/base/Schedule"
     */
    jittered<R, I, O>(
      this: Schedule<R, I, O>,
      { max, min }?: { max?: number, min?: number }
    ): Schedule<R & Has<Random>, I, O>
    /**
     * @rewriteConstraint left from "@principia/base/Schedule"
     */
    left<A>(): Schedule<R, Either<I, A>, Either<O, A>>
    /**
     * @rewrite map_ from "@principia/base/Schedule"
     */
    map<R, I, O, B>(this: Schedule<R, I, O>, f: (a: O) => B): Schedule<R, I, B>
    /**
     * @rewrite mapIO_ from "@principia/base/Schedule"
     */
    mapIO<R, I, O, R1, O1>(this: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, O1>): Schedule<R & R1, I, O1>
    /**
     * @rewrite modifyDelay_ from "@principia/base/Schedule"
     */
    modifyDelay<R, I, O>(this: Schedule<R, I, O>, f: (o: O, d: number) => number): Schedule<R, I, O>
    /**
     * @rewrite modifyDelayIO_ from "@principia/base/Schedule"
     */
    modifyDelayIO<R, I, O, R1>(
      this: Schedule<R, I, O>,
      f: (o: O, d: number) => I.IO<R1, never, number>
    ): Schedule<R & R1, I, O>
    /**
     * @rewrite onDecision_ from "@principia/base/Schedule"
     */
    onDecision<R, I, O, R1>(
      this: Schedule<R, I, O>,
      f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
    ): Schedule<R & R1, I, O>
    /**
     * @rewrite reconsider_ from "@principia/base/Schedule"
     */
    reconsider<R, I, O, O1>(
      this: Schedule<R, I, O>,
      f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>
    ): Schedule<R, I, O1>
    /**
     * @rewrite reconsiderIO_ from "@principia/base/Schedule"
     */
    reconsiderIO<R, I, O, R1, O1>(
      this: Schedule<R, I, O>,
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
    resetWhen<R, I, O>(this: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewriteConstraint right from "@principia/base/Schedule"
     */
    right<A>(): Schedule<R, Either<A, I>, Either<A, O>>
    /**
     * @rewrite run_ from "@principia/base/Schedule"
     */
    run<R, I, O>(this: Schedule<R, I, O>, now: number, i: Iterable<I>): I.IO<R, never, readonly O[]>
    /**
     * @rewrite tapInput_ from "@principia/base/Schedule"
     */
    tapInput<R, I, O, R1>(this: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite tapOutput_ from "@principia/base/Schedule"
     */
    tapOutput<R, I, O, R1>(this: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, any>): Schedule<R & R1, I, O>
    /**
     * @rewrite union_ from "@principia/base/Schedule"
     */
    union<R, I, O, R1, I1, O1>(
      this: Schedule<R, I, O>,
      that: Schedule<R1, I1, O1>
    ): Schedule<R & R1, I & I1, readonly [O, O1]>
    /**
     * @rewrite untilInput_ from "@principia/base/Schedule"
     */
    untilInput<R, I, O>(this: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O>
    /**
     * @rewrite untilInputIO_ from "@principia/base/Schedule"
     */
    untilInputIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite untilOutput_ from "@principia/base/Schedule"
     */
    untilOutput<R, I, O>(this: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite untilOutputIO_ from "@principia/base/Schedule"
     */
    untilOutputIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite whileInput_ from "@principia/base/Schedule"
     */
    whileInput<R, I, O>(this: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O>
    /**
     * @rewrite whileInputIO_ from "@principia/base/Schedule"
     */
    whileInputIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
    /**
     * @rewrite whileOutput_ from "@principia/base/Schedule"
     */
    whileOutput<R, I, O>(this: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O>
    /**
     * @rewrite whileOutputIO_ from "@principia/base/Schedule"
     */
    whileOutputIO<R, I, O, R1>(this: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, boolean>): Schedule<R & R1, I, O>
  }
}
