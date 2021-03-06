import type { Has, Tag } from '../Has'
import type * as HKT from '../HKT'
import type { Stack } from '../internal/Stack'
import type { Maybe } from '../Maybe'

import * as C from '../Cause/core'
import * as A from '../collection/immutable/Array/core'
import * as R from '../collection/immutable/Record'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import * as Ex from '../Exit/core'
import { flow, identity, pipe, unsafeCoerce } from '../function'
import { genF, GenHKT } from '../Gen'
import { isTag, mergeEnvironments } from '../Has'
import { makeStack } from '../internal/Stack'
import { isMaybe } from '../Maybe'
import * as P from '../prelude'
import { isObject } from '../prelude'
import { tuple as mkTuple } from '../tuple/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const AsyncTypeId = Symbol.for('@principia/base/Async')
export type AsyncTypeId = typeof AsyncTypeId

export type Cause<E> = C.PCause<void, E>
export type Exit<E, A> = Ex.PExit<void, E, A>

/**
 * `Async` is a lightweight `IO` datatype for interruptible asynchronous computation.
 * Unlike `IO`, `Async` uses Promises internally and does not provide the power of `Fibers`.
 */
export abstract class Async<R, E, A> {
  readonly [AsyncTypeId]: AsyncTypeId = AsyncTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
}

export interface AsyncF extends HKT.HKT {
  readonly type: Async<this['R'], this['E'], this['A']>
  readonly variance: {
    R: '-'
    E: '+'
    A: '+'
  }
}

export const AsyncTag = {
  Succeed: 'Succeed',
  SucceedLazy: 'SucceedLazy',
  Defer: 'Defer',
  LiftPromise: 'LiftPromise',
  Chain: 'Chain',
  Match: 'Match',
  Asks: 'Asks',
  Give: 'Give',
  Ensuring: 'Ensuring',
  All: 'All',
  Fail: 'Fail',
  Interrupt: 'Interrupt'
} as const

export type UAsync<A> = Async<unknown, never, A>
export type FAsync<E, A> = Async<unknown, E, A>
export type URAsync<R, A> = Async<R, never, A>

export type Concrete =
  | Succeed<any>
  | Defer<any, any, any>
  | LiftPromise<any, any>
  | Chain<any, any, any, any, any, any>
  | Match<any, any, any, any, any, any, any, any, any>
  | Asks<any, any, any, any>
  | Give<any, any, any>
  | Ensuring<any, any, any, any, any>
  | All<any, any, any>
  | Fail<any>
  | SucceedLazy<any>
  | Interrupt

/**
 * @optimize identity
 */
function asConcrete(_: Async<any, any, any>): Concrete {
  return _ as Concrete
}

export class Succeed<A> extends Async<unknown, never, A> {
  readonly _asyncTag = AsyncTag.Succeed

  constructor(readonly value: A) {
    super()
  }
}

export class SucceedLazy<A> extends Async<unknown, never, A> {
  readonly _asyncTag = AsyncTag.SucceedLazy

  constructor(readonly thunk: () => A) {
    super()
  }
}

export class Fail<E> extends Async<unknown, E, never> {
  readonly _asyncTag = AsyncTag.Fail

  constructor(readonly e: Cause<E>) {
    super()
  }
}

export class Interrupt extends Async<unknown, never, never> {
  readonly _asyncTag = AsyncTag.Interrupt
}

export class Asks<R0, R, E, A> extends Async<R & R0, E, A> {
  readonly _asyncTag = AsyncTag.Asks

  constructor(readonly f: (_: R0) => Async<R, E, A>) {
    super()
  }
}

export class Give<R, E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = AsyncTag.Give

  constructor(readonly async: Async<R, E, A>, readonly env: R) {
    super()
  }
}

export class All<R, E, A> extends Async<R, E, readonly A[]> {
  readonly _asyncTag = AsyncTag.All

  constructor(readonly asyncs: readonly Async<R, E, A>[]) {
    super()
  }
}

export class Defer<R, E, A> extends Async<R, E, A> {
  readonly _asyncTag = AsyncTag.Defer

  constructor(readonly async: () => Async<R, E, A>) {
    super()
  }
}

export class LiftPromise<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = AsyncTag.LiftPromise

  constructor(
    readonly promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly onReject: (reason: unknown) => E
  ) {
    super()
  }
}

export class Chain<R, E, A, Q, D, B> extends Async<Q & R, D | E, B> {
  readonly _asyncTag = AsyncTag.Chain

  constructor(readonly async: Async<R, E, A>, readonly f: (a: A) => Async<Q, D, B>) {
    super()
  }
}

