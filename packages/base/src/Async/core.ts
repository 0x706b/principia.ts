import type { Has, Tag } from '../Has'
import type * as HKT from '../HKT'
import type { AsyncURI } from '../Modules'
import type { Option } from '../Option'
import type { Stack } from '../util/support/Stack'

import * as A from '../Array/core'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import { genF, GenHKT } from '../Gen'
import { isTag, mergeEnvironments } from '../Has'
import { isOption } from '../Option'
import * as P from '../prelude'
import * as R from '../Record'
import { makeStack } from '../util/support/Stack'
import * as Ex from './AsyncExit'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const AsyncTypeId = Symbol('@principia/base/Async')
export type AsyncTypeId = typeof AsyncTypeId

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

export const AsyncTag = {
  Succeed: 'Succeed',
  Total: 'Total',
  Partial: 'Partial',
  Defer: 'Defer',
  Promise: 'Promise',
  Chain: 'Chain',
  Fold: 'Fold',
  Asks: 'Asks',
  Done: 'Done',
  Give: 'Give',
  Finalize: 'Finalize',
  All: 'All',
  Fail: 'Fail',
  Interrupt: 'Interrupt'
} as const

export type UAsync<A> = Async<unknown, never, A>
export type FAsync<E, A> = Async<unknown, E, A>
export type URAsync<R, A> = Async<R, never, A>

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

type URI = [HKT.URI<AsyncURI>]

export type Concrete =
  | Succeed<any>
  | Defer<any, any, any>
  | LiftPromise<any, any>
  | Chain<any, any, any, any, any, any>
  | Fold<any, any, any, any, any, any, any, any, any>
  | Asks<any, any, any, any>
  | Done<any, any>
  | Give<any, any, any>
  | Finalize<any, any, any, any, any>
  | All<any, any, any>
  | Fail<any>
  | Total<any>
  | Partial<any, any>
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

export class Total<A> extends Async<unknown, never, A> {
  readonly _asyncTag = AsyncTag.Total

  constructor(readonly thunk: () => A) {
    super()
  }
}

export class Partial<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = AsyncTag.Partial

  constructor(readonly thunk: () => A, readonly onThrow: (error: unknown) => E) {
    super()
  }
}

export class Done<E, A> extends Async<unknown, E, A> {
  readonly _asyncTag = AsyncTag.Done

  constructor(readonly exit: Ex.AsyncExit<E, A>) {
    super()
  }
}

export class Fail<E> extends Async<unknown, E, never> {
  readonly _asyncTag = AsyncTag.Fail

  constructor(readonly e: E) {
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
  readonly _asyncTag = AsyncTag.Promise

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

export class Fold<R, E, A, R1, E1, B, R2, E2, C> extends Async<R & R1 & R2, E1 | E2, B | C> {
  readonly _asyncTag = AsyncTag.Fold

  constructor(
    readonly async: Async<R, E, A>,
    readonly f: (e: E) => Async<R1, E1, B>,
    readonly g: (a: A) => Async<R2, E2, C>
  ) {
    super()
  }
}

export class Finalize<R, E, A, R1, B> extends Async<R & R1, E, A> {
  readonly _asyncTag = AsyncTag.Finalize

  constructor(readonly async: Async<R, E, A>, readonly f: () => Async<R1, never, B>) {
    super()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function succeed<A>(a: A): Async<unknown, never, A> {
  return new Succeed(a)
}

export function fail<E>(e: E): Async<unknown, E, never> {
  return new Fail(e)
}

export function done<E, A>(exit: Ex.AsyncExit<E, A>): Async<unknown, E, A> {
  return new Done(exit)
}

export function defer<R, E, A>(factory: () => Async<R, E, A>): Async<R, E, A> {
  return new Defer(factory)
}

export function promiseUnfailable<A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>
): Async<unknown, never, A> {
  return new LiftPromise(promise, () => undefined as never)
}

export function promise_<E, A>(
  promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
  onError: (u: unknown) => E
): Async<unknown, E, A> {
  return new LiftPromise(promise, onError)
}

export function promise<E>(
  onError: (u: unknown) => E
): <A>(promise: (onInterrupt: (f: () => void) => void) => Promise<A>) => LiftPromise<E, A> {
  return (promise) => new LiftPromise(promise, onError)
}

export function effectTotal<A>(thunk: () => A): Async<unknown, never, A> {
  return new Total(thunk)
}

export function effectCatch_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> {
  return new Partial(thunk, onThrow)
}

export function effectCatch<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => Async<unknown, E, A> {
  return (thunk) => effectCatch_(thunk, onThrow)
}

export function interrupt(): Async<unknown, never, never> {
  return new Interrupt()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function matchM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Fold(async, f, g)
}

export function matchM<E, A, R1, E1, A1, R2, E2, A2>(
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): <R>(async: Async<R, E, A>) => Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return (async) => matchM_(async, f, g)
}

export function match_<R, E, A, B, C>(async: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, never, B | C> {
  return matchM_(async, P.flow(f, succeed), P.flow(g, succeed))
}

export function match<E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
): <R>(async: Async<R, E, A>) => Async<R, never, B | C> {
  return (async) => match_(async, f, g)
}

export function catchAll_<R, E, A, R1, E1, A1>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>
): Async<R & R1, E1, A | A1> {
  return matchM_(async, f, succeed)
}

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

export function sequenceTPar<A extends ReadonlyArray<Async<any, any, any>>>(
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

export function crossPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return crossWithPar_(fa, fb, P.tuple)
}

export function crossPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> {
  return map_(sequenceTPar(fa, fb), ([a, b]) => f(a, b))
}

export function crossWithPar<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Async<R1, E1, (a: A) => B>,
  fa: Async<R, E, A>
): Async<R & R1, E | E1, B> {
  return crossWithPar_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E1 | E, B> {
  return (fab) => apPar_(fab, fa)
}

export function crossFirstPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A> {
  return crossWithPar_(fa, fb, (a, _) => a)
}

export function crossFirstPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => crossFirstPar_(fa, fb)
}

