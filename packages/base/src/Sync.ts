import type { Chunk } from './Chunk'
import type { Has, Tag } from './Has'
import type * as HKT from './HKT'
import type { List } from './List'
import type { SyncURI } from './Modules'

import * as A from './Array/core'
import * as E from './Either'
import { NoSuchElementError } from './Error'
import { flow, identity, pipe } from './function'
import { isTag, mergeEnvironments } from './Has'
import { ZURI } from './Modules'
import * as O from './Option'
import * as P from './prelude'
import * as R from './Record'
import * as Z from './Z'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Sync<R, E, A> extends Z.Z<never, unknown, unknown, R, E, A> {}

export function isSync(u: unknown): u is Sync<any, any, any> {
  return typeof u === 'object' && u != null && '_U' in u && u['_U'] === ZURI
}

export type USync<A> = Sync<unknown, never, A>
export type FSync<E, A> = Sync<unknown, E, A>
export type URSync<R, A> = Sync<R, never, A>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const succeed: <A>(a: A) => Sync<unknown, never, A> = Z.succeed

export const fail: <E>(e: E) => Sync<unknown, E, never> = Z.fail

const _try: <A>(effect: () => A) => Sync<unknown, unknown, A> = Z.try

export { _try as try }

export const succeedLazy: <A>(effect: () => A) => Sync<unknown, never, A> = Z.succeedLazy

export const tryCatch_: <E, A>(effect: () => A, onThrow: (error: unknown) => E) => Sync<unknown, E, A> = Z.tryCatch_

export const tryCatch: <E>(onThrow: (error: unknown) => E) => <A>(effect: () => A) => Sync<unknown, E, A> = Z.tryCatch

export const deferTry: <R, E, A>(effect: () => Sync<R, E, A>) => Sync<R, unknown, A> = Z.deferTry

export const defer: <R, E, A>(effect: () => Sync<R, E, A>) => Sync<R, E, A> = Z.defer

export const deferTryCatch_: <R, E, A, E1>(
  effect: () => Sync<R, E, A>,
  nThrow: (u: unknown) => E1
) => Sync<R, E | E1, A> = Z.deferTryCatch_

export const deferTryCatch: <E1>(
  onThrow: (u: unknown) => E1
) => <R, E, A>(sync: () => Sync<R, E, A>) => Sync<R, E | E1, A> = Z.deferTryCatch

export const fromEither: <E, A>(either: E.Either<E, A>) => Sync<unknown, E, A> = E.match(fail, succeed)

export const fromOption = <E, A>(option: O.Option<A>, onNone: () => E): Sync<unknown, E, A> =>
  O.match_(option, () => fail(onNone()), succeed)