export class Match<R, E, A, R1, E1, B, R2, E2, C> extends Async<R & R1 & R2, E1 | E2, B | C> {
  readonly _asyncTag = AsyncTag.Match

  constructor(
    readonly async: Async<R, E, A>,
    readonly f: (e: Cause<E>) => Async<R1, E1, B>,
    readonly g: (a: A) => Async<R2, E2, C>
  ) {
    super()
  }
}

export class Ensuring<R, E, A, R1, B> extends Async<R & R1, E, A> {
  readonly _asyncTag = AsyncTag.Ensuring

  constructor(readonly async: Async<R, E, A>, readonly finalizer: Async<R1, never, B>) {
    super()
  }
}

const AsyncErrorTypeId = Symbol.for('@principia/base/Async/AsyncError')
type AsyncErrorTypeId = typeof AsyncErrorTypeId

export class AsyncError<E> {
  readonly _typeId: AsyncErrorTypeId = AsyncErrorTypeId
  constructor(readonly cause: Cause<E>) {}
}

function isAsyncError(u: unknown): u is AsyncError<unknown> {
  return isObject(u) && '_typeId' in u && u['_typeId'] === AsyncErrorTypeId
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function succeed<A>(a: A): Async<unknown, never, A> {
  return new Succeed(a)
}

export function failCause<E>(cause: Cause<E>): Async<unknown, E, never> {
  return new Fail(cause)
}

export function fail<E>(e: E): Async<unknown, E, never> {
  return failCause(C.fail(e))
}

export function failLazy<E>(e: () => E): Async<unknown, E, never> {
  return defer(() => fail(e()))
}

export function halt(defect: unknown): Async<unknown, never, never> {
  return failCause(C.halt(defect))
}

export function haltLazy(defect: () => unknown): Async<unknown, never, never> {
  return defer(() => halt(defect()))
}

export function fromExit<E, A>(exit: Exit<E, A>): Async<unknown, E, A> {
  return Ex.match_(exit, failCause, succeed)
}

export function fromExitLazy<E, A>(exit: () => Exit<E, A>): Async<unknown, E, A> {
  return defer(() => fromExit(exit()))
}

export function defer<R, E, A>(factory: () => Async<R, E, A>): Async<R, E, A> {
  return new Defer(factory)
}

export function promiseUnfailable<A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>
): Async<unknown, never, A> {
  return new LiftPromise(promise, () => undefined as never)
}

export function promise<E, A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
  onError: (u: unknown) => E
): Async<unknown, E, A> {
  return new LiftPromise(promise, onError)
}

export function async<E, A>(
  register: (resolve: (value: A) => void, reject: (error: E) => void) => (() => void) | void
): Async<unknown, E, A> {
  return new LiftPromise(
    (onInterrupt) =>
      new Promise((resolve, reject) => {
        const maybeOnInterrupt = register(resolve, reject)
        maybeOnInterrupt && onInterrupt(maybeOnInterrupt)
      }),
    (error) => unsafeCoerce(error)
  )
}

export function succeedLazy<A>(thunk: () => A): Async<unknown, never, A> {
  return new SucceedLazy(thunk)
}

export function tryCatch<E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> {
  return succeedLazy(() => {
    try {
      return thunk()
    } catch (e) {
      throw new AsyncError(C.fail(onThrow(e)))
    }
  })
}

export function interrupt(): Async<unknown, never, never> {
  return new Interrupt()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function matchCauseAsync_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: Async<R, E, A>,
  onFailure: (cause: Cause<E>) => Async<R1, E1, A1>,
  onSuccess: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Match(ma, onFailure, onSuccess)
}

/**
 * @dataFirst matchCauseAsync_
 */
export function matchCauseAsync<E, A, R1, E1, A1, R2, E2, A2>(
  f: (e: Cause<E>) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): <R>(async: Async<R, E, A>) => Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return (async) => matchCauseAsync_(async, f, g)
}

export function matchAsync_<R, E, A, R1, E1, A1, R2, E2, A2>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return matchCauseAsync_(async, (cause) => E.match_(C.failureOrCause(cause), f, failCause), g)
}

/**
 * @dataFirst matchAsync_
 */
export function matchAsync<E, A, R1, E1, A1, R2, E2, A2>(
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): <R>(async: Async<R, E, A>) => Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return (async) => matchAsync_(async, f, g)
}

export function match_<R, E, A, B, C>(async: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, never, B | C> {
  return matchAsync_(async, flow(f, succeed), flow(g, succeed))
}

/**
 * @dataFirst match_
 */
export function match<E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
): <R>(async: Async<R, E, A>) => Async<R, never, B | C> {
  return (async) => match_(async, f, g)
}

