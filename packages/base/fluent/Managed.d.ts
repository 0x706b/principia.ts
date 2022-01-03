import type { Clock } from '@principia/base/Clock'
import type { Either } from '@principia/base/Either'
import type { NoSuchElementError } from '@principia/base/Error'
import type { FiberContext } from '@principia/base/Fiber'
import type { Has } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Exit } from '@principia/base/IO/Exit'
import type { Layer } from '@principia/base/Layer'
import type * as M from '@principia/base/Managed'
import type { Maybe } from '@principia/base/Maybe'
import type { Erase, Monoid } from '@principia/base/prelude'
import type { Schedule } from '@principia/base/Schedule'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Managed: ManagedStaticOps
  export interface Managed<R, E, A> extends M.Managed<R, E, A> {}
  export interface UManaged<A> extends M.UManaged<A> {}
  export interface URManaged<R, A> extends M.URManaged<R, A> {}
  export interface FManaged<E, A> extends M.FManaged<E, A> {}
}

interface ManagedStaticOps {
  /**
   * @rewriteStatic askService from "@principia/base/Managed"
   */
  askService: typeof M.askService
  /**
   * @rewriteStatic asks from "@principia/base/Managed"
   */
  asks: typeof M.asks
  /**
   * @rewriteStatic asksIO from "@principia/base/Managed"
   */
  asksIO: typeof M.asksIO
  /**
   * @rewriteStatic asksManaged from "@principia/base/Managed"
   */
  asksManaged: typeof M.asksManaged
  /**
   * @rewriteStatic asksService from "@principia/base/Managed"
   */
  asksService: typeof M.asksService
  /**
   * @rewriteStatic asksServiceIO from "@principia/base/Managed"
   */
  asksServiceIO: typeof M.asksServiceIO
  /**
   * @rewriteStatic asksServiceManaged from "@principia/base/Managed"
   */
  asksServiceManaged: typeof M.asksServiceManaged
  /**
   * @rewriteStatic asksServices from "@principia/base/Managed"
   */
  asksServices: typeof M.asksServices
  /**
   * @rewriteStatic asksServicesIO from "@principia/base/Managed"
   */
  asksServicesIO: typeof M.asksServicesIO
  /**
   * @rewriteStatic asksServicesManaged from "@principia/base/Managed"
   */
  asksServicesManaged: typeof M.asksServicesManaged
  /**
   * @rewriteStatic asksServicesT from "@principia/base/Managed"
   */
  asksServicesT: typeof M.asksServicesT
  /**
   * @rewriteStatic asksServicesTIO from "@principia/base/Managed"
   */
  asksServicesTIO: typeof M.asksServicesTIO
  /**
   * @rewriteStatic asksServicesTManaged from "@principia/base/Managed"
   */
  asksServicesTManaged: typeof M.asksServicesTManaged
  /**
   * @rewriteStatic bracket_ from "@principia/base/Managed"
   */
  bracket<R, E, A, R1>(acquire: I.IO<R, E, A>, release: (a: A) => I.IO<R1, never, unknown>): M.Managed<R & R1, E, A>
  /**
   * @rewriteStatic bracket from "@principia/base/Managed"
   * @dataFirst bracket_
   */
  bracket<A, R1>(
    release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
  ): <R, E>(acquire: I.IO<R, E, A>) => M.Managed<R & R1, E, A>
  /**
   * @rewriteStatic bracketExit_ from "@principia/base/Managed"
   */
  bracketExit<R, E, A, R1>(
    acquire: I.IO<R, E, A>,
    release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
  ): M.Managed<R & R1, E, A>
  /**
   * @rewriteStatic bracketExit from "@principia/base/Managed"
   * @dataFirst bracketExit_
   */
  bracketExit<A, R1>(
    release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
  ): <R, E>(acquire: I.IO<R, E, A>) => M.Managed<R & R1, E, A>
  /**
   * @rewriteStatic concurrency from "@principia/base/Managed"
   */
  concurrency: typeof M.concurrency
  /**
   * @rewriteStatic defer from "@principia/base/Managed"
   */
  defer: typeof M.defer
  /**
   * @rewriteStatic do from "@principia/base/Managed"
   */
  do: typeof M.do
  /**
   * @rewriteStatic fail from "@principia/base/Managed"
   */
  fail: typeof M.fail
  /**
   * @rewriteStatic failCause from "@principia/base/Managed"
   */
  failCause: typeof M.failCause
  /**
   * @rewriteStatic failCauseLazy from "@principia/base/Managed"
   */
  failCauseLazy: typeof M.failCauseLazy
  /**
   * @rewriteStatic failCauseWithTrace from "@principia/base/Managed"
   */
  failCauseWithTrace: typeof M.failCauseWithTrace
  /**
   * @rewriteStatic failLazy from "@principia/base/Managed"
   */
  failLazy: typeof M.failLazy
  /**
   * @rewriteStatic finalizer from "@principia/base/Managed"
   */
  finalizer: typeof M.finalizer
  /**
   * @rewriteStatic finalizerExit from "@principia/base/Managed"
   */
  finalizerExit: typeof M.finalizerExit
  /**
   * @rewriteStatic finalizerRef from "@principia/base/Managed"
   */
  finalizerRef: typeof M.finalizerRef
  /**
   * @rewriteStatic foldMap_ from "@principia/base/Managed"
   * @dataFirst foldMap_
   */
  foldMap<M>(M: Monoid<M>): {
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M): <R, E>(as: Iterable<M.Managed<R, E, A>>) => M.Managed<R, E, M>
    /**
     * @trace 1
     */
    <R, E, A>(as: Iterable<M.Managed<R, E, A>>, f: (a: A) => M): M.Managed<R, E, M>
  }
  /**
   * @rewriteStatic foldMapC_ from "@principia/base/Managed"
   * @dataFirst foldMapC_
   */
  foldMapC<M>(M: Monoid<M>): {
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M): <R, E>(as: Iterable<M.Managed<R, E, A>>) => M.Managed<R, E, M>
    /**
     * @trace 1
     */
    <R, E, A>(as: Iterable<M.Managed<R, E, A>>, f: (a: A) => M): M.Managed<R, E, M>
  }
  /**
   * @rewriteStatic foldl_ from "@principia/base/Managed"
   * @trace 2
   */
  foldl<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => M.Managed<R, E, B>): M.Managed<R, E, B>
  /**
   * @rewriteStatic foldl from "@principia/base/Managed"
   * @dataFirst foldl_
   * @trace 1
   */
  foldl<R, E, A, B>(b: B, f: (b: B, a: A) => M.Managed<R, E, B>): (as: Iterable<A>) => M.Managed<R, E, B>
  /**
   * @rewriteStatic foreach from "@principia/base/Managed"
   * @dataFirst foreach_
   * @trace 0
   */
  foreach<R, E, A, A1>(f: (a: A) => M.Managed<R, E, A1>): (as: Iterable<A>) => M.Managed<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreach_ from "@principia/base/Managed"
   * @trace 1
   */
  foreach<R, E, A, A1>(as: Iterable<A>, f: (a: A) => M.Managed<R, E, A1>): M.Managed<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachC from "@principia/base/Managed"
   * @dataFirst foreachC_
   * @trace 0
   */
  foreachC<R, E, A, A1>(f: (a: A) => M.Managed<R, E, A1>): (as: Iterable<A>) => M.Managed<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachC_ from "@principia/base/Managed"
   * @trace 1
   */
  foreachC<R, E, A, A1>(as: Iterable<A>, f: (a: A) => M.Managed<R, E, A1>): M.Managed<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachUnit_ from "@principia/base/Managed"
   * @trace 1
   */
  foreachUnit<R, E, A, A1>(as: Iterable<A>, f: (a: A) => M.Managed<R, E, A1>): M.Managed<R, E, void>
  /**
   * @rewriteStatic foreachUnit from "@principia/base/Managed"
   * @dataFirst foreachUnit_
   * @trace 0
   */
  foreachUnit<R, E, A, A1>(f: (a: A) => M.Managed<R, E, A1>): (as: Iterable<A>) => M.Managed<R, E, void>
  /**
   * @rewriteStatic foreachUnitC from "@principia/base/Managed"
   * @dataFirst foreachUnitC_
   * @trace 0
   */
  foreachUnitC<R, E, A, A1>(f: (a: A) => M.Managed<R, E, A1>): (as: Iterable<A>) => M.Managed<R, E, void>
  /**
   * @rewriteStatic foreachUnitC_ from "@principia/base/Managed"
   * @trace 1
   */
  foreachUnitC<R, E, A, A1>(as: Iterable<A>, f: (a: A) => M.Managed<R, E, A1>): M.Managed<R, E, void>
  /**
   * @rewriteStatic fromEitherLazy from "@principia/base/Managed"
   */
  fromEitherLazy: typeof M.fromEitherLazy
  /**
   * @rewriteStatic fromIO from "@principia/base/Managed"
   */
  fromIO: typeof M.fromIO
  /**
   * @rewriteStatic fromIOUninterruptible from "@principia/base/Managed"
   */
  fromIOUninterruptible: typeof M.fromIOUninterruptible
  /**
   * @rewriteStatic gen from "@principia/base/Managed"
   */
  gen: typeof M.gen
  /**
   * @rewriteStatic halt from "@principia/base/Managed"
   */
  halt: typeof M.halt
  /**
   * @rewriteStatic haltLazy from "@principia/base/Managed"
   */
  haltLazy: typeof M.haltLazy
  /**
   * @rewriteStatic makeReservation_ from "@principia/base/Managed"
   * @dataFirst makeReservation_
   */
  makeReservation<R1>(
    release: (exit: Exit<any, any>) => I.IO<R1, never, A>
  ): <R, E, A>(acquire: I.IO<R, E, A>) => M.Reservation<R & R1, E, A>
  /**
   * @rewriteStatic makeReservation_ from "@principia/base/Managed"
   */
  makeReservation<R, E, A, R1>(
    acquire: I.IO<R, E, A>,
    release: (exit: Exit<any, any>) => I.IO<R1, never, any>
  ): M.Reservation<R & R1, E, A>
  /**
   * @rewriteStatic makeReserve from "@principia/base/Managed"
   */
  makeReserve: typeof M.makeReserve
  /**
   * @rewriteStatic pure from "@principia/base/Managed"
   */
  pure: typeof M.pure
  /**
   * @rewriteStatic reserve from "@principia/base/Managed"
   */
  reserve: typeof M.reserve
  /**
   * @rewriteStatic scope from "@principia/base/Managed"
   */
  scope: typeof M.scope
  /**
   * @rewriteStatic sequenceIterable from "@principia/base/Managed"
   */
  sequenceIterable: typeof M.sequenceIterable
  /**
   * @rewriteStatic sequenceIterableC from "@principia/base/Managed"
   */
  sequenceIterableC: typeof M.sequenceIterableC
  /**
   * @rewriteStatic sequenceIterableUnit from "@principia/base/Managed"
   */
  sequenceIterableUnit: typeof M.sequenceIterableUnit
  /**
   * @rewriteStatic sequenceIterableUnitC from "@principia/base/Managed"
   */
  sequenceIterableUnitC: typeof M.sequenceIterableUnitC
  /**
   * @rewriteStatic succeed from "@principia/base/Managed"
   */
  succeed: typeof M.succeed
  /**
   * @rewriteStatic succeedLazy from "@principia/base/Managed"
   */
  succeedLazy: typeof M.succeedLazy
  /**
   * @rewriteStatic switchable from "@principia/base/Managed"
   */
  switchable: typeof M.switchable
  /**
   * @rewriteStatic try from "@principia/base/Managed"
   */
  try: typeof M.try
  /**
   * @rewriteStatic tryCatch_ from "@principia/base/Managed"
   */
  tryCatch: typeof M.tryCatch_
}

