import type { Either } from '@principia/base/Either'
import type { Has, Tag } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Clock } from '@principia/base/IO/Clock'
import type { Exit } from '@principia/base/IO/Exit'
import type { Fiber, FiberContext, FiberId, InterruptStatus, RuntimeFiber } from '@principia/base/IO/Fiber'
import type { IOEnv } from '@principia/base/IO/IOEnv'
import type * as L from '@principia/base/IO/Layer'
import type { Managed, Reservation } from '@principia/base/IO/Managed'
import type { Promise } from '@principia/base/IO/Promise'
import type { Schedule } from '@principia/base/IO/Schedule'
import type { Scope } from '@principia/base/IO/Scope'
import type { Supervisor } from '@principia/base/IO/Supervisor'
import type { Option } from '@principia/base/Option'
import type { Erase, Predicate, ServicesStruct, ServicesTuple, UnionToIntersection } from '@principia/base/prelude'

declare module '@principia/base/IO/IO/primitives' {
  export interface IO<R, E, A> {
    /**
     * @rewrite as_ from "@principia/base/IO"
     * @trace call
     */
    ['$>']<R, E, A, B>(this: I.IO<R, E, A>, b: B): I.IO<R, E, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/IO"
     * @trace call
     */
    ['&>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossSecond_ from "@principia/base/IO"
     * @trace call
     */
    ['*>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite joinEither_ from "@principia/base/IO"
     * @trace call
     */
    ['+++']<R, E, A, R1, E1, A1>(
      this: I.IO<R, E, A>,
      that: I.IO<R1, E1, A1>
    ): I.IO<Either<R, R1>, E | E1, Either<A, A1>>

    /**
     * @rewrite map_ from "@principia/base/IO"
     * @trace 0
     */
    ['<$>']<R, E, A, B>(this: I.IO<R, E, A>, f: (a: A) => B): I.IO<R, E, B>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/IO"
     * @trace call
     */
    ['<&']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossPar_ from "@principia/base/IO"
     * @trace call
     */
    ['<&>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/IO"
     * @trace call
     */
    ['<*']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite cross_ from "@principia/base/IO"
     * @trace call
     */
    ['<*>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite orElseEither_ from "@principia/base/IO"
     * @trace call
     */
    ['<+>']<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E1, Either<A, A1>>

    /**
     * @rewrite compose_ from "@principia/base/IO"
     * @trace call
     */
    ['<<<']<R, E, A, R0, E1>(this: I.IO<R, E, A>, that: I.IO<R0, E1, R>): I.IO<R0, E | E1, A>

    /**
     * @rewrite orElse_ from "@principia/base/IO"
     * @trace 0
     */
    ['<>']<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E1, A | A1>

    /**
     * @rewrite raceEither_ from "@principia/base/IO"
     * @trace call
     */
    ['<|>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, Either<A, B>>

    /**
     * @rewrite chain_ from "@principia/base/IO"
     * @trace 0
     */
    ['>>=']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite andThen_ from "@principia/base/IO"
     * @trace call
     */
    ['>>>']<R, E, A, E1, B>(this: I.IO<R, E, A>, that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

    /**
     * @rewrite absorbWith_ from "@principia/base/IO"
     * @trace 0
     */
    absorbWith<R, E, A>(this: I.IO<R, E, A>, f: (e: E) => unknown): I.IO<R, unknown, A>

    /**
     * @rewrite andThen_ from "@principia/base/IO"
     * @trace call
     */
    andThen<R, E, A, E1, B>(this: I.IO<R, E, A>, that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

    /**
     * @rewrite as_ from "@principia/base/IO"
     * @trace 0
     */
    as<R, E, A, B>(this: I.IO<R, E, A>, b: B): I.IO<R, E, B>

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
    bimap<R, E, A, E1, B>(this: I.IO<R, E, A>, f: (e: E) => E1, g: (a: A) => B): I.IO<R, E1, B>

    /**
     * @rewrite bitap_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bitap<R, E, A, R1, E1, B, R2, E2, C>(
      this: I.IO<R, E, A>,
      f: (e: E) => I.IO<R1, E1, B>,
      g: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E | E1 | E2, A>

    /**
     * @rewrite bracket_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracket<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: I.IO<R, E, A>,
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite bracketExit_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracketExit<R, E, A, R1, E1, A1, R2, E2>(
      this: I.IO<R, E, A>,
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A, exit: Exit<E1, A1>) => I.IO<R2, E2, any>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite bracketFiber_ from "@principia/base/IO"
     * @trace 0
     */
    bracketFiber<R, E, A, R1, E1, B>(
      this: I.IO<R, E, A>,
      use: (f: RuntimeFiber<E, A>) => I.IO<R1, E1, B>
    ): I.IO<R & R1, E1, Exit<E, A>>

    /**
     * @rewrite bracketOnError_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    bracketOnError<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: I.IO<R, E, A>,
      use: (a: A) => I.IO<R1, E1, A1>,
      release: (a: A, exit: Exit<E1, A1>) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2, E | E1 | E2, A1>

    /**
     * @rewrite catchAll_ from "@principia/base/IO"
     * @trace 0
     */
    catchAll<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (e: E) => I.IO<R1, E1, B>): I.IO<R & R1, E1, B>

    /**
     * @rewrite catchAllCause_ from "@principia/base/IO"
     * @trace 0
     */
    catchAllCause<R, E, A, R1, E1, B>(
      this: I.IO<R, E, A>,
      f: (cause: Cause<E>) => I.IO<R1, E1, B>
    ): I.IO<R & R1, E1, A | B>

    /**
     * @rewrite catchSome_ from "@principia/base/IO"
     * @trace 0
     */
    catchSome<R, E, A, R1, E1, B>(
      this: I.IO<R, E, A>,
      f: (e: E) => Option<I.IO<R1, E1, B>>
    ): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchSomeCause_ from "@principia/base/IO"
     * @trace 0
     */
    catchSomeCause<R, E, A, R1, E1, B>(
      this: I.IO<R, E, A>,
      f: (cause: Cause<E>) => Option<I.IO<R1, E1, B>>
    ): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchSomeDefect_ from "@principia/base/IO"
     * @trace 0
     */
    catchSomeDefect<R, E, A, R1, E1, B>(
      this: I.IO<R, E, A>,
      f: (_: unknown) => Option<I.IO<R1, E1, B>>
    ): I.IO<R & R1, E | E1, A | B>

    /**
     * @rewrite catchTag_ from "@principia/base/IO"
     * @trace 1
     */
    catchTag<R, E, A, Tag extends E extends { _tag: infer X } ? X : never, R1, E1, B>(
      this: I.IO<R, E, A>,
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
    chain<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite chainError_ from "@principia/base/IO"
     *
     * @trace 0
     */
    chainError<R, E, A, R1, E1>(this: I.IO<R, E, A>, f: (e: E) => I.IO<R1, never, E1>): I.IO<R & R1, E1, A>

    /**
     * @rewrite compose_ from "@principia/base/IO"
     * @trace call
     */
    compose<R, E, A, R0, E1>(this: I.IO<R, E, A>, that: I.IO<R0, E1, R>): I.IO<R0, E | E1, A>

    /**
     * @rewrite cross_ from "@principia/base/IO"
     * @trace call
     */
    cross<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossFirst_ from "@principia/base/IO"
     * @trace call
     */
    crossFirst<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossFirstPar_ from "@principia/base/IO"
     * @trace call
     */
    crossFirstPar<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite crossPar_ from "@principia/base/IO"
     * @trace call
     */
    crossPar<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite crossSecond_ from "@principia/base/IO"
     * @trace call
     */
    crossSecond<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossSecondPar_ from "@principia/base/IO"
     * @trace call
     */
    crossSecondPar<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite crossWith_ from "@principia/base/IO"
     * @trace call
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: I.IO<R, E, A>,
      fb: I.IO<R1, E1, B>,
      f: (a: A, b: B) => C
    ): I.IO<R & R1, E | E1, C>

    /**
     * @rewrite crossWithPar_ from "@principia/base/IO"
     * @trace 1
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: I.IO<R, E, A>,
      fb: I.IO<R1, E1, B>,
      f: (a: A, b: B) => C
    ): I.IO<R & R1, E | E1, C>

    /**
     * @rewrite delay_ from "@principia/base/IO"
     * @trace call
     */
    delay<R, E, A>(this: I.IO<R, E, A>, ms: number): I.IO<R & Has<Clock>, E, A>

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
    ensuring<R, E, A, R1>(this: I.IO<R, E, A>, finalizer: I.IO<R1, never, any>): I.IO<R & R1, E, A>

    /**
     * @rewrite ensuringChildren_ from "@principia/base/IO"
     * @trace 0
     */
    ensuringChildren<R, E, A, R1>(
      this: I.IO<R, E, A>,
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
    forkAs<R, E, A>(this: I.IO<R, E, A>, name: string): I.IO<R, never, FiberContext<E, A>>

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
    forkWithErrorHandler<R, E, A, R1>(
      this: I.IO<R, E, A>,
      handler: (e: E) => I.IO<R1, never, void>
    ): I.IO<R & R1, never, FiberContext<E, A>>

    /**
     * @rewrite fulfill_ from "@principia/base/IO"
     * @trace call
     */
    fulfill<R, E, A>(this: I.IO<R, E, A>, promise: Promise<E, A>): I.IO<R, never, boolean>

    /**
     * @rewrite get from "@principia/base/IO"
     * @trace call
     */
    get<R, E, A>(this: IO<R, E, Option<A>>): IO<R, Option<E>, A>

    /**
     * @rewrite give_ from "@principia/base/IO"
     * @trace call
     */
    give<R0, E, A, R>(this: I.IO<R0, E, A>, r: R): I.IO<Erase<R0, R>, E, A>

    /**
     * @rewrite giveLayer_ from "@principia/base/IO"
     * @trace call
     */
    give<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, layer: L.Layer<R1, E1, A1>): I.IO<Erase<R, A1> & R1, E | E1, A>

    /**
     * @rewrite giveAll_ from "@principia/base/IO"
     * @trace call
     */
    giveAll<R, E, A>(this: I.IO<R, E, A>, r: R): I.IO<unknown, E, A>

    /**
     * @rewriteConstraint giveService_ from "@principia/base/IO"
     * @trace call
     */
    giveService<R, E, A, T>(this: I.IO<R, E, A>, tag: Tag<T>): (service: T) => I.IO<Erase<R, Has<T>>, E, A>

    /**
     * @rewriteConstraint giveServiceIO_ from "@principia/base/IO"
     * @trace call
     */
    giveServiceIO<R, E, A, T>(
      this: I.IO<R, E, A>,
      tag: Tag<T>
    ): <R1, E1>(service: I.IO<R1, E1, T>) => I.IO<Erase<R & R1, Has<T>>, E | E1, A>

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
    giveServicesSIO<R, E, A, SS extends Record<string, Tag<any>>>(
      this: I.IO<R, E, A>,
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
    giveServicesT<R, E, A, SS extends ReadonlyArray<Tag<any>>>(
      this: I.IO<R, E, A>,
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
      this: I.IO<R, E, A>,
      ...tags: SS
    ): <R1, E1>(
      services: I.IO<R1, E1, ServicesTuple<SS>>
    ) => I.IO<
      Erase<R, UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[number]>> &
        R1,
      E | E1,
      A
    >

    /**
     * @rewrite gives_ from "@principia/base/IO"
     * @trace 0
     */
    gives<R, E, A, R0>(this: I.IO<R, E, A>, f: (r0: R0) => R): I.IO<R0, E, A>

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
    in<R, E, A>(this: I.IO<R, E, A>, scope: Scope<any>): I.IO<R, E, A>

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
    map<R, E, A, B>(this: I.IO<R, E, A>, f: (a: A) => B): I.IO<R, E, B>

    /**
     * @rewrite mapError_ from "@principia/base/IO"
     * @trace 0
     */
    mapError<R, E, A, E1>(this: I.IO<R, E, A>, f: (e: E) => E1): I.IO<R, E1, A>

    /**
     * @rewrite mapTryCatch_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    mapTryCatch<R, E, A, E1, B>(this: I.IO<R, E, A>, f: (a: A) => B, onThrow: (u: unknown) => E1): I.IO<R, E | E1, B>

    /**
     * @rewrite match_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    match<R, E, A, B, C>(this: I.IO<R, E, A>, onFailure: (e: E) => B, onSuccess: (a: A) => C): I.IO<R, never, B | C>

    /**
     * @rewrite matchCause_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchCause<R, E, A, B, C>(
      this: I.IO<R, E, A>,
      onFailure: (cause: Cause<E>) => B,
      onSuccess: (a: A) => C
    ): I.IO<R, never, B | C>

    /**
     * @rewrite matchCauseIO_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchCauseIO<R, E, A, R1, E1, B, R2, E2, C>(
      this: I.IO<R, E, A>,
      onFailure: (cause: Cause<E>) => I.IO<R1, E1, B>,
      onSuccess: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewrite matchIO_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    matchIO<R, E, A, R1, E1, B, R2, E2, C>(
      this: I.IO<R, E, A>,
      onFailure: (e: E) => I.IO<R1, E1, B>,
      onSuccess: (a: A) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2, E1 | E2, B | C>

    /**
     * @rewrite onError_ from "@principia/base/IO"
     * @trace 0
     */
    onError<R, E, A, R1, E1>(
      this: I.IO<R, E, A>,
      cleanup: (cause: Cause<E>) => I.IO<R1, E1, any>
    ): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite onExit_ from "@principia/base/IO"
     * @trace 0
     */
    onExit<R, E, A, R1, E1>(
      this: I.IO<R, E, A>,
      cleanup: (exit: Exit<E, A>) => I.IO<R1, E1, any>
    ): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite onInterrupt_ from "@principia/base/IO"
     * @trace 0
     */
    onInterrupt<R, E, A, R1>(
      this: I.IO<R, E, A>,
      cleanup: (interruptors: ReadonlySet<FiberId>) => I.IO<R1, never, any>
    ): I.IO<R & R1, E, A>

    /**
     * @rewrite onInterruptExtended_ from "@principia/base/IO"
     * @trace 0
     */
    onInterruptExtended<R, E, A, R1, E1>(this: I.IO<R, E, A>, cleanup: () => I.IO<R1, E1, any>): I.IO<R & R1, E | E1, A>

    /**
     * @rewriteConstraint onLeft from "@principia/base/IO"
     * @trace call
     */
    onLeft<R, E, A, C>(this: I.IO<R, E, A>): I.IO<Either<R, C>, E, Either<A, C>>

    /**
     * @rewriteConstraint onRight from "@principia/base/IO"
     * @trace call
     */
    onRight<R, E, A, C>(this: I.IO<R, E, A>): I.IO<Either<C, R>, E, Either<C, A>>

    /**
     * @rewrite onTermination_ from "@principia/base/IO"
     * @trace 0
     */
    onTermination<R, E, A, R1>(
      this: I.IO<R, E, A>,
      onTerminated: (cause: Cause<never>) => I.IO<R1, never, any>
    ): I.IO<R & R1, E, A>

    /**
     * @rewriteGetter once from "@principia/base/IO"
     * @trace getter
     */
    once: I.IO<unknown, never, I.IO<R, E, A>>

    /**
     * @rewriteGetter option from "@principia/base/IO"
     * @trace getter
     */
    option: URIO<R, Option<A>>

    /**
     * @rewrite optional from "@principia/base/IO"
     * @trace call
     */
    optional<R, E, A>(this: I.IO<R, Option<E>, A>): I.IO<R, E, Option<A>>

    /**
     * @rewrite or_ from "@principia/base/IO"
     * @trace call
     */
    or<R, E, R1, E1>(this: I.IO<R, E, boolean>, that: I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, boolean>

    /**
     * @rewriteGetter orHalt from "@principia/base/IO"
     * @trace getter
     */
    orHalt: I.IO<R, never, A>

    /**
     * @rewriteGetter orHaltKeep from "@principia/base/IO"
     * @trace getter
     */
    orHaltKeep: I.IO<R, unknown, A>

    /**
     * @rewrite orHaltWith_ from "@principia/base/IO"
     * @trace 0
     */
    orHaltWith<R, E, A>(this: I.IO<R, E, A>, f: (e: E) => unknown): I.IO<R, never, A>

    /**
     * @rewrite orElse_ from "@principia/base/IO"
     * @trace 0
     */
    orElse<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, A | A1>

    /**
     * @rewrite orElseEither_ from "@principia/base/IO"
     * @trace 0
     */
    orElseEither<R, E, A, R1, E1, A1>(
      this: I.IO<R, E, A>,
      that: () => I.IO<R1, E1, A1>
    ): I.IO<R & R1, E | E1, Either<A, A1>>

    /**
     * @rewrite orElseFail_ from "@principia/base/IO"
     * @trace 0
     */
    orElseFail<R, E, A, E1>(this: I.IO<R, E, A>, e: () => E1): I.IO<R, E1, A>

    /**
     * @rewrite orElseOption_ from "@principia/base/IO"
     * @trace 0
     */
    orElseOption<R, E, A, R1, E1, A1>(
      this: I.IO<R, Option<E>, A>,
      that: () => I.IO<R1, Option<E1>, A1>
    ): I.IO<R & R1, Option<E | E1>, A | A1>

    /**
     * @rewrite orElseSucceed_ from "@principia/base/IO"
     * @trace 0
     */
    orElseSucceed<R, E, A, A1>(this: I.IO<R, E, A>, a: () => A1): I.IO<R, E, A | A1>

    /**
     * @rewriteGetter parallelErrors from "@principia/base/IO"
     * @trace getter
     */
    parallelErrors: I.IO<R, ReadonlyArray<E>, A>

    /**
     * @rewrite race_ from "@principia/base/IO"
     * @trace call
     */
    race<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, A | A1>

    /**
     * @rewrite raceEither_ from "@principia/base/IO"
     * @trace call
     */
    raceEither<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, Either<A, A1>>

    /**
     * @rewrite raceFirst_ from "@principia/base/IO"
     * @trace call
     */
    raceFirst<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: I.IO<R1, E1, A1>): I.IO<R & R1, E | E1, A | A1>

    /**
     * @rewrite raceWith_ from "@principia/base/IO"
     * @trace 1
     * @trace 2
     */
    raceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
      this: I.IO<R, E, A>,
      that: I.IO<R1, E1, A1>,
      leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => I.IO<R2, E2, A2>,
      rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => I.IO<R3, E3, A3>,
      scope?: Option<Scope<Exit<any, any>>>
    ): I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3>

    /**
     * @rewrite refineOrDie_ from "@principia/base/IO"
     * @trace 0
     */
    refineOrDie<R, E, A, E1>(this: I.IO<R, E, A>, pf: (e: E) => Option<E1>): I.IO<R, E1, A>

    /**
     * @rewrite refineOrDieWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    refineOrDieWith<R, E, A, E1>(this: I.IO<R, E, A>, pf: (e: E) => Option<E1>, f: (e: E) => unknown): I.IO<R, E1, A>

    /**
     * @rewrite reject_ from "@principia/base/IO"
     * @trace 0
     */
    reject<R, E, A, E1>(this: I.IO<R, E, A>, pf: (a: A) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite rejectIO_ from "@principia/base/IO"
     * @trace 0
     */
    rejectIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, pf: (a: A) => Option<I.IO<R1, E1, E1>>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite repeat_ from "@principia/base/IO"
     * @trace call
     */
    repeat<R, E, A, R1, B>(this: I.IO<R, E, A>, schedule: Schedule<R1, A, B>): I.IO<R & R1 & Has<Clock>, E, B>

    /**
     * @rewrite repeatN_ from "@principia/base/IO"
     * @trace call
     */
    repeatN<R, E, A>(this: I.IO<R, E, A>, n: number): I.IO<R, E, A>

    /**
     * @rewrite repeatOrElse_ from "@principia/base/IO"
     * @trace call
     */
    repeatOrElse<R, E, A, R1, B, R2, E2, C>(
      this: I.IO<R, E, A>,
      schedule: Schedule<R1, A, B>,
      f: (e: E, out: Option<B>) => I.IO<R2, E2, C>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, C | B>

    /**
     * @rewrite repeatOrElseEither_ from "@principia/base/IO"
     * @trace call
     */
    repeatOrElseEither<R, E, A, R1, B, R2, E2, C>(
      this: I.IO<R, E, A>,
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
    repeatUntilIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, f: (a: A) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite repeatWhile_ from "@principia/base/IO"
     * @trace 0
     */
    repeatWhile(f: Predicate<A>): I.IO<R, E, A>

    /**
     * @rewrite repeatWhileIO_ from "@principia/base/IO"
     * @trace 0
     */
    repeatWhileIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, f: (a: A) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

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
      this: I.IO<R, E, A>,
      schedule: Schedule<R1, I, O>,
      orElse: (e: E, out: O) => I.IO<R2, E2, A2>
    ): I.IO<R & R1 & R2 & Has<Clock>, E2, A | A2>

    /**
     * @rewrite retryOrElseEither_ from "@principia/base/IO"
     * @trace 1
     */
    retryOrElseEither<R, E extends I, A, R1, I, O, R2, E2, A2>(
      this: I.IO<R, E, A>,
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
    retryUntilIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, f: (e: E) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite retryWhile_ from "@principia/base/IO"
     * @trace 0
     */
    retryWhile(f: Predicate<E>): I.IO<R, E, A>

    /**
     * @rewrite retryWhileIO_ from "@principia/base/IO"
     * @trace 0
     */
    retryWhileIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, f: (e: E) => I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, A>

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
    sandboxWith<R, E, A, E1>(this: I.IO<R, E, A>, f: (_: I.IO<R, Cause<E>, A>) => I.IO<R, Cause<E1>, A>): I.IO<R, E1, A>

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
    summarized<R, E, A, R1, E1, B, C>(
      this: I.IO<R, E, A>,
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
    swapWith<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, f: (_: I.IO<R, A, E>) => I.IO<R1, A1, E1>): I.IO<R1, E1, A1>

    /**
     * @rewrite tap_ from "@principia/base/IO"
     * @trace 0
     */
    tap<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewrite tapCause_ from "@principia/base/IO"
     * @trace 0
     */
    tapCause<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (e: Cause<E>) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

    /**
     * @rewrite tapError_ from "@principia/base/IO"
     * @trace 0
     */
    tapError<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (e: E) => I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

    /**
     * @rewriteGetter timed from "@principia/base/IO"
     * @trace getter
     */
    timed: I.IO<R & Has<Clock>, E, readonly [number, A]>

    /**
     * @rewrite timedWith_ from "@principia/base/IO"
     * @trace call
     */
    timedWith<R, E, A, R1, E1>(
      this: I.IO<R, E, A>,
      msTime: I.IO<R1, E1, number>
    ): I.IO<R & R1, E | E1, readonly [number, A]>

    /**
     * @rewrite timeout_ from "@principia/base/IO"
     * @trace call
     */
    timeout(ms: number): I.IO<R & Has<Clock>, E, Option<A>>

    /**
     * @rewrite timeoutFail_ from "@principia/base/IO"
     * @trace call
     */
    timeoutFail<R, E, A, E1>(this: I.IO<R, E, A>, ms: number, onTimeout: () => E1): I.IO<R & Has<Clock>, E | E1, A>

    /**
     * @rewrite timeoutTo_ from "@principia/base/IO"
     * @trace call
     */
    timeoutTo<R, E, A, B, B1>(this: I.IO<R, E, A>, ms: number, b: B, f: (a: A) => B1): I.IO<R & Has<Clock>, E, B | B1>

    /**
     * @rewrite fromIO_ from "@principia/base/IO/Layer"
     * @trace call
     */
    toLayer<R, E, A>(this: I.IO<R, E, A>, tag: Tag<A>): L.Layer<R, E, Has<A>>

    /**
     * @rewrite fromRawIO from "@principia/base/IO/Layer"
     * @trace call
     */
    toLayerRaw<R, E, A>(this: I.IO<R, E, A>): L.Layer<R, E, A>

    /**
     * @rewrite fromIO from "@principia/base/IO/Managed"
     * @trace call
     */
    toManaged<R, E, A>(this: I.IO<R, E, A>): Managed<R, E, A>

    /**
     * @rewrite bracket_ from "@principia/base/IO/Managed"
     * @trace call
     */
    toManaged<R, E, A, R1>(this: I.IO<R, E, A>, release: (a: A) => I.IO<R1, never, any>): Managed<R & R1, E, A>

    /**
     * @rewrite tryOrElse_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    tryOrElse<R, E, A, R1, E1, A1, R2, E2, A2>(
      this: I.IO<R, E, A>,
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
    unrefine<R, E, A, E1>(this: I.IO<R, E, A>, pf: (u: unknown) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite unrefine_ from "@principia/base/IO"
     * @trace 0
     */
    unrefine<R, E, A, E1>(this: I.IO<R, E, A>, f: (_: unknown) => Option<E1>): I.IO<R, E | E1, A>

    /**
     * @rewrite unrefineWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    unrefineWith<R, E, A, E1, E2>(
      this: I.IO<R, E, A>,
      pf: (u: unknown) => Option<E1>,
      f: (e: E) => E2
    ): I.IO<R, E1 | E2, A>

    /**
     * @rewrite unrefineWith_ from "@principia/base/IO"
     * @trace 0
     * @trace 1
     */
    unrefineWith<R, E, A, E1, E2>(
      this: I.IO<R, E, A>,
      f: (_: unknown) => Option<E1>,
      g: (e: E) => E2
    ): I.IO<R, E1 | E2, A>

    /**
     * @rewrite unsandbox from "@principia/base/IO"
     * @trace call
     */
    unsandbox<R, E, A>(this: I.IO<R, Cause<E>, A>): I.IO<R, E, A>

    /**
     * @rewriteConstraint updateService_ from "@principia/base/IO"
     */
    updateService<R, E, A, T>(this: I.IO<R, E, A>, tag: Tag<T>): (f: (service: T) => T) => I.IO<R & Has<T>, E, A>

    /**
     * @rewriteConstraint updateServiceIO_ from "@principia/base/IO"
     */
    updateServiceIO<R, E, A, T>(
      this: I.IO<R, E, A>,
      tag: Tag<T>
    ): <R1, E1>(f: (service: T) => I.IO<R1, E1, T>) => I.IO<R & R1 & Has<T>, E | E1, A>

    /**
     * @rewrite when_ from "@principia/base/IO"
     * @trace 0
     */
    when<R, E, A>(this: I.IO<R, E, A>, b: () => boolean): I.IO<R, E, void>

    /**
     * @rewrite whenIO_ from "@principia/base/IO"
     * @trace call
     */
    whenIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, b: I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, void>

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
    ['|||']<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: I.IO<R1, E1, A1>): I.IO<Either<R, R1>, E | E1, A | A1>
  }
}
