import type { Async } from '@principia/base/Async'
import type { Chunk } from '@principia/base/Chunk'
import type { Clock } from '@principia/base/Clock'
import type { Either } from '@principia/base/Either'
import type { NoSuchElementError } from '@principia/base/Error'
import type { Eval } from '@principia/base/Eval'
import type { Fiber, FiberContext, FiberId, InterruptStatus, RuntimeFiber } from '@principia/base/Fiber'
import type { Future } from '@principia/base/Future'
import type { Has, Tag } from '@principia/base/Has'
import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Exit } from '@principia/base/IO/Exit'
import type { IOEnv } from '@principia/base/IOEnv'
import type * as L from '@principia/base/Layer'
import type { Managed, Reservation } from '@principia/base/Managed'
import type { Maybe } from '@principia/base/Maybe'
import type {
  Erase,
  Monoid,
  Predicate,
  ServicesStruct,
  ServicesTuple,
  UnionToIntersection
} from '@principia/base/prelude'
import type { Schedule } from '@principia/base/Schedule'
import type { Scope } from '@principia/base/Scope'
import type { Supervisor } from '@principia/base/Supervisor'
import type { Sync } from '@principia/base/Sync'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const IO: IOStaticOps
  export interface IO<R, E, A> extends I.IO<R, E, A> {}
  export interface UIO<A> extends I.IO<unknown, never, A> {}
  export interface FIO<E, A> extends I.IO<unknown, E, A> {}
  export interface RIO<R, A> extends I.IO<R, never, A> {}
}

declare module '@principia/base/IO/primitives' {
  export interface IO<R, E, A> extends IOOps<R, E, A> {}
  export interface FIO<E, A> extends IOOps<unknown, E, A> {}
  export interface UIO<A> extends IOOps<unknown, never, A> {}
  export interface URIO<R, A> extends IOOps<R, never, A> {}
}

