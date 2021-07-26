import type { Cause } from '@principia/base/Cause'
import type { Clock } from '@principia/base/Clock'
import type { Either } from '@principia/base/Either'
import type { NoSuchElementError } from '@principia/base/Error'
import type { Exit } from '@principia/base/Exit'
import type { FiberContext } from '@principia/base/Fiber'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type * as M from '@principia/base/Managed'
import type { Option } from '@principia/base/Option'
import type { Erase } from '@principia/base/prelude'
import type { Schedule } from '@principia/base/Schedule'

declare module '@principia/base/Managed/core' {
  export interface Managed<R, E, A> {
    /**
     * @rewrite as_ from "@principia/base/Managed"
     * @trace call
     */
    ['$>']<R, E, A, B>(this: M.Managed<R, E, A>, b: B): M.Managed<R, E, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/Managed"
     * @trace call
     */
    ['&>']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite crossSecond_ from "@principia/base/Managed"
     * @trace call
     */
    ['*>']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite map_ from "@principia/base/Managed"
     * @trace 0
     */
    ['<$>']<R, E, A, B>(this: M.Managed<R, E, A>, f: (a: A) => B): M.Managed<R, E, B>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/Managed"
     * @trace call
     */
    ['<&']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite crossPar_ from "@principia/base/Managed"
     * @trace call
     */
    ['<&>']<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/Managed"
     * @trace call
     */
    ['<*']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite cross_ from "@principia/base/Managed"
     * @trace call
     */
    ['<*>']<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite chain_ from "@principia/base/Managed"
     * @trace 0
     */
    ['>>=']<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      f: (a: A) => M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite andThen_ from "@principia/base/Managed"
     * @trace call
     */
    andThen<R, E, A, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<A, E1, B>): M.Managed<R, E | E1, B>

    /**
     * @rewrite as_ from "@principia/base/Managed"
     * @trace 0
     */
    as<R, E, A, B>(this: M.Managed<R, E, A>, b: B): M.Managed<R, E, B>

    /**
     * @rewrite asLazy_ from "@principia/base/Managed"
     * @trace 0
     */
    asLazy<R, E, A, B>(this: M.Managed<R, E, A>, b: () => B): M.Managed<R, E, B>

    /**
     * @rewriteGetter asSome from "@principia/base/Managed"
     * @trace getter
     */
    asSome: M.Managed<R, E, Option<A>>

    /**
     * @rewriteGetter asSomeError from "@principia/base/Managed"
     * @trace getter
     */
    asSomeError: M.Managed<R, Option<E>, A>

    /**
     * @rewriteGetter asUnit from "@principia/base/Managed"
     * @trace getter
     */
    asUnit: M.Managed<R, E, void>

    /**
     * @rewrite bimap_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    bimap<R, E, A, E1, B>(this: M.Managed<R, E, A>, f: (e: E) => E1, g: (a: A) => B): M.Managed<R, E1, B>

    /**
     * @rewrite catchAll_ from "@principia/base/Managed"
     * @trace 0
     */
    catchAll<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      f: (e: E) => M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E1, A | B>

    /**
     * @rewrite catchAllCause_ from "@principia/base/Managed"
     * @trace 0
     */
    catchAllCause<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      f: (e: Cause<E>) => M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E1, A | B>