export function catchAllCause_<R, E, A, R1, E1, A1>(
  ma: Async<R, E, A>,
  f: (cause: Cause<E>) => Async<R1, E1, A1>
): Async<R & R1, E1, A | A1> {
  return matchCauseAsync_(ma, f, succeed)
}

/**
 * @dataFirst catchAllCause_
 */
export function catchAllCause<E, R1, E1, A1>(
  f: (cause: Cause<E>) => Async<R1, E1, A1>
): <R, A>(ma: Async<R, E, A>) => Async<R & R1, E1, A | A1> {
  return (ma) => catchAllCause_(ma, f)
}

export function catchAll_<R, E, A, R1, E1, A1>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>
): Async<R & R1, E1, A | A1> {
  return matchAsync_(async, f, succeed)
}

/**
 * @dataFirst catchAll_
 */
export function catchAll<E, R1, E1, A1>(
  f: (e: E) => Async<R1, E1, A1>
): <R, A>(async: Async<R, E, A>) => Async<R & R1, E1, A1 | A> {
  return (async) => catchAll_(async, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Async<unknown, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Parallel Apply
 * -------------------------------------------------------------------------------------------------
 */

export function sequenceTC<A extends ReadonlyArray<Async<any, any, any>>>(
  ...asyncs: A & { 0: Async<any, any, any> }
): Async<
  P._R<A[number]>,
  P._E<A[number]>,
  {
    [K in keyof A]: P._A<A[K]>
  }
> {
  return new All(asyncs) as any
}

export function crossC_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return crossWithC_(fa, fb, mkTuple)
}

/**
 * @dataFirst crossC_
 */
export function crossC<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => crossC_(fa, fb)
}

export function crossWithC_<R, E, A, R1, E1, B, C>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> {
  return map_(sequenceTC(fa, fb), ([a, b]) => f(a, b))
}

/**
 * @dataFirst crossWithC_
 */
export function crossWithC<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => crossWithC_(fa, fb, f)
}