export interface IOStaticOps {
  /**
   * @rewriteStatic Applicative from "@principia/base/IO"
   */
  Applicative: typeof I.Applicative
  /**
   * @rewriteStatic ApplicativePar from "@principia/base/IO"
   */
  ApplicativePar: typeof I.ApplicativePar
  /**
   * @rewriteStatic Apply from "@principia/base/IO"
   */
  Apply: typeof I.Apply
  /**
   * @rewriteStatic ApplyPar from "@principia/base/IO"
   */
  ApplyPar: typeof I.ApplyPar
  /**
   * @rewriteStatic Category from "@principia/base/IO"
   */
  Category: typeof I.Category
  /**
   * @rewriteStatic Concurrency from "@principia/base/IO"
   */
  Concurrency: typeof IO.Concurrency
  /**
   * @rewriteStatic Functor from "@principia/base/IO"
   */
  Functor: typeof I.Functor
  /**
   * @rewriteStatic Monad from "@principia/base/IO"
   */
  Monad: typeof I.Monad
  /**
   * @rewriteStatic MonadExcept from "@principia/base/IO"
   */
  MonadExcept: typeof I.MonadExcept
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/IO"
   */
  MonoidalFunctor: typeof I.MonoidalFunctor
  /**
   * @rewriteStatic MonoidalFunctorPar from "@principia/base/IO"
   */
  MonoidalFunctorPar: typeof I.MonoidalFunctorPar
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/IO"
   */
  SemimonoidalFunctor: typeof I.SemimonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctorPar from "@principia/base/IO"
   */
  SemimonoidalFunctorPar: typeof I.SemimonoidalFunctorPar
  /**
   * @rewriteStatic async from "@principia/base/IO"
   */
  async: typeof I.async
  /**
   * @rewriteStatic asyncIO from "@principia/base/IO"
   */
  asyncIO: typeof I.asyncIO
  /**
   * @rewriteStatic asyncInterrupt from "@principia/base/IO"
   */
  asyncInterrupt: typeof I.asyncInterrupt
  /**
   * @rewriteStatic asyncInterruptEither from "@principia/base/IO"
   */
  asyncInterruptEither: typeof I.asyncInterruptEither
  /**
   * @rewriteStatic asyncInterruptPromise from "@principia/base/IO"
   */
  asyncInterruptPromise: typeof I.asyncInterruptPromise
  /**
   * @rewriteStatic asyncMaybe from "@principia/base/IO"
   */
  asyncMaybe: typeof I.asyncMaybe
  /**
   * @rewriteStatic checkInterruptible from "@principia/base/IO"
   */
  checkInterruptible: typeof I.checkInterruptible
  /**
   * @rewriteStatic concurrency from "@principia/base/IO"
   */
  concurrency: typeof IO.concurrency
  /**
   * @rewriteStatic concurrencyWith from "@principia/base/IO"
   */
  concurrencyWith: typeof IO.concurrencyWith
  /**
   * @rewriteStatic defer from "@principia/base/IO"
   */
  defer: typeof I.defer
  /**
   * @rewriteStatic deferMaybeWith from "@principia/base/IO"
   */
  deferMaybeWith: typeof I.deferMaybeWith
  /**
   * @rewriteStatic deferTry from "@principia/base/IO"
   */
  deferTry: typeof I.deferTry
  /**
   * @rewriteStatic deferTryCatch from "@principia/base/IO"
   */
  deferTryCatch: typeof I.deferTryCatch
  /**
   * @rewriteStatic deferTryCatchWith from "@principia/base/IO"
   */
  deferTryCatchWith: typeof I.deferTryCatchWith
  /**
   * @rewriteStatic deferTryWith from "@principia/base/IO"
   */
  deferTryWith: typeof I.deferTryWith
  /**
   * @rewriteStatic deferWith from "@principia/base/IO"
   */
  deferWith: typeof I.deferWith
  /**
   * @rewriteStatic descriptor from "@principia/base/IO"
   */
  descriptor: typeof I.descriptor
  /**
   * @rewriteStatic descriptorWith from "@principia/base/IO"
   */
  descriptorWith: typeof I.descriptorWith
  /**
   * @rewriteStatic fail from "@principia/base/IO"
   */
  fail: typeof I.fail
  /**
   * @rewriteStatic failCause from "@principia/base/IO"
   */
  failCause: typeof I.failCause
  /**
   * @rewriteStatic failCauseLazy from "@principia/base/IO"
   */
  failCauseLazy: typeof I.failCauseLazy
  /**
   * @rewriteStatic failCauseWithTrace from "@principia/base/IO"
   */
  failCauseWithTrace: typeof I.failCauseWithTrace
  /**
   * @rewriteStatic failLazy from "@principia/base/IO"
   */
  failLazy: typeof I.failLazy
  /**
   * @rewriteStatic fiberId from "@principia/base/IO"
   */
  fiberId: typeof I.fiberId
  /**
   * @rewriteStatic filter_ from "@principia/base/IO"
   * @trace 1
   */
  filter<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filter from "@principia/base/IO"
   * @dataFirst filter_
   * @trace 0
   */
  filter<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Iterable<A>) => I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterC_ from "@principia/base/IO"
   * @trace 1
   */
  filterC<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterC from "@principia/base/IO"
   * @dataFirst filterC_
   * @trace 0
   */
  filterC<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Iterable<A>) => I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterNot from "@principia/base/IO"
   * @dataFirst filterNot_
   * @trace 0
   */
  filterNot<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Iterable<A>) => I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterNot_ from "@principia/base/IO"
   * @trace 1
   */
  filterNot<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterNotC from "@principia/base/IO"
   * @dataFirst filterNotC_
   * @trace 0
   */
  filterNotC<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Iterable<A>) => I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic filterNotC_ from "@principia/base/IO"
   * @trace 1
   */
  filterNotC<R, E, A>(as: Iterable<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>>
  /**
   * @rewriteStatic firstSuccess from "@principia/base/IO"
   */
  firstSuccess: typeof I.firstSuccess
  /**
   * @rewriteStatic foldMap_ from "@principia/base/IO"
   * @dataFirst foldMap_
   */
  foldMap<M>(M: Monoid<M>): {
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M): <R, E>(as: Iterable<I.IO<R, E, A>>) => I.IO<R, E, M>
    /**
     * @trace 1
     */
    <R, E, A>(as: Iterable<I.IO<R, E, A>>, f: (a: A) => M): I.IO<R, E, M>
  }
  /**
   * @rewriteStatic foldMapC_ from "@principia/base/IO"
   * @dataFirst foldMapC_
   */
  foldMapC<M>(M: Monoid<M>): {
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M): <R, E>(as: Iterable<I.IO<R, E, A>>) => I.IO<R, E, M>
    /**
     * @trace 1
     */
    <R, E, A>(as: Iterable<I.IO<R, E, A>>, f: (a: A) => M): I.IO<R, E, M>
  }
  /**
   * @rewriteStatic foldl_ from "@principia/base/IO"
   * @trace 2
   */
  foldl<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B>
  /**
   * @rewriteStatic foldl from "@principia/base/IO"
   * @dataFirst foldl_
   * @trace 1
   */
  foldl<R, E, A, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, B>
  /**
   * @rewriteStatic foldr_ from "@principia/base/IO"
   * @trace 2
   */
  foldr<R, E, A, B>(as: Iterable<A>, b: I.UIO<B>, f: (a: A, b: I.IO<R, E, B>) => I.IO<R, E, B>): I.IO<R, E, B>
  /**
   * @rewriteStatic foldr from "@principia/base/IO"
   * @dataFirst foldr_
   * @trace 1
   */
  foldr<R, E, A, B>(b: I.UIO<B>, f: (a: A, b: I.IO<R, E, B>) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, B>
  /**
   * @rewriteStatic foreach_ from "@principia/base/IO"
   * @trace 1
   */
  foreach<R, E, A, A1>(as: Iterable<A>, f: (a: A) => I.IO<R, E, A1>): I.IO<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreach from "@principia/base/IO"
   * @dataFirst foreach_
   * @trace 0
   */
  foreach<R, E, A, A1>(f: (a: A) => I.IO<R, E, A1>): (as: Iterable<A>) => I.IO<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachC_ from "@principia/base/IO"
   * @trace 1
   */
  foreachC<R, E, A, A1>(as: Iterable<A>, f: (a: A) => I.IO<R, E, A1>): I.IO<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachC from "@principia/base/IO"
   * @dataFirst foreachC_
   * @trace 0
   */
  foreachC<R, E, A, A1>(f: (a: A) => I.IO<R, E, A1>): (as: Iterable<A>) => I.IO<R, E, Chunk<A1>>
  /**
   * @rewriteStatic foreachUnit from "@principia/base/IO"
   * @dataFirst foreachUnit_
   * @trace 0
   */
  foreachUnit<R, E, A, A1>(f: (a: A) => I.IO<R, E, A1>): (as: Iterable<A>) => I.IO<R, E, void>
  /**
   * @rewriteStatic foreachUnit_ from "@principia/base/IO"
   * @trace 1
   */
  foreachUnit<R, E, A, A1>(as: Iterable<A>, f: (a: A) => I.IO<R, E, A1>): I.IO<R, E, void>
  /**
   * @rewriteStatic foreachUnitC_ from "@principia/base/IO"
   * @trace 1
   */
  foreachUnitC<R, E, A, A1>(as: Iterable<A>, f: (a: A) => I.IO<R, E, A1>): I.IO<R, E, void>
  /**
   * @rewriteStatic foreachUnitC from "@principia/base/IO"
   * @dataFirst foreachUnitC_
   * @trace 0
   */
  foreachUnitC<R, E, A, A1>(f: (a: A) => I.IO<R, E, A1>): (as: Iterable<A>) => I.IO<R, E, void>
  /**
   * @rewriteStatic forkAll from "@principia/base/IO"
   */
  forkAll: typeof I.forkAll
  /**
   * @rewriteStatic forkAllUnit from "@principia/base/IO"
   */
  forkAllUnit: typeof I.forkAllUnit
  /**
   * @rewriteStatic forkScope from "@principia/base/IO"
   */
  forkScope: typeof I.forkScope
  /**
   * @rewriteStatic forkScopeMask from "@principia/base/IO"
   */
  forkScopeMask: typeof I.forkScopeMask_
  /**
   * @rewriteStatic forkScopeWith from "@principia/base/IO"
   */
  forkScopeWith: typeof I.forkScopeWith
  /**
   * @rewriteStatic fromSync from "@principia/base/IO"
   */
  from<R, E, A>(sync: Sync<R, E, A>): I.IO<R, E, A>
  /**
   * @rewriteStatic fromMaybe from "@principia/base/IO"
   */
  from<A>(maybe: Maybe<A>): I.IO<unknown, Maybe<never>, A>
  /**
   * @rewriteStatic fromMaybeLazy from "@principia/base/IO"
   */
  from<A>(maybe: () => Maybe<A>): I.IO<unknown, Maybe<never>, A>
  /**
   * @rewriteStatic fromAsync from "@principia/base/IO"
   */
  from<R, E, A>(async: Async<R, E, A>): I.IO<R, E, A>
  /**
   * @rewriteStatic fromExit from "@principia/base/IO"
   */
  from<E, A>(exit: Exit<E, A>): I.IO<unknown, E, A>
  /**
   * @rewriteStatic fromExitLazy from "@principia/base/IO"
   */
  from<E, A>(exit: () => Exit<E, A>): I.IO<unknown, E, A>
  /**
   * @rewriteStatic fromPromise from "@principia/base/IO"
   */
  from<A>(promise: () => globalThis.Promise<A>): I.IO<unknown, unknown, A>
  /**
   * @rewriteStatic fromPromiseCatch from "@principia/base/IO"
   */
  from<E, A>(promise: () => globalThis.Promise<A>, onReject: (reason: unknown) => E): I.IO<unknown, E, A>
  /**
   * @rewriteStatic fromEitherLazy from "@principia/base/IO"
   */
  from<E, A>(either: () => Either<E, A>): I.IO<unknown, E, A>
  /**
   * @rewriteStatic fromEval from "@principia/base/IO"
   */
  from<A>(eval: Eval<A>): I.IO<unknown, never, A>
  /**
   * @rewriteStatic fromEither from "@principia/base/IO"
   */
  from<E, A>(either: Either<E, A>): I.IO<unknown, E, A>
  /**
   * @rewriteStatic fromAsync from "@principia/base/IO"
   */
  fromAsync: typeof I.fromAsync
  /**
   * @rewriteStatic fromEither from "@principia/base/IO"
   */
  fromEither: typeof I.fromEither

  /**
   * @rewriteStatic fromEitherLazy from "@principia/base/IO"
   */
  fromEitherLazy: typeof I.fromEitherLazy

  /**
   * @rewriteStatic fromEval from "@principia/base/IO"
   */
  fromEval: typeof I.fromEval

  /**
   * @rewriteStatic fromExit from "@principia/base/IO"
   */
  fromExit: typeof I.fromExit

  /**
   * @rewriteStatic fromExitLazy from "@principia/base/IO"
   */
  fromExitLazy: typeof I.fromExitLazy
  /**
   * @rewriteStatic fromMaybe from "@principia/base/IO"
   */
  fromMaybe: typeof I.fromMaybe

  /**
   * @rewriteStatic fromMaybeLazy from "@principia/base/IO"
   */
  fromMaybeLazy: typeof I.fromMaybeLazy

  /**
   * @rewriteStatic fromPromise from "@principia/base/IO"
   */
  fromPromise: typeof I.fromPromise

  /**
   * @rewriteStatic fromPromiseCatch from "@principia/base/IO"
   */
  fromPromiseCatch: typeof I.fromPromiseCatch

  /**
   * @rewriteStatic fromPromiseHalt from "@principia/base/IO"
   */
  fromPromiseHalt: typeof I.fromPromiseHalt

  /**
   * @rewriteStatic fromSync from "@principia/base/IO"
   */
  fromSync: typeof I.fromSync

  /**
   * @rewriteStatic gen from "@principia/base/IO"
   */
  gen: typeof I.gen

  /**
   * @rewriteStatic getOrFail from "@principia/base/IO"
   * @trace call
   */
  getOrFail<A>(Maybe: Maybe<A>): I.FIO<NoSuchElementError, A>

  /**
   * @rewriteStatic getOrFailUnit from "@principia/base/IO"
   * @trace call
   */
  getOrFailUnit<A>(Maybe: Maybe<A>): I.FIO<void, A>

  /**
   * @rewriteStatic getOrFailWith from "@principia/base/IO"
   * @dataFirst getOrFailWith_
   * @trace 0
   */
  getOrFailWith<E>(onNothing: () => E): <A>(Maybe: Maybe<A>) => I.FIO<E, A>

  /**
   * @rewriteStatic getOrFailWith_ from "@principia/base/IO"
   * @trace call
   * @trace 1
   */
  getOrFailWith<E, A>(Maybe: Maybe<A>, onNothing: () => E): I.FIO<E, A>

  /**
   * @rewriteStatic getState from "@principia/base/IO"
   */
  getState: typeof I.getState

  /**
   * @rewriteStatic getStateWith from "@principia/base/IO"
   */
  getStateWith: typeof I.getStateWith

  /**
   * @rewriteStatic halt from "@principia/base/IO"
   */
  halt: typeof I.halt

  /**
   * @rewriteStatic haltLazy from "@principia/base/IO"
   */
  haltLazy: typeof I.haltLazy

  /**
   * @rewriteStatic haltMessage from "@principia/base/IO"
   */
  haltMessage: typeof I.haltMessage

  /**
   * @rewriteStatic id from "@principia/base/IO"
   */
  id: typeof I.id

  /**
   * @rewriteStatic interrupt from "@principia/base/IO"
   */
  interrupt: typeof I.interrupt

  /**
   * @rewriteStatic interruptAs from "@principia/base/IO"
   */
  interruptAs: typeof I.interruptAs
  /**
   * @rewriteStatic iterate_ from "@principia/base/IO"
   */
  iterate: typeof I.iterate_
  /**
   * @rewriteStatic loop_ from "@principia/base/IO"
   */
  loop: typeof I.loop_
  /**
   * @rewriteStatic loopUnit_ from "@principia/base/IO"
   */
  loopUnit: typeof I.loopUnit_
  /**
   * @rewriteStatic mapN from "@principia/base/IO"
   */
  mapN: typeof I.mapN
  /**
   * @rewriteStatic mapNC from "@principia/base/IO"
   */
  mapNC: typeof I.mapNC
  /**
   * @rewriteStatic memoize from "@principia/base/IO"
   */
  memoize: typeof I.memoize

  /**
   * @rewriteStatic memoizeEq from "@principia/base/IO"
   */
  memoizeEq: typeof I.memoizeEq

  /**
   * @rewriteStatic mergeAll_ from "@principia/base/IO"
   */
  mergeAll<R, E, A, B>(fas: Iterable<I.IO<R, E, A>>, b: B, f: (b: B, a: A) => B): I.IO<R, E, B>

  /**
   * @rewriteStatic mergeAll from "@principia/base/IO"
   * @dataFirst mergeAll_
   */
  mergeAll<A, B>(b: B, f: (b: B, a: A) => B): <R, E>(fas: Iterable<I.IO<R, E, A>>) => I.IO<R, E, B>

  /**
   * @rewriteStatic mergeAllC_ from "@principia/base/IO"
   */
  mergeAllC<R, E, A, B>(fas: Iterable<I.IO<R, E, A>>, b: B, f: (b: B, a: A) => B): I.IO<R, E, B>

  /**
   * @rewriteStatic mergeAllC from "@principia/base/IO"
   * @dataFirst mergeAllC_
   */
  mergeAllC<A, B>(b: B, f: (b: B, a: A) => B): <R, E>(fas: Iterable<I.IO<R, E, A>>) => I.IO<R, E, B>
  /**
   * @rewriteStatic never from "@principia/base/IO"
   */
  never: typeof I.never
  /**
   * @rewriteStatic partition from "@principia/base/IO"
   * @dataFirst partition_
   */
  partition<R, E, A, B>(
    f: (a: A) => I.IO<R, E, B>
  ): (as: Iterable<A>) => I.IO<R, never, readonly [Iterable<E>, Iterable<B>]>
  /**
   * @rewriteStatic partition_ from "@principia/base/IO"
   */
  partition<R, E, A, B>(
    as: Iterable<A>,
    f: (a: A) => I.IO<R, E, B>
  ): I.IO<R, never, readonly [Iterable<E>, Iterable<B>]>

  /**
   * @rewriteStatic partitionC_ from "@principia/base/IO"
   */
  partitionC<R, E, A, B>(
    as: Iterable<A>,
    f: (a: A) => I.IO<R, E, B>
  ): I.IO<R, never, readonly [Iterable<E>, Iterable<B>]>

  /**
   * @rewriteStatic partitionC from "@principia/base/IO"
   * @dataFirst partitionC_
   */
  partitionC<R, E, A, B>(
    f: (a: A) => I.IO<R, E, B>
  ): (as: Iterable<A>) => I.IO<R, never, readonly [Iterable<E>, Iterable<B>]>
  /**
   * @rewriteStatic platform from "@principia/base/IO"
   */
  platform: typeof I.platform
  /**
   * @rewriteStatic pure from "@principia/base/IO"
   */
  pure: typeof I.pure
  /**
   * @rewriteStatic sequenceIterable from "@principia/base/IO"
   */
  sequenceIterable: typeof I.sequenceIterable
  /**
   * @rewriteStatic sequenceIterableC from "@principia/base/IO"
   */
  sequenceIterableC: typeof I.sequenceIterableC
  /**
   * @rewriteStatic sequenceIterableUnit from "@principia/base/IO"
   */
  sequenceIterableUnit: typeof I.sequenceIterableUnit
  /**
   * @rewriteStatic sequenceIterableUnitC from "@principia/base/IO"
   */
  sequenceIterableUnitC: typeof I.sequenceIterableUnitC
  /**
   * @rewriteStatic setState from "@principia/base/IO"
   */
  setState: typeof I.setState
  /**
   * @rewriteStatic sleep from "@principia/base/IO"
   */
  sleep: typeof I.sleep
  /**
   * @rewriteStatic struct from "@principia/base/IO"
   */
  struct: typeof I.struct
  /**
   * @rewriteStatic structC from "@principia/base/IO"
   */
  structC: typeof I.structC
  /**
   * @rewriteStatic succeed from "@principia/base/IO"
   */
  succeed: typeof I.succeed
  /**
   * @rewriteStatic succeedLazy from "@principia/base/IO"
   */
  succeedLazy: typeof I.succeedLazy
  /**
   * @rewriteStatic try from "@principia/base/IO"
   */
  try: typeof I.try

  /**
   * @rewriteStatic tryCatch from "@principia/base/IO"
   */
  tryCatch: typeof I.tryCatch
  /**
   * @rewriteStatic tuple from "@principia/base/IO"
   */
  tuple: typeof I.tuple
  /**
   * @rewriteStatic tupleC from "@principia/base/IO"
   */
  tupleC: typeof I.tupleC
  /**
   * @rewriteStatic updateState from "@principia/base/IO"
   */
  updateState: typeof I.updateState
  /**
   * @rewriteStatic validate from "@principia/base/IO"
   * @dataFirst validate_
   * @trace 0
   */
  validate<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, Chunk<E>, Chunk<B>>
  /**
   * @rewriteStatic validate_ from "@principia/base/IO"
   * @trace 1
   */
  validate<A, R, E, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, Chunk<E>, Chunk<B>>
  /**
   * @rewriteStatic validateC from "@principia/base/IO"
   * @dataFirst validateC_
   * @trace 0
   */
  validateC<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, Chunk<E>, Chunk<B>>
  /**
   * @rewriteStatic validateC_ from "@principia/base/IO"
   * @trace 1
   */
  validateC<A, R, E, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, Chunk<E>, Chunk<B>>
  /**
   * @rewriteStatic withChildren from "@principia/base/IO"
   */
  withChildren: typeof I.withChildren
  /**
   * @rewriteStatic yieldNow from "@principia/base/IO"
   */
  yieldNow: typeof I.yieldNow
}