export function crossSecondPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A1> {
  return crossWithPar_(fa, fb, (_, b) => b)
}

export function crossSecondPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => crossSecondPar_(fa, fb)
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
  return crossWith_(fa, fb, P.tuple)
}

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

export function crossWith<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<R, E, A, R1, E1, B>(fab: Async<R1, E1, (a: A) => B>, fa: Async<R, E, A>): Async<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<R, E, A, R1, E1, A1>(fa: Async<R, E, A>, fb: Async<R1, E1, A1>): Async<R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A1> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, E, A, B>(pab: Async<R, E, A>, f: (e: E) => B): Async<R, B, A> {
  return matchM_(pab, P.flow(f, fail), succeed)
}

export function mapError<E, B>(f: (e: E) => B): <R, A>(pab: Async<R, E, A>) => Async<R, B, A> {
  return (pab) => mapError_(pab, f)
}

export function bimap_<R, E, A, B, C>(pab: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, B, C> {
  return matchM_(pab, P.flow(f, fail), P.flow(g, succeed))
}

export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Async<R, E, A>) => Async<R, B, C> {
  return (pab) => bimap_(pab, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fallible
 * -------------------------------------------------------------------------------------------------
 */

export function subsumeEither<R, E, E1, A>(async: Async<R, E, E.Either<E1, A>>): Async<R, E | E1, A> {
  return matchM_(async, fail, E.match(fail, succeed))
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

export function chain<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, B> {
  return (ma) => new Chain(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Async<R, E, Async<R1, E1, A>>): Async<R & R1, E | E1, A> {
  return chain_(mma, P.identity)
}

export function tap_<R, E, A, Q, D, B>(ma: Async<R, E, A>, f: (a: A) => Async<Q, D, B>): Async<Q & R, D | E, A> {
  return chain_(ma, (a) => chain_(f(a), (_) => succeed(a)))
}

export function tap<A, Q, D, B>(f: (a: A) => Async<Q, D, B>): <R, E>(ma: Async<R, E, A>) => Async<Q & R, D | E, A> {
  return (ma) => tap_(ma, f)
}

export function tapError_<R, E, A, R1, E1, B>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, B>
): Async<R & R1, E | E1, A> {
  return catchAll_(async, (e) => chain_(f(e), (_) => fail(e)))
}

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
  return asks(P.identity)
}

export function giveAll_<R, E, A>(ra: Async<R, E, A>, env: R): Async<unknown, E, A> {
  return new Give(ra, env)
}

export function giveAll<R>(env: R): <E, A>(ra: Async<R, E, A>) => Async<unknown, E, A> {
  return (ra) => new Give(ra, env)
}

export function gives_<R0, R, E, A>(ra: Async<R, E, A>, f: (_: R0) => R): Async<R0, E, A> {
  return asksAsync((_: R0) => giveAll_(ra, f(_)))
}

export function gives<R0, R>(f: (_: R0) => R): <E, A>(ra: Async<R, E, A>) => Async<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function give_<R0, R, E, A>(ra: Async<R & R0, E, A>, env: R): Async<R0, E, A> {
  return gives_(ra, (r0) => ({ ...env, ...r0 }))
}

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

type Frame = FoldFrame | ApplyFrame

export function runPromiseExitEnv_<R, E, A>(
  async: Async<R, E, A>,
  r: R,
  interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> {
  return defaultPromiseTracingContext.traced(async () => {
    let frames: Stack<Frame> | undefined          = undefined
    let result                                    = null
    let env: Stack<any> | undefined               = makeStack(r)
    let failed                                    = false
    let current: Async<any, any, any> | undefined = async
    let instructionCount                          = 0
    let interrupted                               = false

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

    function popEnv() {
      const current = env?.value
      env           = env?.previous
      return current
    }

    function pushEnv(k: any) {
      env = makeStack(k, env)
    }

    function unwindStack() {
      let unwinding = true
      while (unwinding) {
        const next = popContinuation()
        if (next == null) {
          unwinding = false
        } else if (next._tag === 'FoldFrame') {
          unwinding = false
          pushContinuation(new ApplyFrame(next.recover))
        }
      }
    }

    while (current != null && !isInterrupted()) {
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
          const nested: Concrete = asConcrete(I.async)
          const continuation     = I.f
          switch (nested._asyncTag) {
            case AsyncTag.Succeed: {
              current = continuation(nested.value)
              break
            }
            case AsyncTag.Total: {
              current = continuation(nested.thunk())
              break
            }
            case AsyncTag.Partial: {
              try {
                current = continuation(nested.thunk())
              } catch (e) {
                current = fail(nested.onThrow(e))
              }
              break
            }
            default: {
              current = nested
              pushContinuation(new ApplyFrame(continuation))
            }
          }
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
        case AsyncTag.Total: {
          current = succeed(I.thunk())
          break
        }
        case AsyncTag.Partial: {
          try {
            current = succeed(I.thunk())
          } catch (e) {
            current = fail(I.onThrow(e))
          }
          break
        }
        case AsyncTag.Fail: {
          unwindStack()
          const next = popContinuation()
          if (next) {
            current = next.apply(I.e)
          } else {
            failed  = true
            result  = I.e
            current = undefined
          }
          break
        }
        case AsyncTag.Done: {
          switch (I.exit._tag) {
            case 'Failure': {
              current = fail(I.exit.error)
              break
            }
            case 'Interrupt': {
              interrupted = true
              current     = undefined
              break
            }
            case 'Success': {
              current = succeed(I.exit.value)
              break
            }
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
          current = I.f(env.value || {})
          break
        }
        case AsyncTag.Give: {
          current = P.pipe(
            effectTotal(() => {
              pushEnv(I.env)
            }),
            chain(() => I.async),
            tap(() =>
              effectTotal(() => {
                popEnv()
              })
            )
          )
          break
        }
        case AsyncTag.All: {
          const exits: ReadonlyArray<Ex.AsyncExit<any, any>> = await Promise.all(
            A.map_(I.asyncs, (a) => runPromiseExitEnv_(a, env?.value || {}, interruptionState))
          )
          const results                                      = []
          let errored                                        = false
          for (let i = 0; i < exits.length && !errored; i++) {
            const e = exits[i]
            switch (e._tag) {
              case 'Success': {
                results.push(e.value)
                break
              }
              case 'Failure': {
                errored = true
                current = fail(e.error)
                break
              }
              case 'Interrupt': {
                errored     = true
                interrupted = true
                current     = undefined
                break
              }
            }
          }
          if (!errored) {
            current = succeed(results)
          }
          break
        }
        case AsyncTag.Promise: {
          try {
            current = succeed(
              await new CancellablePromise(
                (s) => I.promise(s).catch((e) => Promise.reject(Ex.fail(e))),
                interruptionState
              ).promise()
            )
          } catch (e) {
            const _e = e as Ex.Rejection<E>
            switch (_e._tag) {
              case 'Failure': {
                current = fail(_e.error)
                break
              }
              case 'Interrupt': {
                interrupted = true
                current     = undefined
                break
              }
            }
          }
          break
        }
      }
    }
    if (interruptionState.interrupted) {
      return Ex.interrupt()
    }
    if (failed) {
      return Ex.fail(result)
    }
    return Ex.succeed(result)
  })()
}

export function runPromiseExit<E, A>(
  async: Async<unknown, E, A>,
  interruptionState = new InterruptionState()
): Promise<Ex.AsyncExit<E, A>> {
  return runPromiseExitEnv_(async, {}, interruptionState)
}

export function runPromiseExitInterrupt<E, A>(async: Async<unknown, E, A>): [Promise<Ex.AsyncExit<E, A>>, () => void] {
  const interruptionState = new InterruptionState()
  const p                 = runPromiseExitEnv_(async, {}, interruptionState)
  const i                 = () => {
    interruptionState.interrupt()
  }
  return [p, i]
}

export function runAsync<E, A>(async: Async<unknown, E, A>, onExit?: (exit: Ex.AsyncExit<E, A>) => void): () => void {
  const interruptionState = new InterruptionState()
  runPromiseExit(async, interruptionState).then(onExit)
  return () => {
    interruptionState.interrupt()
  }
}

export function runAsyncEnv<R, E, A>(
  async: Async<R, E, A>,
  env: R,
  onExit?: (exit: Ex.AsyncExit<E, A>) => void
): () => void {
  const interruptionState = new InterruptionState()
  runPromiseExitEnv_(async, env, interruptionState).then(onExit)
  return () => {
    interruptionState.interrupt()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI, V>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar = P.Apply<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativePar = P.Applicative<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const Do: P.Do<URI, V> = P.Do(Monad)

export const pureS_ = P.pureSF_(Monad)

export const pureS = P.pureSF(Monad)

export const chainS_ = P.chainSF_(Monad)

export const chainS = P.chainSF(Monad)

export const toS_ = P.toSF_(Monad)

export const toS = P.toSF(Monad)

const adapter: {
  <A>(_: Tag<A>): GenHKT<Async<Has<A>, never, A>, A>
  <A>(_: Option<A>): GenHKT<Async<unknown, NoSuchElementError, A>, A>
  <E, A>(_: Option<A>, onNone: () => E): GenHKT<Async<unknown, E, A>, A>
  <E, A>(_: E.Either<E, A>): GenHKT<Async<unknown, E, A>, A>
  <R, E, A>(_: Async<R, E, A>): GenHKT<Async<R, E, A>, A>
} = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenHKT(asksService(_)(P.identity))
  }
  if (E.isEither(_)) {
    return new GenHKT(_._tag === 'Left' ? fail(_.left) : succeed(_.right))
  }
  if (isOption(_)) {
    return new GenHKT(_._tag === 'None' ? fail(__ ? __() : new NoSuchElementError('Async.gen')) : succeed(_.value))
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
  private mut_isInterrupted = false
  readonly listeners        = new Set<() => void>()

  listen(f: () => void): RemoveListener {
    this.listeners.add(f)
    return () => {
      this.listeners.delete(f)
    }
  }

  get interrupted() {
    return this.mut_isInterrupted
  }

  interrupt() {
    this.mut_isInterrupted = true
    this.listeners.forEach((f) => {
      f()
    })
  }
}

class CancellablePromise<E, A> {
  readonly _E!: () => E

  private mut_reject: ((e: Ex.Rejection<any>) => void) | undefined = undefined

  private mut_current: Promise<A> | undefined = undefined

  constructor(
    readonly factory: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly interruptionState: InterruptionState
  ) {}

  promise(): Promise<A> {
    if (this.mut_current) {
      throw new Error('Bug: promise() has been called twice')
    }
    if (this.interruptionState.interrupted) {
      throw new Error('Bug: promise already interrupted on creation')
    }
    const onInterrupt: Array<() => void> = []

    const removeListener = this.interruptionState.listen(() => {
      onInterrupt.forEach((f) => {
        f()
      })
      this.interrupt()
    })

    const p = new Promise<A>((resolve, reject) => {
      this.mut_reject = reject
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
    this.mut_current = p
    return p
  }

  interrupt() {
    this.mut_reject?.(Ex.interrupt())
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

  async wait(): Promise<Ex.AsyncExit<any, any>[]> {
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
