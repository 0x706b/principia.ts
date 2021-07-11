import type { Cause } from '@principia/base/Cause'
import type { Clock } from '@principia/base/Clock'
import type { Either } from '@principia/base/Either'
import type { Exit } from '@principia/base/Exit'
import type { Fiber, FiberContext, FiberId, InterruptStatus, RuntimeFiber } from '@principia/base/Fiber'
import type { Has, Tag } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { IOEnv } from '@principia/base/IOEnv'
import type * as L from '@principia/base/Layer'
import type { Managed, Reservation } from '@principia/base/Managed'
import type { Option } from '@principia/base/Option'
import type { Erase, Predicate, ServicesStruct, ServicesTuple, UnionToIntersection } from '@principia/base/prelude'
import type { Promise } from '@principia/base/Promise'
import type { Schedule } from '@principia/base/Schedule'
import type { Scope } from '@principia/base/Scope'
import type { Supervisor } from '@principia/base/Supervisor'

declare module '@principia/base/IO/primitives' {
  export interface IO<R, E, A> {
    /**
     * @rewrite as_ from "@principia/base/IO"
     * @trace call
     */
    ['$>']<B>(b: B): I.IO<R, E, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/IO"
     * @trace call
     */
    ['&>']<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossSecond_ from "@principia/base/IO"
     * @trace call
     */
    ['*>']<R1, E1, B>(io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite joinEither_ from "@principia/base/IO"
     * @trace call
     */
    ['+++']<R1, E1, A1>(that: I.IO<R1, E1, A1>): I.IO<Either<R, R1>, E | E1, Either<A, A1>>

    /**
     * @rewrite map_ from "@principia/base/IO"
     * @trace 0
     */
    ['<$>']<B>(f: (a: A) => B): I.IO<R, E, B>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/IO"
     * @trace call
     */
    ['<&']<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossPar_ from "@principia/base/IO"
     * @trace call
     */
    ['<&>']<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/IO"
     * @trace call
     */
    ['<*']<R1, E1, B>(io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite cross_ from "@principia/base/IO"
     * @trace call
     */
    ['<*>']<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite orElseEither_ from "@principia/base/IO"
     * @trace call
     */
    ['<+>']<R1, E1, A1>(that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E1, Either<A, A1>>

    /**
     * @rewrite compose_ from "@principia/base/IO"
     * @trace call
     */
    ['<<<']<R0, E1>(that: I.IO<R0, E1, R>): I.IO<R0, E | E1, A>

    /**
     * @rewrite orElse_ from "@principia/base/IO"
     * @trace 0
     */
    ['<>']<R1, E1, A1>(that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E1, A | A1>

    /**
     * @rewrite raceEither_ from "@principia/base/IO"
     * @trace call
     */
    ['<|>']<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, Either<A, B>>

    /**
     * @rewrite chain_ from "@principia/base/IO"
     * @trace 0
     */
    ['>>=']<R1, E1, B>(f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite andThen_ from "@principia/base/IO"
     * @trace call
     */
    ['>>>']<E1, B>(that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

    /**
     * @rewrite absorbWith_ from "@principia/base/IO"
     * @trace 0
     */
    absorbWith(f: (e: E) => unknown): I.IO<R, unknown, A>

    /**
     * @rewrite andThen_ from "@principia/base/IO"
     * @trace call
     */
    andThen<E1, B>(that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

    /**
     * @rewrite as_ from "@principia/base/IO"
     * @trace 0
     */
    as<B>(b: B): I.IO<R, E, B>

    /**
     * @rewriteGetter asSome from "@principia/base/IO"
     * @trace getter
     */
    asSome: I.IO<R, E, Option<A>>

    /**
     * @rewriteGetter asSomeError from "@principia/base/IO"
     * @trace getter
     */
    asSomeError: I.IO<R, Option<E>, A>

    /**
     * @rewriteGetter asUnit from "@principia/base/IO"
     * @trace getter
     */
    asUnit: I.IO<R, E, void>

    /**
     * @rewrite bimap_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bimap<E1, B>(f: (e: E) => E1, g: (a: A) => B): I.IO<R, E1, B>

    /**
     * @rewrite bitap_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bitap<R1, E1, B, R2, E2, C>(
      f: (e: E) => I.IO<R1, E1, B>,
      g: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E | E1 | E2, A>

    /**
     * @rewrite bracket_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracket<R1, E1, A1, R2, E2, A2>(
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite bracketExit_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracketExit<R1, E1, A1, R2, E2>(
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A, exit: Exit<E1, A1>) => I.IO<R2, E2, any>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite bracketFiber_ from "@principia/base/IO"
     * @trace 0
     */
    bracketFiber<R1, E1, B>(use: (f: RuntimeFiber<E, A>) => I.IO<R1, E1, B>): I.IO<R & R1, E1, Exit<E, A>>

    /**
     * @rewrite bracketOnError_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracketOnError<R1, E1, A1, R2, E2, A2>(
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A, exit: Exit<E1, A1>) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite catchAll_ from "@principia/base/IO"
     * @trace 0
     */
    catchAll<R1, E1, B>(f: (e: E) => I.IO<R1, E1, B>): I.IO<R & R1, E1, B>

    /**
     * @rewrite catchAllCause_ from "@principia/base/IO"
     * @trace 0
     */
    catchAllCause<R1, E1, B>(f: (cause: Cause<E>) => I.IO<R1, E1, B>): I.IO<R & R1, E1, A | B>

    /**
     * @rewrite catchSome_ from "@principia/base/IO"
     * @trace 0
     */
    catchSome<R1, E1, B>(f: (e: E) => Option<I.IO<R1, E1, B>>): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchSomeCause_ from "@principia/base/IO"
     * @trace 0
     */
    catchSomeCause<R1, E1, B>(f: (cause: Cause<E>) => Option<I.IO<R1, E1, B>>): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchSomeDefect_ from "@principia/base/IO"
     * @trace 0
     */
    catchSomeDefect<R1, E1, B>(f: (_: unknown) => Option<I.IO<R1, E1, B>>): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchTag_ from "@principia/base/IO"
     * @trace 1
     */
    catchTag<Tag extends E extends { _tag: infer X } ? X : never, R1, E1, B>(
      tag: Tag,
      f: (e: Extract<E, { readonly _tag: Tag }>) => I.IO<R1, E1, B>
    ): I.IO<R & R1, E1 | Exclude<E, { readonly _tag: Tag }>, A | B>

    /**
     * @rewriteGetter cause from "@principia/base/IO"
     * @trace getter
     */
    cause: I.IO<R, never, Cause<E>>

    /**
     * @rewriteGetter causeAsError from "@principia/base/IO"
     * @trace getter
     */
    causeAsError: I.IO<R, Cause<E>, A>

    /**
     * @rewrite chain_ from "@principia/base/IO"
     * @trace 0
     */
    chain<R1, E1, B>(f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite chainError_ from "@principia/base/IO"
     *
     * @trace 0
     */
    chainError<R1, E1>(f: (e: E) => I.IO<R1, never, E1>): I.IO<R & R1, E1, A>

    /**
     * @rewrite compose_ from "@principia/base/IO"
     * @trace call
     */
    compose<R0, E1>(that: I.IO<R0, E1, R>): I.IO<R0, E | E1, A>

    /**
     * @rewrite cross_ from "@principia/base/IO"
     * @trace call
     */
    cross<R1, E1, B>(fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/IO"
     * @trace call
     */
    crossFirst<R1, E1, B>(io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/IO"
     * @trace call
     */
    crossFirstPar<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossPar_ from "@principia/base/IO"
     * @trace call
     */
    crossPar<R1, E1, B>(fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossSecond_ from "@principia/base/IO"
     * @trace call
     */
    crossSecond<R1, E1, B>(io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/IO"
     * @trace call
     */
    crossSecondPar<R1, E1, B>(that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossWith_ from "@principia/base/IO"
     * @trace call
     */
    crossWith<R1, E1, B, C>(fb: I.IO<R1, E1, B>, f: (a: A, b: B) => C): I.IO<R & R1, E | E1, C>

    /**
     * @rewrite crossWithPar_ from "@principia/base/IO"
     * @trace 1
     */
    crossWithPar<R1, E1, B, C>(fb: I.IO<R1, E1, B>, f: (a: A, b: B) => C): I.IO<R & R1, E | E1, C>

    /**
     * @rewrite delay_ from "@principia/base/IO"
     * @trace call
     */
    delay(ms: number): I.IO<R & Has<Clock>, E, A>

    /**
     * @rewriteGetter disconnect from "@principia/base/IO"
     * @trace getter
     */
    disconnect: I.IO<R, E, A>

    /**
     * @rewriteGetter either from "@principia/base/IO"
     * @trace getter
     */
    either: I.IO<R, never, Either<E, A>>

    /**
     * @rewrite ensuring_ from "@principia/base/IO"
     * @trace call
     */
    ensuring<R1>(finalizer: I.IO<R1, never, any>): I.IO<R & R1, E, A>

    /**
     * @rewrite ensuringChildren_ from "@principia/base/IO"
     * @trace 0
     */
    ensuringChildren<R1>(
      children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => I.IO<R1, never, any>
    ): I.IO<R & R1, E, A>

    /**
     * @rewrite flatten from "@principia/base/IO"
     */
    flatten<R, E, R1, E1, A>(this: I.IO<R, E, I.IO<R1, E1, A>>): I.IO<R & R1, E | E1, A>

    /**
     * @rewriteGetter forever from "@principia/base/IO"
     * @trace call
     */
    forever: I.IO<R, E, never>

    /**
     * @rewriteGetter fork from "@principia/base/IO"
     * @trace getter
     */
    fork: I.IO<R, never, Fiber<E, A>>

    /**
     * @rewrite forkAs_ from "@principia/base/IO"
     * @trace call
     */
    forkAs(name: string): I.IO<R, never, FiberContext<E, A>>

    /**
     * @rewriteGetter forkDaemon from "@principia/base/IO"
     * @trace getter
     */
    forkDaemon: I.IO<R, never, FiberContext<E, A>>

    /**
     * @rewriteGetter forkManaged from "@principia/base/IO"
     * @trace getter
     */
    forkManaged: Managed<R, never, FiberContext<E, A>>

    /**
     * @rewrite forkWithErrorHandler_ from "@principia/base/IO"
     * @trace 0
     */
    forkWithErrorHandler<R1>(handler: (e: E) => I.IO<R1, never, void>): I.IO<R & R1, never, FiberContext<E, A>>

    /**
     * @rewrite fulfill_ from "@principia/base/IO"
     * @trace call
     */
    fulfill(promise: Promise<E, A>): I.IO<R, never, boolean>

    /**
     * @rewrite give_ from "@principia/base/IO"
     * @trace call
     */
    give<E, A, R = unknown, R0 = unknown>(this: I.IO<R & R0, E, A>, r: R): I.IO<R0, E, A>

    /**
     * @rewrite giveLayer_ from "@principia/base/IO"
     * @trace call
     */
    give<R, E, A, R1, E1, A1>(this: I.IO<R & A1, E, A>, layer: L.Layer<R1, E1, A1>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite giveAll_ from "@principia/base/IO"
     * @trace call
     */
    giveAll(r: R): I.IO<unknown, E, A>

    /**
     * @rewriteConstraint giveService_ from "@principia/base/IO"
     * @trace call
     */
    giveService<T>(tag: Tag<T>): (service: T) => I.IO<Erase<R, Has<T>>, E, A>

    /**
     * @rewriteConstraint giveServiceIO_ from "@principia/base/IO"
     * @trace call
     */
    giveServiceIO<T>(tag: Tag<T>): <R1, E1>(service: I.IO<R1, E1, T>) => I.IO<Erase<R & R1, Has<T>>, E | E1, A>

    /**
     * @rewriteConstraint giveServicesS_ from "@principia/base/IO"
     */
    giveServicesS<R, E, A, SS extends Record<string, Tag<any>>>(
      this: I.IO<R, E, A>,
      tags: SS
    ): (
      services: ServicesStruct<SS>
    ) => I.IO<
      Erase<R, UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>>,
      E,
      A
    >

    /**
     * @rewriteConstraint giveServicesSIO_ from "@principia/base/IO"
     */
    giveServicesSIO<SS extends Record<string, Tag<any>>>(
      tags: SS
    ): <R1, E1>(
      services: I.IO<R1, E1, ServicesStruct<SS>>
    ) => I.IO<
      Erase<
        R & R1,
        UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>
      >,
      E | E1,
      A
    >

    /**
     * @rewriteConstraint giveServicesT_ from "@principia/base/IO"
     */
    giveServicesT<SS extends ReadonlyArray<Tag<any>>>(
      ...tags: SS
    ): (
      ...services: ServicesTuple<SS>
    ) => I.IO<
      Erase<R, UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[number]>>,
      E,
      A
    >

    /**
     * @rewriteConstraint giveServicesTIO_ from "@principia/base/IO"
     */
    giveServicesTIO<R, E, A, SS extends ReadonlyArray<Tag<any>>>(
      ...tags: SS
    ): <R1, E1>(
      services: I.IO<R1, E1, ServicesTuple<SS>>
    ) => I.IO<
      Erase<
        R & R1,
        UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[number]>
      >,
      E | E1,
      A
    >

    /**
     * @rewrite gives_ from "@principia/base/IO"
     * @trace 0
     */
    gives<R0>(f: (r0: R0) => R): I.IO<R0, E, A>

    /**
     * @rewrite ifIO_ from "@principia/base/IO"
     * @trace call
     */
    ifIO<R, E, R1, E1, A1, R2, E2, A2>(
      this: I.IO<R, E, boolean>,
      onTrue: I.IO<R1, E1, A1>,
      onFalse: I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1 | A2>

    /**
     * @rewrite in_ from "@principia/base/IO"
     * @trace call
     */
    in(scope: Scope<any>): I.IO<R, E, A>

    /**
     * @rewriteGetter interruptAllChildren from "@principia/base/IO"
     * @trace getter
     */
    interruptAllChildren: I.IO<R, E, A>

    /**
     * @rewriteGetter interruptible from "@principia/base/IO"
     * @trace getter
     */
    interruptible: I.IO<R, E, A>

    /**
     * @rewrite map_ from "@principia/base/IO"
     * @trace 0
     */
    map<B>(f: (a: A) => B): I.IO<R, E, B>

    /**
     * @rewrite mapError_ from "@principia/base/IO"
     * @trace 0
     */
    mapError<E1>(f: (e: E) => E1): I.IO<R, E1, A>

    /**
     * @rewrite mapTryCatch_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    mapTryCatch<E1, B>(f: (a: A) => B, onThrow: (u: unknown) => E1): I.IO<R, E | E1, B>

    /**
     * @rewrite match_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    match<B, C>(onFailure: (e: E) => B, onSuccess: (a: A) => C): I.IO<R, never, B | C>

    /**
     * @rewrite matchCause_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchCause<B, C>(onFailure: (cause: Cause<E>) => B, onSuccess: (a: A) => C): I.IO<R, never, B | C>

    /**
     * @rewrite matchCauseIO_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchCauseIO<R1, E1, B, R2, E2, C>(
      onFailure: (cause: Cause<E>) => I.IO<R1, E1, B>,
      onSuccess: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewrite matchIO_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchIO<R1, E1, B, R2, E2, C>(
      onFailure: (e: E) => I.IO<R1, E1, B>,
      onSuccess: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewrite onError_ from "@principia/base/IO"
     * @trace 0
     */
    onError<R1, E1>(cleanup: (cause: Cause<E>) => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite onExit_ from "@principia/base/IO"
     * @trace 0
     */
    onExit<R1, E1>(cleanup: (exit: Exit<E, A>) => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite onInterrupt_ from "@principia/base/IO"
     * @trace 0
     */
    onInterrupt<R1>(cleanup: (interruptors: ReadonlySet<FiberId>) => I.IO<R1, never, any>): I.IO<R & R1, E, A>

    /**
     * @rewrite onInterruptExtended_ from "@principia/base/IO"
     * @trace 0
     */
    onInterruptExtended<R1, E1>(cleanup: () => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, A>

    /**
     * @rewriteConstraint onLeft from "@principia/base/IO"
     * @trace call
     */
    onLeft<C>(): I.IO<Either<R, C>, E, Either<A, C>>

    /**
     * @rewriteConstraint onRight from "@principia/base/IO"
     * @trace call
     */
    onRight<C>(): I.IO<Either<C, R>, E, Either<C, A>>

    /**
     * @rewrite onTermination_ from "@principia/base/IO"
     * @trace 0
     */
    onTermination<R1>(onTerminated: (cause: Cause<never>) => I.IO<R1, never, any>): I.IO<R & R1, E, A>

    /**
     * @rewriteGetter once from "@principia/base/IO"
     * @trace getter
     */
    once: I.IO<unknown, never, I.IO<R, E, A>>

    /**
     * @rewrite race_ from "@principia/base/IO"
     * @trace call
     */
    race<R1, E1, A1>(that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, A | A1>

    /**
     * @rewrite raceEither_ from "@principia/base/IO"
     * @trace call
     */
    raceEither<R1, E1, A1>(that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, Either<A, A1>>

    /**
     * @rewrite raceFirst_ from "@principia/base/IO"
     * @trace call
     */
    raceFirst<R1, E1, A1>(that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, A | A1>

    /**
     * @rewrite raceWith_ from "@principia/base/IO"
     * @trace 1
     * @trace 2
     */
    raceWith<R1, E1, A1, R2, E2, A2, R3, E3, A3>(
      that: I.IO<R1, E1, A1>,
      leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => I.IO<R2, E2, A2>,
      rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => I.IO<R3, E3, A3>,
      scope?: Option<Scope<Exit<any, any>>>
    ): I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3>

    /**
     * @rewrite refineOrDie_ from "@principia/base/IO"
     * @trace 0
     */
    refineOrDie<E1>(pf: (e: E) => Option<E1>): I.IO<R, E1, A>

    /**
     * @rewrite refineOrDieWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    refineOrDieWith<E1>(pf: (e: E) => Option<E1>, f: (e: E) => unknown): I.IO<R, E1, A>

    /**
     * @rewrite reject_ from "@principia/base/IO"
     * @trace 0
     */
    reject<E1>(pf: (a: A) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite rejectIO_ from "@principia/base/IO"
     * @trace 0
     */
    rejectIO<R1, E1>(pf: (a: A) => Option<I.IO<R1, E1, E1>>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite repeat_ from "@principia/base/IO"
     * @trace call
     */
    repeat<R1, B>(schedule: Schedule<R1, A, B>): I.IO<R & R1 & Has<Clock>, E, B>

    /**
     * @rewrite repeatN_ from "@principia/base/IO"
     * @trace call
     */
    repeatN(n: number): I.IO<R, E, A>

    /**
     * @rewrite repeatOrElse_ from "@principia/base/IO"
     * @trace call
     */
    repeatOrElse<R1, B, R2, E2, C>(
      schedule: Schedule<R1, A, B>,
      f: (e: E, out: Option<B>) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, C | B>

    /**
     * @rewrite repeatOrElseEither_ from "@principia/base/IO"
     * @trace call
     */
    repeatOrElseEither<R1, B, R2, E2, C>(
      schedule: Schedule<R1, A, B>,
      f: (e: E, out: Option<B>) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, Either<C, B>>

    /**
     * @rewrite repeatUntil_ from "@principia/base/IO"
     * @trace 0
     */
    repeatUntil(f: Predicate<A>): I.IO<R, E, A>

    /**
     * @rewrite repeatUntilIO_ from "@principia/base/IO"
     * @trace 0
     */
    repeatUntilIO<R1, E1>(f: (a: A) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite repeatWhile_ from "@principia/base/IO"
     * @trace 0
     */
    repeatWhile(f: Predicate<A>): I.IO<R, E, A>

    /**
     * @rewrite repeatWhileIO_ from "@principia/base/IO"
     * @trace 0
     */
    repeatWhileIO<R1, E1>(f: (a: A) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite reserve_ from "@principia/base/IO"
     */
    reserve<R, E, R1, E1, A, R2, E2, B>(
      this: I.IO<R, E, Reservation<R1, E1, A>>,
      use: (a: A) => I.IO<R2, E2, B>
    ): I.IO<R & R1 & R2, E | E1 | E2, B>

    /**
     * @rewriteGetter resurrect from "@principia/base/IO"
     * @trace getter
     */
    ressurect: I.IO<R, unknown, A>

    /**
     * @rewriteGetter result from "@principia/base/IO"
     * @trace getter
     */
    result: I.IO<R, never, Exit<E, A>>

    /**
     * @rewrite retry_ from "@principia/base/IO"
     * @trace call
     */
    retry<R, E extends I, A, R1, I, O>(
      this: I.IO<R, E, A>,
      schedule: Schedule<R1, I, O>
    ): I.IO<R & R1 & Has<Clock>, E, A>

    /**
     * @rewrite retryOrElse_ from "@principia/base/IO"
     * @trace 1
     */
    retryOrElse<R, E extends I, A, R1, I, O, R2, E2, A2>(
      schedule: Schedule<R1, I, O>,
      orElse: (e: E, out: O) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, A | A2>

    /**
     * @rewrite retryOrElseEither_ from "@principia/base/IO"
     * @trace 1
     */
    retryOrElseEither<R, E extends I, A, R1, I, O, R2, E2, A2>(
      schedule: Schedule<R1, I, O>,
      orElse: (e: E, out: O) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, Either<A2, A>>

    /**
     * @rewrite retryUntil_ from "@principia/base/IO"
     * @trace 0
     */
    retryUntil(f: Predicate<E>): I.IO<R, E, A>

    /**
     * @rewrite retryUntilIO_ from "@principia/base/IO"
     * @trace 0
     */
    retryUntilIO<R1, E1>(f: (e: E) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite retryWhile_ from "@principia/base/IO"
     * @trace 0
     */
    retryWhile(f: Predicate<E>): I.IO<R, E, A>

    /**
     * @rewrite retryWhileIO_ from "@principia/base/IO"
     * @trace 0
     */
    retryWhileIO<R1, E1>(f: (e: E) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite run_ from "@principia/base/IO"
     */
    run<E, A>(this: I.IO<IOEnv, E, A>, callback?: (_: Exit<E, A>) => void): void

    /**
     * @rewrite runPromiseExit from "@principia/base/IO"
     */
    runPromiseExit<E, A>(this: I.IO<IOEnv, E, A>): globalThis.Promise<Exit<E, A>>

    /**
     * @rewriteGetter sandbox from "@principia/base/IO"
     * @trace getter
     */
    sandbox: I.IO<R, Cause<E>, A>

    /**
     * @rewrite sandboxWith_ from "@principia/base/IO"
     * @trace call
     */
    sandboxWith<E1>(f: (_: I.IO<R, Cause<E>, A>) => I.IO<R, Cause<E1>, A>): I.IO<R, E1, A>

    /**
     * @rewrite setInterruptStatus_ from "@principia/base/IO"
     * @trace call
     */
    setInterruptStatus(flag: InterruptStatus): I.IO<R, E, A>

    /**
     * @rewrite subsumeEither from "@principia/base/IO"
     * @trace call
     */
    subsumeEither<R, E, E1, A>(this: I.IO<R, E, Either<E1, A>>): I.IO<R, E | E1, A>

    /**
     * @rewrite summarized_ from "@principia/base/IO"
     * @trace call
     */
    summarized<R1, E1, B, C>(
      summary: I.IO<R1, E1, B>,
      f: (start: B, end: B) => C
    ): I.IO<R & R1, E | E1, readonly [C, A]>

    /**
     * @rewrite supervised_ from "@principia/base/IO"
     */
    supervised(supervisor: Supervisor<any>): I.IO<R, E, A>

    /**
     * @rewriteGetter swap from "@principia/base/IO"
     * @trace getter
     */
    swap: I.IO<R, A, E>

    /**
     * @rewrite swapWith_ from "@principia/base/IO"
     * @trace call
     */
    swapWith<R1, E1, A1>(f: (_: I.IO<R, A, E>) => I.IO<R1, A1, E1>): I.IO<R1, E1, A1>

    /**
     * @rewrite tap_ from "@principia/base/IO"
     * @trace 0
     */
    tap<R1, E1, B>(f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite tapCause_ from "@principia/base/IO"
     * @trace 0
     */
    tapCause<R1, E1, B>(f: (e: Cause<E>) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite tapError_ from "@principia/base/IO"
     * @trace 0
     */
    tapError<R1, E1, B>(f: (e: E) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewriteGetter timed from "@principia/base/IO"
     * @trace getter
     */
    timed: I.IO<R & Has<Clock>, E, readonly [number, A]>

    /**
     * @rewrite timedWith_ from "@principia/base/IO"
     * @trace call
     */
    timedWith<R1, E1>(msTime: I.IO<R1, E1, number>): I.IO<R & R1, E | E1, readonly [number, A]>

    /**
     * @rewrite timeout_ from "@principia/base/IO"
     * @trace call
     */
    timeout(ms: number): I.IO<R & Has<Clock>, E, Option<A>>

    /**
     * @rewrite timeoutFail_ from "@principia/base/IO"
     * @trace call
     */
    timeoutFail<E1>(ms: number, onTimeout: () => E1): I.IO<R & Has<Clock>, E | E1, A>

    /**
     * @rewrite timeoutTo_ from "@principia/base/IO"
     * @trace call
     */
    timeoutTo<B, B1>(ms: number, b: B, f: (a: A) => B1): I.IO<R & Has<Clock>, E, B | B1>

    /**
     * @rewrite fromIO_ from "@principia/base/Layer"
     * @trace call
     */
    toLayer<R, E, A>(this: I.IO<R, E, A>, tag: Tag<A>): L.Layer<R, E, Has<A>>

    /**
     * @rewrite fromRawIO from "@principia/base/Layer"
     * @trace call
     */
    toLayerRaw<R, E, A>(this: I.IO<R, E, A>): L.Layer<R, E, A>

    /**
     * @rewrite fromIO from "@principia/base/Managed"
     * @trace call
     */
    toManaged(): Managed<R, E, A>

    /**
     * @rewrite bracket_ from "@principia/base/Managed"
     * @trace call
     */
    toManaged<R1>(release: (a: A) => I.IO<R1, never, any>): Managed<R & R1, E, A>

    /**
     * @rewrite tryOrElse_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    tryOrElse<R1, E1, A1, R2, E2, A2>(
      that: () => I.IO<R1, E1, A1>,
      onSuccess: (a: A) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E1 | E2, A1 | A2>

    /**
     * @rewrite uncause from "@principia/base/IO"
     * @trace call
     */
    uncause<R, E>(this: I.IO<R, never, Cause<E>>): I.IO<R, E, void>

    /**
     * @rewriteGetter uninterruptible from "@principia/base/IO"
     * @trace getter
     */
    uninterruptible: I.IO<R, E, A>

    /**
     * @rewrite unrefine_ from "@principia/base/IO"
     * @trace 0
     */
    unrefine<E1>(pf: (u: unknown) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite unrefine_ from "@principia/base/IO"
     * @trace 0
     */
    unrefine<E1>(f: (_: unknown) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite unrefineWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    unrefineWith<E1, E2>(pf: (u: unknown) => Option<E1>, f: (e: E) => E2): I.IO<R, E1 | E2, A>

    /**
     * @rewrite unrefineWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    unrefineWith<E1, E2>(f: (_: unknown) => Option<E1>, g: (e: E) => E2): I.IO<R, E1 | E2, A>

    /**
     * @rewrite unsandbox from "@principia/base/IO"
     * @trace call
     */
    unsandbox<R, E, A>(this: I.IO<R, Cause<E>, A>): I.IO<R, E, A>

    /**
     * @rewriteConstraint updateService_ from "@principia/base/IO"
     */
    updateService<T>(tag: Tag<T>): (f: (service: T) => T) => I.IO<R & Has<T>, E, A>

    /**
     * @rewriteConstraint updateServiceIO_ from "@principia/base/IO"
     */
    updateServiceIO<T>(tag: Tag<T>): <R1, E1>(f: (service: T) => I.IO<R1, E1, T>) => I.IO<R & R1 & Has<T>, E | E1, A>

    /**
     * @rewrite when_ from "@principia/base/IO"
     * @trace 0
     */
    when(b: () => boolean): I.IO<R, E, void>

    /**
     * @rewrite whenIO_ from "@principia/base/IO"
     * @trace call
     */
    whenIO<R1, E1>(b: I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, void>

    /**
     * @rewriteGetter zipEnvFirst from "@principia/base/IO"
     * @trace getter
     */
    zipEnvFirst: I.IO<R, E, readonly [R, A]>

    /**
     * @rewriteGetter zipEnvSecond from "@principia/base/IO"
     * @trace getter
     */
    zipEnvSecond: I.IO<R, E, readonly [A, R]>

    /**
     * @rewrite join_ from "@principia/base/IO"
     * @trace call
     */
    ['|||']<R1, E1, A1>(that: I.IO<R1, E1, A1>): I.IO<Either<R, R1>, E | E1, A | A1>
  }
}