declare module '@principia/base/Managed/core' {
  export interface Managed<R, E, A> {
    /**
     * @rewrite as_ from "@principia/base/Managed"
     * @trace call
     */
    ['$>']<R, E, A, B>(this: M.Managed<R, E, A>, b: B): M.Managed<R, E, B>

    /**
     * @rewrite apSecondC_ from "@principia/base/Managed"
     * @trace call
     */
    ['&>']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite apSecond_ from "@principia/base/Managed"
     * @trace call
     */
    ['*>']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite map_ from "@principia/base/Managed"
     * @trace 0
     */
    ['<$>']<R, E, A, B>(this: M.Managed<R, E, A>, f: (a: A) => B): M.Managed<R, E, B>

    /**
     * @rewrite apFirstC_ from "@principia/base/Managed"
     * @trace call
     */
    ['<&']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite crossC_ from "@principia/base/Managed"
     * @trace call
     */
    ['<&&>']<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     * @rewrite apFirst_ from "@principia/base/Managed"
     * @trace call
     */
    ['<*']<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite cross_ from "@principia/base/Managed"
     * @trace call
     */
    ['<**>']<R, E, A, R1, E1, B>(
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
     * @rewrite apFirst_ from "@principia/base/Managed"
     * @trace call
     */
    apFirst<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite apFirstC_ from "@principia/base/Managed"
     * @trace call
     */
    apFirstC<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, A>

    /**
     * @rewrite apSecond_ from "@principia/base/Managed"
     * @trace call
     */
    apSecond<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite apSecondC_ from "@principia/base/Managed"
     * @trace call
     */
    apSecondC<R, E, A, R1, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<R1, E1, B>): M.Managed<R & R1, E | E1, B>