/*
 * -------------------------------------------------------------------------------------------------
 * Match
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const matchSync_: <R, E, A, R1, E1, B, R2, E2, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => Sync<R & R1 & R2, E1 | E2, B | C> = Z.matchZ_

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const matchSync: <E, A, R1, E1, B, R2, E2, C>(
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => <R>(fa: Sync<R, E, A>) => Sync<R & R1 & R2, E1 | E2, B | C> = Z.matchZ

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const match_: <R, E, A, B, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => Sync<R, never, B | C> = Z.match_

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const match: <E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => <R>(fa: Sync<R, E, A>) => Sync<R, never, B | C> = Z.match

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<R1, E1, B>
) => Sync<R1 & R, E1, A | B> = Z.catchAll_

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll: <E, R1, E1, B>(
  onFailure: (e: E) => Sync<R1, E1, B>
) => <R, A>(fa: Sync<R, E, A>) => Sync<R1 & R, E1, A | B> = Z.catchAll

export const catchSome_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => O.Option<Sync<R1, E1, B>>
) => Sync<R1 & R, E | E1, A | B> = Z.catchSome_

export const catchSome: <E, R1, E1, B>(
  onFailure: (e: E) => O.Option<Sync<R1, E1, B>>
) => <R, A>(fa: Sync<R, E, A>) => Sync<R1 & R, E | E1, A | B> = Z.catchSome

/**
 * Effectfully matches two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogetherSync_<R, E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return pipe(
    cross_(either(left), either(right)),
    chain(([ea, eb]): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> => {
      switch (ea._tag) {
        case 'Left': {
          switch (eb._tag) {
            case 'Left': {
              return onBothFailure(ea.left, eb.left)
            }
            case 'Right': {
              return onLeftFailure(eb.right, ea.left)
            }
          }
        }
        // eslint-disable-next-line no-fallthrough
        case 'Right': {
          switch (eb._tag) {
            case 'Left': {
              return onRightFailure(ea.right, eb.left)
            }
            case 'Right': {
              return onBothSuccess(ea.right, eb.right)
            }
          }
        }
      }
    })
  )
}

/**
 * Effectfully matches two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogetherSync<E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): <R>(left: Sync<R, E, A>) => Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return (left) => matchTogetherSync_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess)
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogether_<R, E, A, R1, E1, B, C, D, F, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): Sync<R & R1, never, C | D | F | G> {
  return matchTogetherSync_(
    left,
    right,
    flow(onBothFailure, succeed),
    flow(onRightFailure, succeed),
    flow(onLeftFailure, succeed),
    flow(onBothSuccess, succeed)
  )
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogether<E, A, R1, E1, B, C, D, F, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): <R>(left: Sync<R, E, A>) => Sync<R & R1, never, C | D | F | G> {
  return (left) => matchTogether_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export const alt_: <R, E, A, R1, E1, A1>(
  fa: Sync<R, E, A>,
  fb: () => Sync<R1, E1, A1>
) => Sync<R & R1, E | E1, A | A1> = Z.alt_

export const alt: <R1, E1, A1>(
  fb: () => Sync<R1, E1, A1>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, A | A1> = Z.alt

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <A>(a: A) => Sync<unknown, never, A> = Z.pure

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export const cross_: <R, E, A, Q, D, B>(fa: Sync<R, E, A>, fb: Sync<Q, D, B>) => Sync<Q & R, D | E, readonly [A, B]> =
  Z.zip_

export const cross: <Q, D, B>(
  fb: Sync<Q, D, B>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, readonly [A, B]> = Z.zip

export const crossWith_: <R, E, A, Q, D, B, C>(
  fa: Sync<R, E, A>,
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => Sync<Q & R, D | E, C> = Z.zipWith_

export const crossWith: <A, Q, D, B, C>(
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => <R, E>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, C> = Z.zipWith

export const ap_: <R, E, A, Q, D, B>(fab: Sync<R, E, (a: A) => B>, fa: Sync<Q, D, A>) => Sync<Q & R, D | E, B> = Z.zap_

export const ap: <Q, D, A>(fa: Sync<Q, D, A>) => <R, E, B>(fab: Sync<R, E, (a: A) => B>) => Sync<Q & R, D | E, B> =
  Z.zap

export const crossFirst_: <R, E, A, R1, E1, B>(fa: Sync<R, E, A>, fb: Sync<R1, E1, B>) => Sync<R & R1, E | E1, A> =
  Z.zipFirst_

export const crossFirst: <R1, E1, B>(fb: Sync<R1, E1, B>) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, A> =
  Z.zipFirst

export const crossSecond_: <R, E, A, R1, E1, B>(fa: Sync<R, E, A>, fb: Sync<R1, E1, B>) => Sync<R & R1, E | E1, B> =
  Z.zipSecond_

export const crossSecond: <R1, E1, B>(fb: Sync<R1, E1, B>) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, B> =
  Z.zipSecond

export function liftA2_<A, B, C>(f: (a: A, b: B) => C): (a: USync<A>, b: USync<B>) => USync<C> {
  return (a, b) => crossWith_(a, b, f)
}

export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (a: USync<A>) => (b: USync<B>) => USync<C> {
  return (a) => (b) => crossWith_(a, b, (a, b) => f(a)(b))
}

export function liftK<A extends [unknown, ...ReadonlyArray<unknown>], B>(
  f: (...args: A) => B
): (...args: { [K in keyof A]: USync<A[K]> }) => USync<B> {
  return (...args) => map_(sequenceT(...(args as any)), (a) => f(...(a as any))) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export const bimap_: <R, E, A, B, C>(pab: Sync<R, E, A>, f: (e: E) => B, g: (a: A) => C) => Sync<R, B, C> = Z.bimap_

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(pab: Sync<R, E, A>) => Sync<R, B, C> = Z.bimap

export const mapError_: <R, E, A, B>(pab: Sync<R, E, A>, f: (e: E) => B) => Sync<R, B, A> = Z.mapError_

export const mapError: <E, B>(f: (e: E) => B) => <R, A>(pab: Sync<R, E, A>) => Sync<R, B, A> = Z.mapError

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

export const either: <R, E, A>(fa: Sync<R, E, A>) => Sync<R, never, E.Either<E, A>> = Z.either

export const subsumeEither: <R, E, E1, A>(fa: Sync<R, E1, E.Either<E, A>>) => Sync<R, E | E1, A> = Z.subsumeEither

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export const map_: <R, E, A, B>(fa: Sync<R, E, A>, f: (a: A) => B) => Sync<R, E, B> = Z.map_

export const map: <A, B>(f: (a: A) => B) => <R, E>(fa: Sync<R, E, A>) => Sync<R, E, B> = Z.map

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export const chain_: <R, E, A, Q, D, B>(ma: Sync<R, E, A>, f: (a: A) => Sync<Q, D, B>) => Sync<Q & R, D | E, B> =
  Z.chain_

export const chain: <A, Q, D, B>(f: (a: A) => Sync<Q, D, B>) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, B> =
  Z.chain

export const flatten: <R, E, R1, E1, A>(mma: Sync<R, E, Sync<R1, E1, A>>) => Sync<R & R1, E | E1, A> = chain(identity)

export const tap_: <R, E, A, Q, D, B>(ma: Sync<R, E, A>, f: (a: A) => Sync<Q, D, B>) => Sync<Q & R, D | E, A> = Z.tap_

export const tap: <A, Q, D, B>(f: (a: A) => Sync<Q, D, B>) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, A> = Z.tap

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getUnfailableMonoid<M>(M: P.Monoid<M>): P.Monoid<USync<M>> {
  return {
    ...getUnfailableSemigroup(M),
    nat: succeed(M.nat)
  }
}

export function getFailableMonoid<E, A>(MA: P.Monoid<A>, ME: P.Monoid<E>): P.Monoid<FSync<E, A>> {
  return {
    ...getFailableSemigroup(MA, ME),
    nat: succeed(MA.nat)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export const ask: <R>() => Sync<R, never, R> = Z.ask

export const asksSync: <R0, R, E, A>(f: (r0: R0) => Sync<R, E, A>) => Sync<R0 & R, E, A> = Z.asksZ

export const asks: <R0, A>(f: (r0: R0) => A) => Sync<R0, never, A> = Z.asks

export const gives_: <R0, R, E, A>(ra: Sync<R, E, A>, f: (r0: R0) => R) => Sync<R0, E, A> = Z.gives_

export const gives: <R0, R>(f: (r0: R0) => R) => <E, A>(ra: Sync<R, E, A>) => Sync<R0, E, A> = Z.gives

export const giveAll_: <R, E, A>(ra: Sync<R, E, A>, env: R) => Sync<unknown, E, A> = Z.giveAll_

export const giveAll: <R>(env: R) => <E, A>(ra: Sync<R, E, A>) => Sync<unknown, E, A> = Z.giveAll

export const give_: <R0, R, E, A>(ra: Sync<R & R0, E, A>, env: R) => Sync<R0, E, A> = Z.give_

export const give: <R>(env: R) => <R0, E, A>(ra: Sync<R & R0, E, A>) => Sync<R0, E, A> = Z.give

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getUnfailableSemigroup<S>(S: P.Semigroup<S>): P.Semigroup<USync<S>> {
  return P.Semigroup(liftA2_(S.combine_))
}

export function getFailableSemigroup<E, A>(SA: P.Semigroup<A>, SE: P.Semigroup<E>): P.Semigroup<FSync<E, A>> {
  return P.Semigroup((x, y) =>
    matchTogetherSync_(
      x,
      y,
      (e, e1) => fail(SE.combine_(e, e1)),
      (_, e1) => fail(e1),
      (_, e) => fail(e),
      (a, b) => succeed(SA.combine_(a, b))
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export const unit: () => Sync<unknown, never, void> = Z.unit

/*
 * -------------------------------------------------------------------------------------------------
 * Service
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesSync<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R & P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  E,
  B
> {
  return (f) =>
    Z.asksZ(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTSync<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R & P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  E,
  B
> {
  return (f) =>
    Z.asksZ(
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
) => Sync<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  never,
  B
> {
  return (f) =>
    Z.asks(
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
) => Sync<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  never,
  B
> {
  return (f) =>
    Z.asks(
      (r: P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
        f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceSync<T>(s: Tag<T>): <R, E, B>(f: (a: T) => Sync<R, E, B>) => Sync<R & Has<T>, E, B> {
  return (f) => Z.asksZ((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => Sync<Has<T>, never, B> {
  return (f) => asksServiceSync(s)((a) => Z.pure(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): Sync<Has<T>, never, T> {
  return asksServiceSync(s)((a) => Z.pure(a))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveServiceSync<T>(
  _: Tag<T>
): <R, E>(f: Sync<R, E, T>) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1, E | E1, A1> {
  return <R, E>(f: Sync<R, E, T>) =>
    <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>): Sync<R & R1, E | E1, A1> =>
      Z.asksZ((r: R & R1) => Z.chain_(f, (t) => Z.giveAll_(ma, mergeEnvironments(_, r, t))))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveService<T>(_: Tag<T>): (f: T) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1, E1, A1> {
  return (f) => (ma) => giveServiceSync(_)(Z.pure(f))(ma)
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceSync<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1 & Has<T>, E | E1, A1> {
  return (ma) => asksServiceSync(_)((t) => giveServiceSync(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceSync_<R, E, T, R1, E1, A1>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): Sync<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceSync(_)((t) => giveServiceSync(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceSync(_)((t) => giveServiceSync(_)(Z.pure(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService_<R1, E1, A1, T>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Sync<R1 & Has<T>, E1, A1> {
  return asksServiceSync(_)((t) => giveServiceSync(_)(Z.pure(f(t)))(ma))
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: Sync<R, E, A>) => Sync<R, E, Has<A>> {
  return (fa) => Z.map_(fa, has.of)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Run
 * -------------------------------------------------------------------------------------------------
 */