export function apC_<R, E, A, R1, E1, B>(
  fab: Async<R1, E1, (a: A) => B>,
  fa: Async<R, E, A>
): Async<R & R1, E | E1, B> {
  return crossWithC_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst apC_
 */
export function apC<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E1 | E, B> {
  return (fab) => apC_(fab, fa)
}

export function apFirstC_<R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A> {
  return crossWithC_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst apFirstC_
 */
export function apFirstC<R1, E1, A1>(fb: Async<R1, E1, A1>): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => apFirstC_(fa, fb)
}

export function apSecondC_<R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A1> {
  return crossWithC_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst apSecondC_
 */
export function apSecondC<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => apSecondC_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Sequential Apply
 * -------------------------------------------------------------------------------------------------
 */

export function sequenceT<A extends ReadonlyArray<Async<any, any, any>>>(
  ...fas: A & { 0: Async<any, any, any> }
): Async<P._R<A[number]>, P._E<A[number]>, { [K in keyof A]: P._A<A[K]> }> {
  return A.foldl_(
    fas,
    succeed(A.empty<any>()) as unknown as Async<P._R<A[number]>, P._E<A[number]>, { [K in keyof A]: P._A<A[K]> }>,
    (b, a) => crossWith_(b, a, (acc, r) => A.append_(acc, r)) as any
  )
}

export function cross_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return crossWith_(fa, fb, mkTuple)
}

/**
 * @dataFirst cross_
 */
export function cross<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<R, E, A, R1, E1, B>(fab: Async<R1, E1, (a: A) => B>, fa: Async<R, E, A>): Async<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst ap_
 */
export function ap<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst apFirst_
 */
export function apFirst<R1, E1, A1>(fb: Async<R1, E1, A1>): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A1> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst apSecond_
 */
export function apSecond<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => apSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, E, A, B>(pab: Async<R, E, A>, f: (e: E) => B): Async<R, B, A> {
  return matchAsync_(pab, flow(f, fail), succeed)
}

/**
 * @dataFirst mapError_
 */
export function mapError<E, B>(f: (e: E) => B): <R, A>(pab: Async<R, E, A>) => Async<R, B, A> {
  return (pab) => mapError_(pab, f)
}

export function bimap_<R, E, A, B, C>(pab: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, B, C> {
  return matchAsync_(pab, flow(f, fail), flow(g, succeed))
}

/**
 * @dataFirst bimap_
 */
export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Async<R, E, A>) => Async<R, B, C> {
  return (pab) => bimap_(pab, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fallible
 * -------------------------------------------------------------------------------------------------
 */

export function subsumeEither<R, E, E1, A>(async: Async<R, E, E.Either<E1, A>>): Async<R, E | E1, A> {
  return matchAsync_(async, fail, E.match(fail, succeed))
}

export function either<R, E, A>(async: Async<R, E, A>): Async<R, never, E.Either<E, A>> {
  return match_(async, E.left, E.right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, E, A, B>(fa: Async<R, E, A>, f: (a: A) => B): Async<R, E, B> {
  return chain_(fa, (a) => succeed(f(a)))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Async<R, E, A>) => Async<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, E, A, Q, D, B>(ma: Async<R, E, A>, f: (a: A) => Async<Q, D, B>): Async<Q & R, D | E, B> {
  return new Chain(ma, f)
}

/**
 * @dataFirst chain_
 */
export function chain<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, B> {
  return (ma) => new Chain(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Async<R, E, Async<R1, E1, A>>): Async<R & R1, E | E1, A> {
  return chain_(mma, identity)
}

export function tap_<R, E, A, Q, D, B>(ma: Async<R, E, A>, f: (a: A) => Async<Q, D, B>): Async<Q & R, D | E, A> {
  return chain_(ma, (a) => chain_(f(a), (_) => succeed(a)))
}

/**
 * @dataFirst tap_
 */
export function tap<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, A> {
  return (ma) => tap_(ma, f)
}

export function tapError_<R, E, A, R1, E1, B>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, B>
): Async<R & R1, E | E1, A> {
  return catchAll_(async, (e) => chain_(f(e), (_) => fail(e)))
}

/**
 * @dataFirst tapError_
 */
export function tapError<E, R1, E1, B>(
  f: (e: E) => Async<R1, E1, B>
): <R, A>(async: Async<R, E, A>) => Async<R & R1, E | E1, A> {
  return (async) => tapError_(async, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function asksAsync<R0, R, E, A>(f: (_: R0) => Async<R, E, A>): Async<R & R0, E, A> {
  return new Asks(f)
}

export function asks<R, A>(f: (_: R) => A): Async<R, never, A> {
  return asksAsync((_: R) => succeed(f(_)))
}

export function ask<R>(): Async<R, never, R> {
  return asks(identity)
}

export function giveAll_<R, E, A>(ra: Async<R, E, A>, env: R): Async<unknown, E, A> {
  return new Give(ra, env)
}

/**
 * @dataFirst giveAll_
 */
export function giveAll<R>(env: R): <E, A>(ra: Async<R, E, A>) => Async<unknown, E, A> {
  return (ra) => new Give(ra, env)
}

export function gives_<R0, R, E, A>(ra: Async<R, E, A>, f: (_: R0) => R): Async<R0, E, A> {
  return asksAsync((_: R0) => giveAll_(ra, f(_)))
}

/**
 * @dataFirst gives_
 */
export function gives<R0, R>(f: (_: R0) => R): <E, A>(ra: Async<R, E, A>) => Async<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function give_<R0, R, E, A>(ra: Async<R & R0, E, A>, env: R): Async<R0, E, A> {
  return gives_(ra, (r0) => ({ ...env, ...r0 }))
}

/**
 * @dataFirst give_
 */
export function give<R>(env: R): <R0, E, A>(ra: Async<R & R0, E, A>) => Async<R0, E, A> {
  return (ra) => give_(ra, env)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Service
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesAsync<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Async<R, E, B>
) => Async<
  R & P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  E,
  B
> {
  return (f) =>
    asksAsync(
      (r: P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
        f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTAsync<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Async<R, E, B>
) => Async<
  R & P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  E,
  B
> {
  return (f) =>
    asksAsync(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => URAsync<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  B
> {
  return (f) =>
    asks(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => URAsync<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  B
> {
  return (f) =>
    asks((r: P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceAsync<T>(s: Tag<T>): <R, E, B>(f: (a: T) => Async<R, E, B>) => Async<R & Has<T>, E, B> {
  return (f) => asksAsync((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <K extends keyof T & { [k in keyof T]: T[k] extends (...args: any[]) => Async<any, any, any> ? k : never }[keyof T]>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => Async<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => Async<infer R, infer E, infer A> ? Async<R & Has<T>, E, A> : unknown[] {
  return (k) =>
    (...args) =>
      asksServiceAsync(s)((t) => (t[k] as any)(...args)) as any
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => Async<Has<T>, never, B> {
  return (f) => asksServiceAsync(s)((a) => pure(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): Async<Has<T>, never, T> {
  return asksServiceAsync(s)((a) => pure(a))
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveServiceAsync<T>(_: Tag<T>) {
  return <R, E>(f: Async<R, E, T>) =>
    <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>): Async<R & R1, E | E1, A1> =>
      asksAsync((r: R & R1) => chain_(f, (t) => giveAll_(ma, mergeEnvironments(_, r, t))))
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveService<T>(_: Tag<T>): (f: T) => <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R1, E1, A1> {
  return (f) => (ma) => giveServiceAsync(_)(pure(f))(ma)
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 *
 * @dataFrist replaceServiceAsync_
 */
export function replaceServiceAsync<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Async<R, E, T>
): <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R & R1 & Has<T>, E1 | E, A1> {
  return (ma) => asksServiceAsync(_)((t) => giveServiceAsync(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceAsync_<R, E, T, R1, E1, A1>(
  ma: Async<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Async<R, E, T>
): Async<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceAsync(_)((t) => giveServiceAsync(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 *
 * @dataFrist replaceService_
 */
export function replaceService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceAsync(_)((t) => giveServiceAsync(_)(pure(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: Async<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Async<R1 & Has<T>, E1, A1> {
  return asksServiceAsync(_)((t) => giveServiceAsync(_)(pure(f(t)))(ma))
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: Async<R, E, A>) => Async<R, E, Has<A>> {
  return (fa) => map_(fa, has.of)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Async<unknown, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function bracket_<R, E, A, R1, E1, A1, R2, E2>(
  acquire: Async<R, E, A>,
  use: (a: A) => Async<R1, E1, A1>,
  release: (a: A, exit: Exit<E1, A1>) => Async<R2, E2, any>
): Async<R & R1 & R2, E | E1 | E2, A1> {
  return chain_(acquire, (a) =>
    chain_(result(defer(() => use(a))), (ex) =>
      matchCauseAsync_(
        defer(() => release(a, ex)),
        (cause2) =>
          failCause(
            Ex.match_(
              ex,
              (cause1) => C.then(cause1, cause2),
              () => cause2
            )
          ),
        () => fromExit(ex)
      )
    )
  )
}

/**
 * @dataFirst bracket_
 */
export function bracket<A, R1, E1, A1, R2, E2>(
  use: (a: A) => Async<R1, E1, A1>,
  release: (a: A, exit: Exit<E1, A1>) => Async<R2, E2, any>
): <R, E>(acquire: Async<R, E, A>) => Async<R & R1 & R2, E | E1 | E2, A1> {
  return (acquire) => bracket_(acquire, use, release)
}

export function ensuring_<R, E, A, R1>(ma: Async<R, E, A>, finalizer: Async<R1, never, void>): Async<R & R1, E, A> {
  return new Ensuring(ma, finalizer)
}

/**
 * @dataFirst ensuring_
 */
export function ensuring<R1>(finalizer: Async<R1, never, void>): <R, E, A>(ma: Async<R, E, A>) => Async<R & R1, E, A> {
  return (ma) => ensuring_(ma, finalizer)
}

export function foreachC_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Async<R, E, B>): Async<R, E, ReadonlyArray<B>> {
  return new All(pipe(A.from(as), A.map(f)))
}

export function foreachC<A, R, E, B>(f: (a: A) => Async<R, E, B>): (as: Iterable<A>) => Async<R, E, ReadonlyArray<B>> {
  return (as) => foreachC_(as, f)
}

export function result<R, E, A>(ma: Async<R, E, A>): Async<R, never, Exit<E, A>> {
  return matchCauseAsync_(ma, flow(Ex.failCause, succeed), flow(Ex.succeed, succeed))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Run
 * -------------------------------------------------------------------------------------------------
 */

class FoldFrame {
  readonly _tag = 'FoldFrame'
  constructor(readonly recover: (e: any) => Async<any, any, any>, readonly apply: (a: any) => Async<any, any, any>) {}
}

class ApplyFrame {
  readonly _tag = 'ApplyFrame'
  constructor(readonly apply: (a: any) => Async<any, any, any>) {}
}

class Finalizer {
  readonly _tag = 'Finalizer'
  constructor(readonly finalizer: Async<any, never, any>, readonly apply: (a: any) => Async<any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame | Finalizer

export function runPromiseExitEnv_<R, E, A>(
  async: Async<R, E, A>,
  r: R,
  interruptionState = new InterruptionState()
): Promise<Exit<E, A>> {
  return defaultPromiseTracingContext.traced(async () => {
    let frames: Stack<Frame> | undefined = undefined
    let result             = null
    let currentEnvironment = r
    let failed             = false
    let current: Async<any, any, any> | undefined = async
    let instructionCount              = 0
    let interrupted                   = false
    let suppressedCause: Cause<never> = C.empty

    function isInterrupted() {
      return interrupted || interruptionState.interrupted
    }

    function popContinuation(): Frame | undefined {
      const current = frames?.value
      frames        = frames?.previous
      return current
    }

    function pushContinuation(continuation: Frame): void {
      frames = makeStack(continuation, frames)
    }

    function addSuppressedCause(cause: Cause<never>): void {
      if (!C.isEmpty(cause)) {
        suppressedCause = C.then(suppressedCause, cause)
      }
    }

    function clearSuppressedCause(): Cause<never> {
      const oldSuppressedCause = suppressedCause
      suppressedCause          = C.empty
      return oldSuppressedCause
    }

    function unwindStack() {
      let unwinding = true
      while (unwinding) {
        const next = popContinuation()
        if (next == null) {
          unwinding = false
        } else {
          switch (next._tag) {
            case 'FoldFrame': {
              unwinding = false
              pushContinuation(new ApplyFrame(next.recover))
              break
            }
            case 'Finalizer': {
              pushContinuation(
                new ApplyFrame((cause) =>
                  matchCauseAsync_(
                    next.finalizer,
                    (finalizerCause) => {
                      addSuppressedCause(finalizerCause)
                      return failCause(cause)
                    },
                    () => failCause(cause)
                  )
                )
              )
              unwinding = false
            }
          }
        }
      }
    }

    function ensuring(finalizer: Async<any, never, any>): void {
      pushContinuation(new Finalizer(finalizer, (a) => map_(finalizer, () => a)))
    }

    while (current != null && !isInterrupted()) {
      try {
        if (instructionCount > 10000) {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 0)
          })
          instructionCount = 0
        }
        instructionCount += 1

        const I = asConcrete(current)
        switch (I._asyncTag) {
          case AsyncTag.Chain: {
            const nested       = asConcrete(I.async)
            const continuation = I.f
            switch (nested._asyncTag) {
              case AsyncTag.Succeed: {
                current = continuation(nested.value)
                break
              }
              case AsyncTag.SucceedLazy: {
                current = continuation(nested.thunk())
                break
              }
              default: {
                current = nested
                pushContinuation(new ApplyFrame(continuation))
              }
            }
            break
          }
          case AsyncTag.Match: {
            current = I.async
            pushContinuation(new FoldFrame(I.f, I.g))
            break
          }
          case AsyncTag.Defer: {
            current = I.async()
            break
          }
          case AsyncTag.Succeed: {
            result     = I.value
            const next = popContinuation()
            if (next) {
              current = next.apply(result)
            } else {
              current = undefined
            }
            break
          }
          case AsyncTag.SucceedLazy: {
            current = succeed(I.thunk())
            break
          }
          case AsyncTag.Fail: {
            unwindStack()
            const fullCause = C.then(I.e, clearSuppressedCause())
            const next      = popContinuation()
            if (next) {
              current = next.apply(fullCause)
            } else {
              failed  = true
              result  = fullCause
              current = undefined
            }
            break
          }
          case AsyncTag.Interrupt: {
            interrupted = true
            interruptionState.interrupt()
            current = undefined
            break
          }
          case AsyncTag.Asks: {
            current = I.f(currentEnvironment)
            break
          }
          case AsyncTag.Give: {
            const oldEnvironment = currentEnvironment
            currentEnvironment   = I.env
            ensuring(
              succeedLazy(() => {
                currentEnvironment = oldEnvironment
              })
            )
            current = I.async
            break
          }
          case AsyncTag.All: {
            const innerInterruptionState     = new InterruptionState()
            const removeInterruptionListener = interruptionState.addListener(() => {
              innerInterruptionState.interrupt()
            })
            const exits: ReadonlyArray<readonly [number, Exit<any, any>]> = await Promise.all(
              A.imap_(I.asyncs, (i, a) =>
                runPromiseExitEnv_(a, currentEnvironment, innerInterruptionState).then((exit) => {
                  if (Ex.isFailure(exit)) {
                    innerInterruptionState.interrupt()
                  }
                  return [i, exit] as const
                })
              )
            )
            removeInterruptionListener()
            const results: Array<any>        = new Array(I.asyncs.length)
            let accumulatedCause: Cause<any> = C.empty
            for (let i = 0; i < exits.length; i++) {
              const [index, exit] = exits[i]
              Ex.match_(
                exit,
                (cause) => {
                  accumulatedCause = C.both(accumulatedCause, cause)
                },
                (value) => {
                  results[index] = value
                }
              )
            }
            if (C.isEmpty(accumulatedCause)) {
              current = succeed(results)
            } else {
              current = failCause(accumulatedCause)
            }
            break
          }
          case AsyncTag.LiftPromise: {
            try {
              current = succeed(
                await new CancellablePromise(
                  (s) => I.promise(s).catch((ex) => Promise.reject(Ex.fail(ex))),
                  interruptionState
                ).promise()
              )
            } catch (e) {
              const _e = e as Ex.Failure<void, E>
              if (C.interrupted(_e.cause)) {
                interrupted = true
                current     = undefined
              } else {
                current = failCause(_e.cause)
              }
            }
            break
          }
          case AsyncTag.Ensuring: {
            ensuring(I.finalizer)
            current = I.async
          }
        }
      } catch (e) {
        if (isAsyncError(e)) {
          current = failCause(e.cause)
        } else {
          current = halt(e)
        }
      }
    }
    if (interruptionState.interrupted) {
      return Ex.interrupt(void 0)
    }
    if (failed) {
      return Ex.failCause<void, never, any>(result)
    }
    return Ex.succeed(result)
  })()
}

export function runPromiseExit<E, A>(
  async: Async<unknown, E, A>,
  interruptionState = new InterruptionState()
): Promise<Exit<E, A>> {
  return runPromiseExitEnv_(async, {}, interruptionState)
}

export function runPromiseExitInterrupt<E, A>(async: Async<unknown, E, A>): [Promise<Exit<E, A>>, () => void] {
  const interruptionState = new InterruptionState()
  const promise           = runPromiseExitEnv_(async, {}, interruptionState)
  const interrupt         = () => {
    interruptionState.interrupt()
  }
  return [promise, interrupt]
}

export function runPromise<A>(
  async: Async<unknown, never, A>,
  interruptionState = new InterruptionState()
): Promise<A> {
  return runPromiseExit(async, interruptionState).then(
    Ex.match((c) => {
      throw C.squash<void>({ show: () => '' })(identity)(c)
    }, identity)
  )
}

export function runPromiseInterrupt<A>(async: Async<unknown, never, A>): [Promise<A>, () => void] {
  const interruptionState = new InterruptionState()
  const promise           = runPromise(async, interruptionState)
  const interrupt         = () => {
    interruptionState.interrupt()
  }
  return [promise, interrupt]
}

export function runAsync_<E, A>(async: Async<unknown, E, A>, onExit?: (exit: Exit<E, A>) => void): () => void {
  const interruptionState = new InterruptionState()
  runPromiseExit(async, interruptionState).then(onExit)
  return () => {
    interruptionState.interrupt()
  }
}

export function runAsync<E, A>(onExit?: (exit: Exit<E, A>) => void): (async: Async<unknown, E, A>) => () => void {
  return (async) => runAsync_(async, onExit)
}

export function runAsyncEnv_<R, E, A>(async: Async<R, E, A>, env: R, onExit?: (exit: Exit<E, A>) => void): () => void {
  const interruptionState = new InterruptionState()
  runPromiseExitEnv_(async, env, interruptionState).then(onExit)
  return () => {
    interruptionState.interrupt()
  }
}

export function runAsyncEnv<R, E, A>(
  env: R,
  onExit?: (exit: Exit<E, A>) => void
): (async: Async<R, E, A>) => () => void {
  return (async) => runAsyncEnv_(async, env, onExit)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<AsyncF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<AsyncF>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorC = P.SemimonoidalFunctor<AsyncF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_
})

export const Apply = P.Apply<AsyncF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const apS = P.apSF(Apply)

export const apT = P.apTF(Apply)

export const mapN_ = P.mapNF_(Apply)

export const mapN = P.mapNF(Apply)

export const ApplyC = P.Apply<AsyncF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  ap_: apC_
})

export const apSC = P.apSF(ApplyC)

export const apTC = P.apTF(ApplyC)

export const mapNC_ = P.mapNF_(ApplyC)

export const mapNC = P.mapNF(ApplyC)

export const MonoidalFunctor = P.MonoidalFunctor<AsyncF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorC = P.MonoidalFunctor<AsyncF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  unit
})

export const Applicative = P.Applicative<AsyncF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeC = P.Applicative<AsyncF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  ap_: apC_,
  unit,
  pure
})

export const Monad = P.Monad<AsyncF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const chainRec_: <A, R, E, B>(a: A, f: (a: A) => Async<R, E, E.Either<A, B>>) => Async<R, E, B> =
  P.getChainRec_<AsyncF>({ map_, crossWith_, cross_, ap_, unit, pure, chain_, flatten })
export const chainRec: <A, R, E, B>(f: (a: A) => Async<R, E, E.Either<A, B>>) => (a: A) => Async<R, E, B> =
  P.getChainRec<AsyncF>({ map_, crossWith_, cross_, ap_, unit, pure, chain_, flatten })

export const Do: P.Do<AsyncF> = P.Do(Monad)

export const pureS_ = P.pureSF_(Monad)

export const pureS = P.pureSF(Monad)

export const chainS_ = P.chainSF_(Monad)

export const chainS = P.chainSF(Monad)

export const toS_ = P.toSF_(Monad)

export const toS = P.toSF(Monad)

const adapter: {
  <A>(_: Tag<A>): GenHKT<Async<Has<A>, never, A>, A>
  <A>(_: Maybe<A>): GenHKT<Async<unknown, NoSuchElementError, A>, A>
  <E, A>(_: Maybe<A>, onNothing: () => E): GenHKT<Async<unknown, E, A>, A>
  <E, A>(_: E.Either<E, A>): GenHKT<Async<unknown, E, A>, A>
  <R, E, A>(_: Async<R, E, A>): GenHKT<Async<R, E, A>, A>
} = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenHKT(asksService(_)(identity))
  }
  if (E.isEither(_)) {
    return new GenHKT(_._tag === 'Left' ? fail(_.left) : succeed(_.right))
  }
  if (isMaybe(_)) {
    return new GenHKT(_._tag === 'Nothing' ? fail(__ ? __() : new NoSuchElementError('Async.gen')) : succeed(_.value))
  }
  return new GenHKT(_)
}

export const gen = genF(Monad, { adapter })

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

interface RemoveListener {
  (): void
}

class InterruptionState {
  private isInterrupted = false
  readonly listeners    = new Set<() => void>()

  addListener(f: () => void): RemoveListener {
    this.listeners.add(f)
    return () => {
      this.listeners.delete(f)
    }
  }

  get interrupted() {
    return this.isInterrupted
  }

  interrupt() {
    if (!this.isInterrupted) {
      this.isInterrupted = true
      this.listeners.forEach((f) => {
        f()
      })
    }
  }
}

class CancellablePromise<E, A> {
  readonly _E!: () => E

  private reject: ((e: Exit<any, never>) => void) | undefined = undefined

  private current: Promise<A> | undefined = undefined

  constructor(
    readonly factory: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly interruptionState: InterruptionState
  ) {}

  promise(): Promise<A> {
    if (this.current) {
      throw new Error('Bug: promise() has been called twice')
    }
    if (this.interruptionState.interrupted) {
      throw new Error('Bug: promise already interrupted on creation')
    }
    const onInterrupt: Array<() => void> = []

    const removeListener = this.interruptionState.addListener(() => {
      onInterrupt.forEach((f) => {
        f()
      })
      this.interrupt()
    })

    const p = new Promise<A>((resolve, reject) => {
      this.reject = reject
      this.factory((f) => {
        onInterrupt.push(f)
      })
        .then((a) => {
          removeListener()
          if (!this.interruptionState.interrupted) {
            resolve(a)
          }
        })
        .catch((e) => {
          removeListener()
          if (!this.interruptionState.interrupted) {
            reject(e)
          }
        })
    })
    this.current = p
    return p
  }

  interrupt() {
    this.reject?.(Ex.interrupt<void>(void 0))
  }
}

class PromiseTracingContext {
  private running = new Set<Promise<any>>()

  constructor() {
    this.traced = this.traced.bind(this)
    this.wait   = this.wait.bind(this)
    this.clear  = this.clear.bind(this)
  }

  traced<A>(promise: () => Promise<A>) {
    return async () => {
      const p = promise()
      this.running.add(p)

      try {
        const a = await p
        this.running.delete(p)
        return Promise.resolve(a)
      } catch (e) {
        this.running.delete(p)
        return Promise.reject(e)
      }
    }
  }

  async wait(): Promise<Exit<any, any>[]> {
    const t = await Promise.all(
      Array.from(this.running).map((p) => p.then((a) => Ex.succeed(a)).catch((e) => Promise.resolve(e)))
    )
    return await new Promise((r) => {
      setTimeout(() => {
        r(t)
      }, 0)
    })
  }

  clear() {
    this.running.clear()
  }
}

export const defaultPromiseTracingContext = new PromiseTracingContext()