export interface IOOps<R, E, A> {
  /**
   * @rewrite as_ from "@principia/base/IO"
   * @trace call
   */
  ['$>']<R, E, A, B>(this: I.IO<R, E, A>, b: B): I.IO<R, E, B>

  /**
   * @rewrite apSecondC_ from "@principia/base/IO"
   * @trace call
   */
  ['&>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

  /**
   * @rewrite apSecond_ from "@principia/base/IO"
   * @trace call
   */
  ['*>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

  /**
   * @rewrite joinEither_ from "@principia/base/IO"
   * @trace call
   */
  ['+++']<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: I.IO<R1, E1, A1>): I.IO<Either<R, R1>, E | E1, Either<A, A1>>

  /**
   * @rewrite map_ from "@principia/base/IO"
   * @trace 0
   */
  ['<$>']<R, E, A, B>(this: I.IO<R, E, A>, f: (a: A) => B): I.IO<R, E, B>

  /**
   * @rewrite apFirstC_ from "@principia/base/IO"
   * @trace call
   */
  ['<&']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

  /**
   * @rewrite crossC_ from "@principia/base/IO"
   * @trace call
   */
  ['<&>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

  /**
   * @rewrite apFirst_ from "@principia/base/IO"
   * @trace call
   */
  ['<*']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

  /**
   * @rewrite cross_ from "@principia/base/IO"
   * @trace call
   */
  ['<**>']<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

  /**
   * @rewrite orElseEither_ from "@principia/base/IO"
   * @trace call
   */
  ['<+>']<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, that: () => I.IO<R1, E1, A1>): I.IO<R & R1, E1, Either<A, A1>>

  /**
   * @rewrite compose_ from "@principia/base/IO"
   * @trace call
   */
  // ['<<<']<R, E, A, R0, E1>(this: I.IO<R, E, A>, that: I.IO<R0, E1, R>): I.IO<R0, E | E1, A>

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
   * @rewrite compose_ from "@principia/base/IO"
   * @trace call
   */
  ['>>>']<R, E, A, E1, B>(this: I.IO<R, E, A>, that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

  /**
   * @rewrite absorbWith_ from "@principia/base/IO"
   * @trace 0
   */
  absorbWith<R, E, A>(this: I.IO<R, E, A>, f: (e: E) => unknown): I.IO<R, unknown, A>

  /**
   * @rewrite apFirstC_ from "@principia/base/IO"
   * @trace call
   */
  apFirstC<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

  /**
   * @rewrite apSecond_ from "@principia/base/IO"
   * @trace call
   */
  apSecond<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

  /**
   * @rewrite apSecondC_ from "@principia/base/IO"
   * @trace call
   */
  apSecondC<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, that: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B>

  /**
   * @rewrite as_ from "@principia/base/IO"
   * @trace 0
   */
  as<R, E, A, B>(this: I.IO<R, E, A>, b: B): I.IO<R, E, B>

  /**
   * @rewrite asJust from "@principia/base/IO"
   * @trace getter
   */
  asJust<R, E, A>(this: I.IO<R, E, A>): I.IO<R, E, Maybe<A>>

  /**
   * @rewrite asJustError from "@principia/base/IO"
   * @trace getter
   */
  asJustError<R, E, A>(this: I.IO<R, E, A>): I.IO<R, Maybe<E>, A>

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
   * @rewrite catchJust_ from "@principia/base/IO"
   * @trace 0
   */
  catchJust<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, f: (e: E) => Maybe<I.IO<R1, E1, B>>): I.IO<R & R1, E | E1, A | B>

  /**
   * @rewrite catchJustCause_ from "@principia/base/IO"
   * @trace 0
   */
  catchJustCause<R, E, A, R1, E1, B>(
    this: I.IO<R, E, A>,
    f: (cause: Cause<E>) => Maybe<I.IO<R1, E1, B>>
  ): I.IO<R & R1, E | E1, A | B>

  /**
   * @rewrite catchJustDefect_ from "@principia/base/IO"
   * @trace 0
   */
  catchJustDefect<R, E, A, R1, E1, B>(
    this: I.IO<R, E, A>,
    f: (_: unknown) => Maybe<I.IO<R1, E1, B>>
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
   * @rewrite chainS_ from "@principia/base/IO"
   * @trace 2
   */
  chainS<R, E, A, N extends string, R1, E1, A1>(
    this: I.IO<R, E, A>,
    name: Exclude<N, keyof A>,
    f: (_: A) => I.IO<R1, E1, A1>
  ): I.IO<R & R1, E | E1, { [K in keyof A | N]: K extends keyof A ? A[K] : A1 }>

  /**
   * @rewrite compose_ from "@principia/base/IO"
   * @trace call
   */
  compose<R, E, A, E1, B>(this: I.IO<R, E, A>, that: I.IO<A, E1, B>): I.IO<R, E | E1, B>

  /**
   * @rewrite cross_ from "@principia/base/IO"
   * @trace call
   */
  cross<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossC_ from "@principia/base/IO"
   * @trace call
   */
  crossC<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, readonly [A, B]>

  /**
   * @rewrite crossFirst_ from "@principia/base/IO"
   * @trace call
   */
  crossFirst<R, E, A, R1, E1, B>(this: I.IO<R, E, A>, io: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A>

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
   * @rewrite crossWithC_ from "@principia/base/IO"
   * @trace 1
   */
  crossWithC<R, E, A, R1, E1, B, C>(
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
  fulfill<R, E, A>(this: I.IO<R, E, A>, promise: Future<E, A>): I.IO<R, never, boolean>

  /**
   * @rewrite get from "@principia/base/IO"
   * @trace call
   */
  get<R, E, A>(this: IO<R, E, Maybe<A>>): IO<R, Maybe<E>, A>

  /**
   * @rewrite give_ from "@principia/base/IO"
   * @trace call
   */
  give<R, E, A>(this: I.IO<R, E, A>, r: R): I.IO<unknown, E, A>

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
   * @rewriteConstraint giveServices_ from "@principia/base/IO"
   */
  giveServices<R, E, A, SS extends Record<string, Tag<any>>>(
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
   * @rewriteConstraint giveServicesIO_ from "@principia/base/IO"
   */
  giveServicesIO<R, E, A, SS extends Record<string, Tag<any>>>(
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
    Erase<R, UnionToIntersection<{ [K in keyof SS]: [SS[K]] extends [Tag<infer T>] ? Has<T> : unknown }[number]>> & R1,
    E | E1,
    A
  >

  /**
   * @rewrite giveSomeLayer_ from "@principia/base/IO"
   * @trace call
   */
  giveSome<R, E, A, R1, E1, A1>(this: I.IO<R, E, A>, layer: L.Layer<R1, E1, A1>): I.IO<Erase<R, A1> & R1, E | E1, A>

  /**
   * @rewrite giveSome_ from "@principia/base/IO"
   * @trace call
   */
  giveSome<R0, E, A, R>(this: I.IO<R0, E, A>, r: R): I.IO<Erase<R0, R>, E, A>

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
   * @rewriteGetter maybe from "@principia/base/IO"
   * @trace getter
   */
  maybe: URIO<R, Maybe<A>>

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
   * @rewrite optional from "@principia/base/IO"
   * @trace call
   */
  optional<R, E, A>(this: I.IO<R, Maybe<E>, A>): I.IO<R, E, Maybe<A>>

  /**
   * @rewrite or_ from "@principia/base/IO"
   * @trace call
   */
  or<R, E, R1, E1>(this: I.IO<R, E, boolean>, that: I.IO<R1, E1, boolean>): I.IO<R & R1, E | E1, boolean>

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
   * @rewrite orElseMaybe_ from "@principia/base/IO"
   * @trace 0
   */
  orElseMaybe<R, E, A, R1, E1, A1>(
    this: I.IO<R, Maybe<E>, A>,
    that: () => I.IO<R1, Maybe<E1>, A1>
  ): I.IO<R & R1, Maybe<E | E1>, A | A1>

  /**
   * @rewrite orElseSucceed_ from "@principia/base/IO"
   * @trace 0
   */
  orElseSucceed<R, E, A, A1>(this: I.IO<R, E, A>, a: () => A1): I.IO<R, E, A | A1>

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
   * @rewriteGetter parallelErrors from "@principia/base/IO"
   * @trace getter
   */
  parallelErrors: I.IO<R, ReadonlyArray<E>, A>

  /**
   * @rewrite pureS_ from "@principia/base/IO"
   * @trace 2
   */
  pureS<R, E, A, N extends string, A1>(
    this: I.IO<R, E, A>,
    name: Exclude<N, keyof A>,
    f: (_: A) => A1
  ): I.IO<R, E, { [K in keyof A | N]: K extends keyof A ? A[K] : A1 }>

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
    scope?: Maybe<Scope>
  ): I.IO<R & R1 & R2 & R3, E2 | E3, A2 | A3>

  /**
   * @rewrite refineOrHalt_ from "@principia/base/IO"
   * @trace 0
   */
  refineOrHalt<R, E, A, E1>(this: I.IO<R, E, A>, pf: (e: E) => Maybe<E1>): I.IO<R, E1, A>

  /**
   * @rewrite refineOrHaltWith_ from "@principia/base/IO"
   * @trace 0
   * @trace 1
   */
  refineOrHaltWith<R, E, A, E1>(this: I.IO<R, E, A>, pf: (e: E) => Maybe<E1>, f: (e: E) => unknown): I.IO<R, E1, A>

  /**
   * @rewrite reject_ from "@principia/base/IO"
   * @trace 0
   */
  reject<R, E, A, E1>(this: I.IO<R, E, A>, pf: (a: A) => Maybe<E1>): I.IO<R, E | E1, A>

  /**
   * @rewrite rejectIO_ from "@principia/base/IO"
   * @trace 0
   */
  rejectIO<R, E, A, R1, E1>(this: I.IO<R, E, A>, pf: (a: A) => Maybe<I.IO<R1, E1, E1>>): I.IO<R & R1, E | E1, A>

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
    f: (e: E, out: Maybe<B>) => I.IO<R2, E2, C>
  ): I.IO<R & R1 & R2 & Has<Clock>, E2, C | B>

  /**
   * @rewrite repeatOrElseEither_ from "@principia/base/IO"
   * @trace call
   */
  repeatOrElseEither<R, E, A, R1, B, R2, E2, C>(
    this: I.IO<R, E, A>,
    schedule: Schedule<R1, A, B>,
    f: (e: E, out: Maybe<B>) => I.IO<R2, E2, C>
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
  retry<R, E extends I, A, R1, I, O>(this: I.IO<R, E, A>, schedule: Schedule<R1, I, O>): I.IO<R & R1 & Has<Clock>, E, A>

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
  timeout(ms: number): I.IO<R & Has<Clock>, E, Maybe<A>>

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
  toManaged<R, E, A>(this: I.IO<R, E, A>): Managed<R, E, A>

  /**
   * @rewrite bracket_ from "@principia/base/Managed"
   * @trace call
   */
  toManaged<R, E, A, R1>(this: I.IO<R, E, A>, release: (a: A) => I.IO<R1, never, any>): Managed<R & R1, E, A>

  /**
   * @rewrite toS_ from "@principia/base/IO"
   * @trace call
   */
  toS<R, E, A, N extends string>(this: I.IO<R, E, A>, name: N): I.IO<R, E, { [K in N]: A }>

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
  unrefine<R, E, A, E1>(this: I.IO<R, E, A>, pf: (u: unknown) => Maybe<E1>): I.IO<R, E | E1, A>

  /**
   * @rewrite unrefine_ from "@principia/base/IO"
   * @trace 0
   */
  unrefine<R, E, A, E1>(this: I.IO<R, E, A>, f: (_: unknown) => Maybe<E1>): I.IO<R, E | E1, A>

  /**
   * @rewrite unrefineWith_ from "@principia/base/IO"
   * @trace 0
   * @trace 1
   */
  unrefineWith<R, E, A, E1, E2>(this: I.IO<R, E, A>, f: (_: unknown) => Maybe<E1>, g: (e: E) => E2): I.IO<R, E1 | E2, A>

  /**
   * @rewrite unrefineWith_ from "@principia/base/IO"
   * @trace 0
   * @trace 1
   */
  unrefineWith<R, E, A, E1, E2>(
    this: I.IO<R, E, A>,
    pf: (u: unknown) => Maybe<E1>,
    f: (e: E) => E2
  ): I.IO<R, E1 | E2, A>

  /**
   * @rewrite unsafeRun_ from "@principia/base/IO"
   */
  unsafeRun<E, A>(this: I.IO<IOEnv, E, A>): void

  /**
   * @rewrite unsafeRunFiber from "@principia/base/IO"
   */
  unsafeRunFiber<E, A>(this: I.IO<IOEnv, E, A>): FiberContext<E, A>

  /**
   * @rewrite unsafeRunPromise from "@principia/base/IO"
   */
  unsafeRunPromise<E, A>(this: I.IO<IOEnv, E, A>): globalThis.Promise<A>

  /**
   * @rewrite unsafeRunPromiseExit from "@principia/base/IO"
   */
  unsafeRunPromiseExit<E, A>(this: I.IO<IOEnv, E, A>): globalThis.Promise<Exit<E, A>>

  /**
   * @rewrite unsafeRunWith_ from "@principia/base/IO"
   */
  unsafeRunWith<E, A>(this: I.IO<IOEnv, E, A>, cb?: (exit: Exit<E, A>) => void): void

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
   * @rewrite withConcurrency_ from "@principia/base/IO"
   */
  withConcurrency<R, E, A>(this: I.IO<R, E, A>, n: number): I.IO<R, E, A>

  /**
   * @rewriteGetter withConcurrencyUnbounded from "@principia/base/IO"
   */
  withConcurrencyUnbounded: I.IO<R, E, A>

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