export const runEither: <E, A>(sync: Sync<unknown, E, A>) => E.Either<E, A> = Z.runEither

export const runEitherEnv_: <R, E, A>(sync: Sync<R, E, A>, env: R) => E.Either<E, A> = Z.runReaderEither_

export const runEitherEnv: <R>(env: R) => <E, A>(sync: Sync<R, E, A>) => E.Either<E, A> = Z.runReaderEither

export const run: <A>(sync: Sync<unknown, never, A>) => A = Z.runResult

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export const iforeachUnit_: <A, R, E>(as: Iterable<A>, f: (i: number, a: A) => Sync<R, E, void>) => Sync<R, E, void> =
  Z.iforeachUnit_

export const iforeachUnit: <A, R, E>(
  f: (i: number, a: A) => Sync<R, E, void>
) => (as: Iterable<A>) => Sync<R, E, void> = Z.iforeachUnit

export const iforeach_: <A, R, E, B>(as: Iterable<A>, f: (i: number, a: A) => Sync<R, E, B>) => Sync<R, E, Chunk<B>> =
  Z.iforeach_

export const iforeach: <A, R, E, B>(
  f: (i: number, a: A) => Sync<R, E, B>
) => (as: Iterable<A>) => Sync<R, E, Chunk<B>> = Z.iforeach