    /**
     * @rewrite catchSome_ from "@principia/base/Managed"
     * @trace 0
     */
    catchSome<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      pf: (e: E) => Option<Managed<R1, E1, B>>
    ): M.Managed<R & R1, E | E1, A | B>

    /**
     * @rewrite catchSomeCause_ from "@principia/base/Managed"
     * @trace 0
     */
    catchSomeCause<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      pf: (cause: Cause<E>) => Option<Managed<R1, E1, B>>
    ): M.Managed<R & R1, E | E1, A | B>

    /**
     * @rewrite chain_ from "@principia/base/Managed"
     * @trace 0
     */
    chain<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, f: (a: A) => M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite chainError_ from "@principia/base/Managed"
     * @trace 0
     */
    chainError<R, E, A, R1, E1>(this: M.Managed<R, E, A>, f: (e: E) => M.URManaged<R1, E1>): M.Managed<R & R1, E1, A>

    /**
     * @rewrite collect_ from "@principia/base/Managed"
     * @trace 1
     */
    collect<R, E, A, E1, B>(this: M.Managed<R, E, A>, e: E1, pf: (a: A) => Option<B>): M.Managed<R, E | E1, B>

    /**
     * @rewrite collectManaged_ from "@principia/base/Managed"
     * @trace 1
     */
    collectManaged<R, E, A, E1, R2, E2, B>(
      this: M.Managed<R, E, A>,
      e: E1,
      pf: (a: A) => Option<M.Managed<R2, E2, B>>
    ): M.Managed<R & R2, E | E1 | E2, B>

    /**
     * @rewrite compose_ from "@principia/base/Managed"
     * @trace call
     */
    compose<R, E, A, R1, E1>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, R>): M.Managed<R1, E | E1, A>

    /**
     * @rewrite cross_ from "@principia/base/Managed"
     * @trace call
     */
    cross<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/Managed"
     * @trace call
     */
    crossFirst<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/Managed"
     * @trace call
     */
    crossFirstPar<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, A>

    /**
     *
     * @rewrite crossPar_ from "@principia/base/Managed"
     * @trace call
     */
    crossPar<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossSecond_ from "@principia/base/Managed"
     * @trace call
     */
    crossSecond<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/Managed"
     * @trace call
     */
    crossSecondPar<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite crossWith_ from "@principia/base/Managed"
     * @trace 1
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>,
      f: (a: A, b: B) => C
    ): M.Managed<R & R1, E | E1, C>

    /**
     * @rewrite crossWithPar_ from "@principia/base/Managed"
     * @trace 1
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>,
      f: (a: A, b: B) => C
    ): M.Managed<R & R1, E | E1, C>

    /**
     * @rewriteGetter either from "@principia/base/Managed"
     * @trace getter
     */
    either: M.Managed<R, never, Either<E, A>>
    /**
     * @rewrite ensuring_ from "@principia/base/Managed"
     * @trace call
     */
    ensuring<R, E, A, R1>(this: M.Managed<R, E, A>, finalizer: I.IO<R1, never, any>): M.Managed<R & R1, E, A>

    /**
     * @rewrite ensuringFirst_ from "@principia/base/Managed"
     * @trace call
     */
    ensuringFirst<R, E, A, R1>(this: M.Managed<R, E, A>, finalizer: I.IO<R1, never, any>): M.Managed<R & R1, E, A>

    /**
     * @rewriteGetter eventually from "@principia/base/Managed"
     * @trace getter
     */
    eventually: M.Managed<R, never, A>

    /**
     * @rewriteGetter fork from "@principia/base/Managed"
     * @trace getter
     */
    fork: M.Managed<R, never, FiberContext<E, A>>

    /**
     * @rewrite get from "@principia/base/Managed"
     * @trace call
     */
    get<R, A>(this: M.Managed<R, never, Option<A>>): M.Managed<R, Option<never>, A>

    /**
     * @rewrite give_ from "@principia/base/Managed"
     * @trace call
     */
    give<R, E, A, R0>(this: M.Managed<R, E, A>, env: R0): M.Managed<Erase<R, R0>, E, A>

    /**
     * @rewrite giveLayer_ from "@principia/base/Managed"
     * @trace call
     */
    give<R, E, A, R1, E1, A1>(this: Managed<R, E, A>, layer: Layer<R1, E1, A1>): M.Managed<Erase<R & R1, A1>, E | E1, A>

    /**
     * @rewrite giveAll_ from "@principia/base/Managed"
     * @trace call
     */
    giveAll<R, E, A>(this: M.Managed<R, E, A>, env: R): M.Managed<unknown, E, A>

    /**
     * @rewrite gives_ from "@principia/base/Managed"
     * @trace 0
     */
    gives<R, E, A, R0>(this: M.Managed<R, E, A>, f: (r0: R0) => R): M.Managed<R0, E, A>

    /**
     * @rewrite ifManaged_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    ifManaged<R, E, R1, E1, B, R2, E2, C>(
      this: M.Managed<R, E, boolean>,
      onTrue: M.Managed<R1, E1, B>,
      onFalse: M.Managed<R2, E2, C>
    ): M.Managed<R & R1 & R2, E | E1 | E2, B | C>

    /**
     * @rewriteGetter ignore from "@principia/base/Managed"
     * @trace getter
     */
    ignore: M.Managed<R, never, void>

    /**
     * @rewriteGetter ignoreReleaseFailures from "@principia/base/Managed"
     * @trace getter
     */
    ignoreReleaseFailures: M.Managed<R, E, A>

    /**
     * @rewriteGetter isFailure from "@principia/base/Managed"
     * @trace getter
     */
    isFailure: M.Managed<R, never, boolean>

    /**
     * @rewriteGetter isSuccess from "@principia/base/Managed"
     * @trace getter
     */
    isSuccess: M.Managed<R, never, boolean>

    /**
     * @rewrite join_ from "@principia/base/Managed"
     * @trace call
     */
    join<R, E, A, R1, E1, A1>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, A1>
    ): M.Managed<Either<R, R1>, E | E1, A | A1>

    /**
     * @rewrite joinEither_ from "@principia/base/Managed"
     * @trace call
     */
    joinEither<R, E, A, R1, E1, A1>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, A1>
    ): M.Managed<Either<R, R1>, E | E1, Either<A, A1>>

    /**
     * @rewrite map_ from "@principia/base/Managed"
     * @trace 0
     */
    map<R, E, A, B>(this: M.Managed<R, E, A>, f: (a: A) => B): M.Managed<R, E, B>

    /**
     * @rewrite mapError_ from "@principia/base/Managed"
     * @trace 0
     */
    mapError<R, E, A, E1>(this: M.Managed<R, E, A>, f: (e: E) => E1): M.Managed<R, E1, A>

    /**
     * @rewrite mapErrorCause_ from "@principia/base/Managed"
     * @trace 0
     */
    mapErrorCause<R, E, A, E1>(this: M.Managed<R, E, A>, f: (e: Cause<E>) => Cause<E1>): M.Managed<R, E1, A>

    /**
     * @rewrite mapIO_ from "@principia/base/Managed"
     * @trace 0
     */
    mapIO<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite mapTry_ from "@principia/base/Managed"
     * @trace 0
     */
    mapTry<R, E, A, B>(this: M.Managed<R, E, A>, f: (a: A) => B): M.Managed<R, unknown, B>

    /**
     * @rewrite mapTryCatch_ from "@principia/base/Managed"
     * @trace 0
     */
    mapTryCatch<R, E, A, E1, B>(
      this: M.Managed<R, E, A>,
      f: (a: A) => B,
      onThrow: (error: unknown) => E1
    ): M.Managed<R, E | E1, B>

    /**
     * @rewrite match_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    match<R, E, A, B, C>(
      this: M.Managed<R, E, A>,
      onFailure: (e: E) => B,
      onSuccess: (a: A) => C
    ): M.Managed<R, never, B | C>

    /**
     * @rewrite matchCause_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    matchCause<R, E, A, B, C>(
      this: M.Managed<R, E, A>,
      onFailure: (cause: Cause<E>) => B,
      onSuccess: (a: A) => C
    ): M.Managed<R, never, B | C>

    /**
     * @rewrite matchCauseManaged_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    matchCauseManaged<R, E, A, R1, E1, B, R2, E2, C>(
      this: M.Managed<R, E, A>,
      onFailure: (cause: Cause<E>) => M.Managed<R1, E1, B>,
      onSuccess: (a: A) => M.Managed<R2, E2, C>
    ): M.Managed<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewrite matchManaged_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    matchManaged<R, E, A, R1, E1, B, R2, E2, C>(
      this: M.Managed<R, E, A>,
      onFailure: (e: E) => M.Managed<R1, E1, B>,
      onSuccess: (a: A) => M.Managed<R2, E2, C>
    ): M.Managed<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewriteGetter memoize from "@principia/base/Managed"
     * @trace getter
     */
    memoize: M.UManaged<M.Managed<R, E, A>>

    /**
     * @rewriteGetter merge from "@principia/base/Managed"
     * @trace getter
     */
    merge: M.Managed<R, never, E | A>

    /**
     * @rewrite none from "@principia/base/Managed"
     * @trace call
     */
    none<R, E, A>(this: M.Managed<R, E, Option<A>>): M.Managed<R, Option<E>, void>

    /**
     * @rewriteGetter option from "@principia/base/Managed"
     * @trace getter
     */
    option: M.Managed<R, never, Option<A>>

    /**
     * @rewrite optional from "@principia/base/Managed"
     * @trace call
     */
    optional<R, E, A>(this: M.Managed<R, Option<E>, A>): M.Managed<R, E, Option<A>>

    /**
     * @rewriteGetter orDie from "@principia/base/Managed"
     * @trace getter
     */
    orDie: M.Managed<R, never, A>

    /**
     * @rewrite orDieWith_ from "@principia/base/Managed"
     * @trace 0
     */
    orDieWith<R, E, A>(this: M.Managed<R, E, A>, f: (e: E) => unknown): M.Managed<R, never, A>

    /**
     * @rewrite orElse_ from "@principia/base/Managed"
     * @trace 0
     */
    orElse<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: () => M.Managed<R1, E1, B>): M.Managed<R & R1, E1, A | B>

    /**
     * @rewrite orElseEither_ from "@principia/base/Managed"
     * @trace 0
     */
    orElseEither<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: () => M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E1, Either<B, A>>

    /**
     * @rewrite orElseFail_ from "@principia/base/Managed"
     * @trace 0
     */
    orElseFail<R, E, A, E1>(this: M.Managed<R, E, A>, e: () => E1): M.Managed<R, E | E1, A>

    /**
     * @rewrite orElseOptional_ from "@principia/base/Managed"
     * @trace 0
     */
    orElseOptional<R, E, A, R1, E1, B>(
      this: M.Managed<R, Option<E>, A>,
      that: () => M.Managed<R1, Option<E1>, B>
    ): M.Managed<R & R1, Option<E | E1>, A | B>

    /**
     * @rewrite orElseSucceed_ from "@principia/base/Managed"
     * @trace 0
     */
    orElseSucceed<R, E, A, A1>(this: M.Managed<R, E, A>, a: () => A1): M.Managed<R, E, A | A1>

    /**
     * @rewriteGetter preallocate from "@principia/base/Managed"
     * @trace getter
     */
    preallocate: I.IO<R, E, M.Managed<unknown, never, A>>

    /**
     * @rewriteGetter preallocateManaged from "@principia/base/Managed"
     * @trace getter
     */
    preallocateManaged: M.Managed<R, E, M.Managed<unknown, never, A>>

    /**
     * @rewrite refineOrDie_ from "@principia/base/Managed"
     * @trace 0
     */
    refineOrDie<R, E, A, E1>(this: M.Managed<R, E, A>, pf: (e: E) => Option<E1>): M.Managed<R, E1, A>

    /**
     * @rewrite refineOrDieWith_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    refineOrDieWith<R, E, A, E1>(
      this: M.Managed<R, E, A>,
      pf: (e: E) => Option<E1>,
      f: (e: E) => unknown
    ): M.Managed<R, E1, A>

    /**
     * @rewrite reject_ from "@principia/base/Managed"
     * @trace 0
     */
    reject<R, E, A, E1>(this: M.Managed<R, E, A>, pf: (a: A) => Option<E1>): M.Managed<R, E | E1, A>

    /**
     * @rewrite rejectManaged_ from "@principia/base/Managed"
     * @trace 0
     */
    rejectManaged<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      pf: (a: A) => Option<M.Managed<R1, E1, E1>>
    ): M.Managed<R & R1, E | E1, A>

    /**
     * @rewriteGetter release from "@principia/base/Managed"
     * @trace getter
     */
    release: M.Managed<R, E, A>

    /**
     * @rewrite require_ from "@principia/base/Managed"
     * @trace 0
     */
    require<R, E, A>(this: M.Managed<R, E, A>, error: () => E): M.Managed<R, E, A>

    /**
     * @rewriteGetter result from "@principia/base/Managed"
     * @trace getter
     */
    result: M.Managed<R, never, Exit<E, A>>

    /**
     * @rewrite retry_ from "@principia/base/Managed"
     * @trace call
     */
    retry<R, E, A, R1, O>(this: M.Managed<R, E, A>, schedule: Schedule<R1, E, O>): M.Managed<R & R1 & Has<Clock>, E, A>

    /**
     * @rewriteGetter sandbox from "@principia/base/Managed"
     * @trace getter
     */
    sandbox: M.Managed<R, Cause<E>, A>

    /**
     * @rewrite sandboxWith_ from "@principia/base/Managed"
     * @trace 0
     */
    sandboxWith<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      f: (_: M.Managed<R, Cause<E>, A>) => M.Managed<R1, Cause<E1>, B>
    ): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite someOrElse_ from "@principia/base/Managed"
     * @trace 0
     */
    someOrElse<R, E, A, B>(this: M.Managed<R, E, Option<A>>, onNone: () => B): M.Managed<R, E, A | B>

    /**
     * @rewrite someOrElseManaged_ from "@principia/base/Managed"
     * @trace call
     */
    someOrElseManaged<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, Option<A>>,
      onNone: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, A | B>

    /**
     * @rewrite someOrFail_ from "@principia/base/Managed"
     * @trace call
     */
    someOrFail<R, E, A>(this: M.Managed<R, E, Option<A>>): M.Managed<R, E | NoSuchElementError, A>

    /**
     * @rewrite someOrFailWith_ from "@principia/base/Managed"
     * @trace call
     */
    someOrFailWith<R, E, A, E1>(this: M.Managed<R, E, Option<A>>, onNone: () => E1): M.Managed<R, E | E1, A>

    /**
     * @rewrite subsumeEither from "@principia/base/Managed"
     * @trace call
     */
    subsumeEither<R, E, E1, A>(this: M.Managed<R, E, Either<E1, A>>): M.Managed<R, E | E1, A>

    /**
     * @rewriteGetter swap from "@principia/base/Managed"
     * @trace getter
     */
    swap: M.Managed<R, A, E>

    /**
     * @rewrite swapWith_ from "@principia/base/Managed"
     * @trace 0
     */
    swapWith<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      f: (_: M.Managed<R, A, E>) => M.Managed<R1, B, E1>
    ): M.Managed<R1, E1, B>

    /**
     * @rewrite tap_ from "@principia/base/Managed"
     * @trace 0
     */
    tap<R, E, A, R1, E1>(this: M.Managed<R, E, A>, f: (a: A) => M.Managed<R1, E1, any>): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite tapBoth_ from "@principia/base/Managed"
     * @trace 0
     * @trace 2
     */
    tapBoth<R, E, A, R1, E1, R2, E2>(
      this: M.Managed<R, E, A>,
      f: (e: E) => M.Managed<R1, E1, any>,
      g: (a: A) => M.Managed<R2, E2, any>
    ): M.Managed<R & R1 & R2, E | E1 | E2, A>

    /**
     * @rewrite tapCause_ from "@principia/base/Managed"
     * @trace 0
     */
    tapCause<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      f: (cause: Cause<E>) => M.Managed<R1, E1, any>
    ): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite tapError_ from "@principia/base/Managed"
     * @trace 0
     */
    tapError<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      f: (e: E) => M.Managed<R1, E1, any>
    ): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite tapIO_ from "@principia/base/Managed"
     * @trace 0
     */
    tapIO<R, E, A, R1, E1>(this: M.Managed<R, E, A>, f: (a: A) => I.IO<R1, E1, any>): M.Managed<R & R1, E | E1, A>

    /**
     * @rewriteGetter timed from "@principia/base/Managed"
     * @trace getter
     */
    timed: M.Managed<R & Has<Clock>, E, readonly [number, A]>

    /**
     * @rewrite timeout from "@principia/base/Managed"
     * @trace call
     */
    timeout<R, E, A>(this: M.Managed<R, E, A>, ms: number): M.Managed<R & Has<Clock>, E, Option<A>>

    /**
     * @rewrite unlessManaged_ from "@principia/base/Managed"
     * @trace call
     */
    unlessManaged<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      mb: M.Managed<R1, E1, boolean>
    ): M.Managed<R & R1, E | E1, void>

    /**
     * @rewrite use_ from "@principia/base/Managed"
     * @trace 0
     */
    use<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewriteGetter useForever from "@principia/base/Managed"
     * @trace getter
     */
    useForever: I.IO<R, E, A>

    /**
     * @rewriteGetter useNow from "@principia/base/Managed"
     * @trace getter
     */
    useNow: I.IO<R, E, A>

    /**
     * @rewrite whenManaged_ from "@principia/base/Managed"
     * @trace call
     */
    whenManaged<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      mb: M.Managed<R1, E1, boolean>
    ): M.Managed<R & R1, E | E1, void>

    /**
     * @rewriteGetter withEarlyRelease from "@principia/base/Managed"
     * @trace getter
     */
    withEarlyRelease: M.Managed<R, E, readonly [I.UIO<unknown>, A]>

    /**
     * @rewrite withEarlyReleaseExit_ from "@principia/base/Managed"
     * @trace call
     */
    withEarlyReleaseExit<R, E, A>(
      this: M.Managed<R, E, A>,
      exit: Exit<any, any>
    ): M.Managed<R, E, readonly [I.UIO<unknown>, A]>

    /**
     * @rewriteGetter zipEnv from "@principia/base/Managed"
     * @trace getter
     */
    zipEnv: M.Managed<R, E, readonly [A, R]>
  }
}