    /**
     * @rewrite as_ from "@principia/base/Managed"
     * @trace 0
     */
    as<R, E, A, B>(this: M.Managed<R, E, A>, b: B): M.Managed<R, E, B>

    /**
     * @rewriteGetter asJust from "@principia/base/Managed"
     * @trace getter
     */
    asJust: M.Managed<R, E, Maybe<A>>

    /**
     * @rewriteGetter asJustError from "@principia/base/Managed"
     * @trace getter
     */
    asJustError: M.Managed<R, Maybe<E>, A>

    /**
     * @rewrite asLazy_ from "@principia/base/Managed"
     * @trace 0
     */
    asLazy<R, E, A, B>(this: M.Managed<R, E, A>, b: () => B): M.Managed<R, E, B>

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
     * @rewrite catchJust_ from "@principia/base/Managed"
     * @trace 0
     */
    catchJust<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      pf: (e: E) => Maybe<Managed<R1, E1, B>>
    ): M.Managed<R & R1, E | E1, A | B>

    /**
     * @rewrite catchJustCause_ from "@principia/base/Managed"
     * @trace 0
     */
    catchJustCause<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      pf: (cause: Cause<E>) => Maybe<Managed<R1, E1, B>>
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
     * @rewrite chainS_ from "@principia/base/Managed"
     * @trace 1
     */
    chainS<R, E, K, N extends string, R1, E1, A1>(
      this: Managed<R, E, K>,
      name: Exclude<N, keyof K>,
      f: (_: K) => Managed<R1, E1, A1>
    ): Managed<R & R1, E | E1, { [k in N | keyof K]: k extends keyof K ? K[k] : A1 }>