export const foreach_: <A, R, E, B>(as: Iterable<A>, f: (a: A) => Sync<R, E, B>) => Sync<R, E, Chunk<B>> = Z.foreach_

export const foreach: <A, R, E, B>(f: (a: A) => Sync<R, E, B>) => (as: Iterable<A>) => Sync<R, E, Chunk<B>> = Z.foreach

export const iforeachArrayUnit_: <A, R, E>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Sync<R, E, void>
) => Sync<R, E, void> = Z.iforeachArrayUnit_

export const iforeachArrayUnit: <A, R, E>(
  f: (i: number, a: A) => Sync<R, E, void>
) => (as: ReadonlyArray<A>) => Sync<R, E, void> = Z.iforeachArrayUnit

export const iforeachArray_: <A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Sync<R, E, B>
) => Sync<R, E, ReadonlyArray<B>> = Z.iforeachArray_

export const iforeachArray: <A, R, E, B>(
  f: (i: number, a: A) => Sync<R, E, B>
) => (as: ReadonlyArray<A>) => Sync<R, E, ReadonlyArray<B>> = Z.iforeachArray

export const foreachArray_: <A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => Sync<R, E, B>
) => Sync<R, E, ReadonlyArray<B>> = Z.foreachArray_

export const foreachArray: <A, R, E, B>(
  f: (a: A) => Sync<R, E, B>
) => (as: ReadonlyArray<A>) => Sync<R, E, ReadonlyArray<B>> = Z.foreachArray