    /**
     * @rewrite collect_ from "@principia/base/Managed"
     * @trace 1
     */
    collect<R, E, A, E1, B>(this: M.Managed<R, E, A>, e: E1, pf: (a: A) => Maybe<B>): M.Managed<R, E | E1, B>

    /**
     * @rewrite collectManaged_ from "@principia/base/Managed"
     * @trace 1
     */
    collectManaged<R, E, A, E1, R2, E2, B>(
      this: M.Managed<R, E, A>,
      e: E1,
      pf: (a: A) => Maybe<M.Managed<R2, E2, B>>
    ): M.Managed<R & R2, E | E1 | E2, B>

    /**
     * @rewrite compose_ from "@principia/base/Managed"
     * @trace call
     */
    compose<R, E, A, E1, B>(this: M.Managed<R, E, A>, that: M.Managed<A, E1, B>): M.Managed<R, E | E1, B>

    /**
     * @rewrite cross_ from "@principia/base/Managed"
     * @trace call
     */
    cross<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

    /**
     *
     * @rewrite crossC_ from "@principia/base/Managed"
     * @trace call
     */
    crossC<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, A>,
      that: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, readonly [A, B]>

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
     * @rewrite crossWithC_ from "@principia/base/Managed"
     * @trace 1
     */
    crossWithC<R, E, A, R1, E1, B, C>(
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
    get<R, A>(this: M.Managed<R, never, Maybe<A>>): M.Managed<R, Maybe<never>, A>

    /**
     * @rewrite give_ from "@principia/base/Managed"
     * @trace call
     */
    give<R, E, A>(this: M.Managed<R, E, A>, env: R): M.Managed<unknown, E, A>

    /**
     * @rewrite giveSome_ from "@principia/base/Managed"
     * @trace call
     */
    giveSome<R, E, A, R0>(this: M.Managed<R, E, A>, env: R0): M.Managed<Erase<R, R0>, E, A>

    /**
     * @rewrite giveSomeLayer_ from "@principia/base/Managed"
     * @trace call
     */
    giveSome<R, E, A, R1, E1, A1>(
      this: Managed<R, E, A>,
      layer: Layer<R1, E1, A1>
    ): M.Managed<Erase<R & R1, A1>, E | E1, A>

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
     * @rewrite justOrElse_ from "@principia/base/Managed"
     * @trace 0
     */
    justOrElse<R, E, A, B>(this: M.Managed<R, E, Maybe<A>>, onNothing: () => B): M.Managed<R, E, A | B>

    /**
     * @rewrite justOrElseManaged_ from "@principia/base/Managed"
     * @trace call
     */
    justOrElseManaged<R, E, A, R1, E1, B>(
      this: M.Managed<R, E, Maybe<A>>,
      onNothing: M.Managed<R1, E1, B>
    ): M.Managed<R & R1, E | E1, A | B>

    /**
     * @rewrite justOrFail_ from "@principia/base/Managed"
     * @trace call
     */
    justOrFail<R, E, A>(this: M.Managed<R, E, Maybe<A>>): M.Managed<R, E | NoSuchElementError, A>

    /**
     * @rewrite justOrFailWith_ from "@principia/base/Managed"
     * @trace call
     */
    justOrFailWith<R, E, A, E1>(this: M.Managed<R, E, Maybe<A>>, onNone: () => E1): M.Managed<R, E | E1, A>

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
     * @rewriteGetter Maybe from "@principia/base/Managed"
     * @trace getter
     */
    maybe: M.Managed<R, never, Maybe<A>>

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
    none<R, E, A>(this: M.Managed<R, E, Maybe<A>>): M.Managed<R, Maybe<E>, void>

    /**
     * @rewrite optional from "@principia/base/Managed"
     * @trace call
     */
    optional<R, E, A>(this: M.Managed<R, Maybe<E>, A>): M.Managed<R, E, Maybe<A>>

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
      this: M.Managed<R, Maybe<E>, A>,
      that: () => M.Managed<R1, Maybe<E1>, B>
    ): M.Managed<R & R1, Maybe<E | E1>, A | B>

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
     * @rewrite pureS_ from "@principia/base/Managed"
     * @trace 1
     */
    pureS<R, E, K, N extends string, A>(
      this: Managed<R, E, K>,
      name: Exclude<N, keyof K>,
      f: (_: K) => A
    ): Managed<R, E, { [k in N | keyof K]: k extends keyof K ? K[k] : A }>

    /**
     * @rewrite refineOrHalt_ from "@principia/base/Managed"
     * @trace 0
     */
    refineOrHalt<R, E, A, E1>(this: M.Managed<R, E, A>, pf: (e: E) => Maybe<E1>): M.Managed<R, E1, A>

    /**
     * @rewrite refineOrHaltWith_ from "@principia/base/Managed"
     * @trace 0
     * @trace 1
     */
    refineOrHaltWith<R, E, A, E1>(
      this: M.Managed<R, E, A>,
      pf: (e: E) => Maybe<E1>,
      f: (e: E) => unknown
    ): M.Managed<R, E1, A>

    /**
     * @rewrite reject_ from "@principia/base/Managed"
     * @trace 0
     */
    reject<R, E, A, E1>(this: M.Managed<R, E, A>, pf: (a: A) => Maybe<E1>): M.Managed<R, E | E1, A>

    /**
     * @rewrite rejectManaged_ from "@principia/base/Managed"
     * @trace 0
     */
    rejectManaged<R, E, A, R1, E1>(
      this: M.Managed<R, E, A>,
      pf: (a: A) => Maybe<M.Managed<R1, E1, E1>>
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
    timeout<R, E, A>(this: M.Managed<R, E, A>, ms: number): M.Managed<R & Has<Clock>, E, Maybe<A>>

    /**
     * @rewrite toS_ from "@principia/base/Managed"
     * @trace call
     */
    toS<R, E, A, N extends string>(ma: Managed<R, E, A>, name: N): Managed<R, E, { [k in N]: A }>

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
     * @rewrite withConcurrency_ from "@principia/base/Managed"
     */
    withConcurrency<R, E, A>(this: M.Managed<R, E, A>, n: number): M.Managed<R, E, A>

    /**
     * @rewriteGetter withConcurrencyUnbounded from "@principia/base/Managed"
     */
    withConcurrencyUnbounded: M.Managed<R, E, A>

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