export const iforeachList_: <A, R, E, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => Sync<R, E, B>
) => Sync<R, E, List<B>> = Z.iforeachList_

export const iforeachList: <A, R, E, B>(
  f: (i: number, a: A) => Sync<R, E, B>
) => (as: Iterable<A>) => Sync<R, E, List<B>> = Z.iforeachList

export const foreachList_: <A, R, E, B>(as: Iterable<A>, f: (a: A) => Sync<R, E, B>) => Sync<R, E, List<B>> =
  Z.foreachList_

export const foreachList: <A, R, E, B>(f: (a: A) => Sync<R, E, B>) => (as: Iterable<A>) => Sync<R, E, List<B>> =
  Z.foreachList

export function collectAll<R, E, A>(as: Iterable<Sync<R, E, A>>): Sync<R, E, Chunk<A>> {
  return foreach_(as, identity)
}

export function collectAllArray<R, E, A>(as: ReadonlyArray<Sync<R, E, A>>): Sync<R, E, ReadonlyArray<A>> {
  return foreachArray_(as, identity)
}

export function collectAllList<R, E, A>(as: Iterable<Sync<R, E, A>>): Sync<R, E, List<A>> {
  return foreachList_(as, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

type URI = [HKT.URI<typeof SyncURI>]

export const Alt = P.Alt<URI, V>({
  map_,
  alt_
})

export const Functor = P.Functor<URI, V>({
  map_
})

export const Bifunctor = P.Bifunctor<URI, V>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)
export const mapN_     = P.mapNF_(SemimonoidalFunctor)
export const mapN      = P.mapNF(SemimonoidalFunctor)

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const apS = P.apSF(Apply)
export const apT = P.apTF(Apply)

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
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

export const Monad = P.Monad<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  catchAll_,
  fail
})

/*
 * -------------------------------------------------------------------------------------------------
 * Do
 * -------------------------------------------------------------------------------------------------
 */

export const Do = P.Do(Monad)

const of: Sync<unknown, never, {}> = succeed({})
export { of as do }

export const pureS: <K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
) => <R, E>(
  mk: Sync<R, E, K>
) => Sync<
  R,
  E,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> = P.pureSF(Monad)

export const pureS_ = P.pureSF_(Monad)

export const chainS_ = P.chainSF_(Monad)

export const chainS: <R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Sync<R, E, A>
) => <R2, E2>(
  mk: Sync<R2, E2, K>
) => Sync<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> = P.chainSF(Monad)

export const toS_ = P.toSF_(Monad)

export const toS: <K, N extends string>(
  name: Exclude<N, keyof K>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R, E, { [k in Exclude<N, keyof K>]: A }> = P.toSF(Monad)

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

export class GenSync<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly S: Sync<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (E.isEither(_)) {
    return new GenSync(fromEither(_))
  }
  if (O.isOption(_)) {
    return new GenSync(fromOption(_, () => (__ ? __() : new NoSuchElementError('Sync.gen'))))
  }
  if (isTag(_)) {
    return new GenSync(asksService(_)(identity))
  }
  return new GenSync(_)
}

export function gen<R0, E0, A0>(): <T extends GenSync<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<P._R<T>, P._E<T>, A0>
export function gen<E0, A0>(): <T extends GenSync<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<P._R<T>, P._E<T>, A0>
export function gen<A0>(): <T extends GenSync<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<P._R<T>, P._E<T>, A0>
export function gen<T extends GenSync<any, any, any>, A>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A, any>
): Sync<P._R<T>, P._E<T>, A>
export function gen(...args: any[]): any {
  const _gen = <T extends GenSync<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Sync<P._R<T>, P._E<T>, A> =>
    defer(() => {
      const iterator = f(adapter as any)
      const state    = iterator.next()

      const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): Sync<any, any, A> => {
        if (state.done) {
          return succeed(state.value)
        }
        return chain_(state.value.S, (v) => {
          const next = iterator.next(v)
          return run(next)
        })
      }

      return run(state)
    })

  if (args.length === 0) {
    return (f: any) => _gen(f)
  }

  return _gen(args[0])
}

export { SyncURI } from './Modules'
