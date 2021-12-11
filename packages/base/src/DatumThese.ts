import type * as HKT from './HKT'

import * as Dt from './Datum'
import { pipe } from './function'
import * as P from './prelude'
import * as T from './These'
import { tuple } from './tuple'

export type DatumThese<E, A> = Dt.Datum<T.These<E, A>>

export interface DatumTheseF extends HKT.HKT {
  readonly type: DatumThese<this['E'], this['A']>
  readonly variance: {
    E: '+'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export const initial: <E = never, A = never>() => DatumThese<E, A> = Dt.initial

export const pending: <E = never, A = never>() => DatumThese<E, A> = Dt.pending

export function refreshingLeft<E = never, A = never>(e: E): DatumThese<E, A> {
  return Dt.refreshing(T.left(e))
}

export function refreshingRight<E = never, A = never>(a: A): DatumThese<E, A> {
  return Dt.refreshing(T.right(a))
}

export function refreshingBoth<E, A>(e: E, a: A): DatumThese<E, A> {
  return Dt.refreshing(T.both(e, a))
}

export function repleteLeft<E = never, A = never>(e: E): DatumThese<E, A> {
  return Dt.replete(T.left(e))
}

export function repleteRight<E = never, A = never>(a: A): DatumThese<E, A> {
  return Dt.replete(T.right(a))
}

export function repleteBoth<E, A>(e: E, a: A): DatumThese<E, A> {
  return Dt.replete(T.both(e, a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * refinements
 * -------------------------------------------------------------------------------------------------
 */

export const isInitial = Dt.isInitial

export const isPending = Dt.isPending

export const isRefreshing = Dt.isRefreshing

export const isReplete = Dt.isReplete

export const isNonEmpty = Dt.isNonEmpty

export const isEmpty = Dt.isEmpty

export function isRefreshingLeft<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Left<E>> {
  return isRefreshing(fa) && T.isLeft(fa.value)
}

export function isRefreshingRight<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Right<A>> {
  return isRefreshing(fa) && T.isRight(fa.value)
}

export function isRefreshingBoth<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Both<E, A>> {
  return isRefreshing(fa) && T.isBoth(fa.value)
}

export function isRepleteLeft<E, A>(fa: DatumThese<E, A>): fa is Dt.Replete<T.Left<E>> {
  return isReplete(fa) && T.isLeft(fa.value)
}

export function isRepleteRight<E, A>(fa: DatumThese<E, A>): fa is Dt.Replete<T.Right<A>> {
  return isReplete(fa) && T.isRight(fa.value)
}

export function isRepleteBoth<E, A>(fa: DatumThese<E, A>): fa is Dt.Replete<T.Both<E, A>> {
  return isReplete(fa) && T.isBoth(fa.value)
}

export function isLeft<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Left<E>> | Dt.Replete<T.Left<E>> {
  return isNonEmpty(fa) && T.isLeft(fa.value)
}

export function isRight<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Right<A>> | Dt.Replete<T.Right<A>> {
  return isNonEmpty(fa) && T.isRight(fa.value)
}

export function isBoth<E, A>(fa: DatumThese<E, A>): fa is Dt.Refreshing<T.Both<E, A>> | Dt.Replete<T.Both<E, A>> {
  return isNonEmpty(fa) && T.isBoth(fa.value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function match_<E, A, B, C, D, F, G, H, I, J>(
  fa: DatumThese<E, A>,
  onInitial: () => B,
  onPending: () => C,
  onRefreshingLeft: (e: E) => D,
  onRefreshingRight: (a: A) => F,
  onRefreshingBoth: (e: E, a: A) => G,
  onRepleteLeft: (e: E) => H,
  onRepleteRight: (a: A) => I,
  onRepleteBoth: (e: E, a: A) => J
): B | C | D | F | G | H | I | J {
  return Dt.match_(
    fa,
    onInitial,
    onPending,
    T.match(onRefreshingLeft, onRefreshingRight, onRefreshingBoth),
    T.match(onRepleteLeft, onRepleteRight, onRepleteBoth)
  )
}

export function match<E, A, B, C, D, F, G, H, I, J>(
  onInitial: () => B,
  onPending: () => C,
  onRefreshingLeft: (e: E) => D,
  onRefreshingRight: (a: A) => F,
  onRefreshingBoth: (e: E, a: A) => G,
  onRepleteLeft: (e: E) => H,
  onRepleteRight: (a: A) => I,
  onRepleteBoth: (e: E, a: A) => J
): (fa: DatumThese<E, A>) => B | C | D | F | G | H | I | J {
  return (fa) =>
    match_(
      fa,
      onInitial,
      onPending,
      onRefreshingLeft,
      onRefreshingRight,
      onRefreshingBoth,
      onRepleteLeft,
      onRepleteRight,
      onRepleteBoth
    )
}

export function matchLoading_<E, A, B, C, D, F, G>(
  fa: DatumThese<E, A>,
  onInitial: () => B,
  onPending: () => C,
  onLeft: (e: E, r: boolean) => D,
  onRight: (a: A, r: boolean) => F,
  onBoth: (e: E, a: A, r: boolean) => G
): B | C | D | F | G {
  return Dt.match_(
    fa,
    onInitial,
    onPending,
    T.match(
      (e) => onLeft(e, true),
      (a) => onRight(a, true),
      (e, a) => onBoth(e, a, true)
    ),
    T.match(
      (e) => onLeft(e, false),
      (a) => onRight(a, false),
      (e, a) => onBoth(e, a, false)
    )
  )
}

export function matchLoading<E, A, B, C, D, F, G>(
  onInitial: () => B,
  onPending: () => C,
  onLeft: (e: E, r: boolean) => D,
  onRight: (a: A, r: boolean) => F,
  onBoth: (e: E, a: A, r: boolean) => G
): (fa: DatumThese<E, A>) => B | C | D | F | G {
  return (fa) => matchLoading_(fa, onInitial, onPending, onLeft, onRight, onBoth)
}

export function squash_<E, A, B, C, D, F>(
  fa: DatumThese<E, A>,
  onEmpty: (r: boolean) => B,
  onLeft: (e: E, r: boolean) => C,
  onRight: (a: A, r: boolean) => D,
  onBoth: (e: E, a: A, r: boolean) => F
): B | C | D | F {
  return matchLoading_(
    fa,
    () => onEmpty(false),
    () => onEmpty(true),
    onLeft,
    onRight,
    onBoth
  )
}

export function squash<E, A, B, C, D, F>(
  onEmpty: (r: boolean) => B,
  onLeft: (e: E, r: boolean) => C,
  onRight: (a: A, r: boolean) => D,
  onBoth: (e: E, a: A, r: boolean) => F
): (fa: DatumThese<E, A>) => B | C | D | F {
  return (fa) => squash_(fa, onEmpty, onLeft, onRight, onBoth)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: DatumThese<E, A>, f: (a: A) => B): DatumThese<E, B> {
  return Dt.map_(fa, T.map(f))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: DatumThese<E, A>) => DatumThese<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<E>(
  SE: P.Semigroup<E>
): <A, B, C>(fa: DatumThese<E, A>, fb: DatumThese<E, B>, f: (a: A, b: B) => C) => DatumThese<E, C> {
  return (fa, fb, f) => Dt.crossWith_(fa, fb, (a, b) => T.crossWith_(SE)(a, b, f))
}

export function crossWith<E>(
  SE: P.Semigroup<E>
): <A, B, C>(fb: DatumThese<E, B>, f: (a: A, b: B) => C) => (fa: DatumThese<E, A>) => DatumThese<E, C> {
  return (fb, f) => (fa) => crossWith_(SE)(fa, fb, f)
}

export function getSemimonoidalFunctor<E>(SE: P.Semigroup<E>): P.SemimonoidalFunctor<DatumTheseF, HKT.Fix<'E', E>> {
  return P.SemimonoidalFunctor({
    map_,
    crossWith_: crossWith_(SE),
    cross_: (fa, fb) => crossWith_(SE)(fa, fb, tuple)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): DatumThese<never, void> {
  return repleteRight(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<E>(
  SE: P.Semigroup<E>
): <A, B>(fab: DatumThese<E, (a: A) => B>, fa: DatumThese<E, A>) => DatumThese<E, B> {
  return (fab, fa) => Dt.crossWith_(fab, fa, (tf, ta) => T.crossWith_(SE)(tf, ta, (f, a) => f(a)))
}

export function ap<E>(
  SE: P.Semigroup<E>
): <A>(fa: DatumThese<E, A>) => <B>(fab: DatumThese<E, (a: A) => B>) => DatumThese<E, B> {
  return (fa) => (fab) => ap_(SE)(fab, fa)
}

export function getApply<E>(SE: P.Semigroup<E>): P.Apply<DatumTheseF, HKT.Fix<'E', E>> {
  const TheseF = T.getApply(SE)
  const ap_: P.ApFn_<DatumTheseF, HKT.Fix<'E', E>> = (fab, fa) => Dt.crossWith_(fab, fa, (f, a) => TheseF.ap_(f, a))
  return P.Apply({
    ...getSemimonoidalFunctor(SE),
    ap_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <A>(a: A) => DatumThese<never, A> = repleteRight

export function getApplicative<E>(SE: P.Semigroup<E>): P.Applicative<DatumTheseF, HKT.Fix<'E', E>> {
  return P.Applicative({
    ...getApply(SE),
    pure
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<E>(
  SE: P.Semigroup<E>
): <A, B>(ma: DatumThese<E, A>, f: (a: A) => DatumThese<E, B>) => DatumThese<E, B> {
  return (ma, f) =>
    Dt.chain_(ma, (a) =>
      T.match_(a, repleteLeft, f, (e, a) =>
        pipe(
          f(a),
          Dt.map(
            T.match(
              (e1) => T.left(SE.combine_(e, e1)),
              T.right,
              (e1, b) => T.both(SE.combine_(e, e1), b)
            )
          )
        )
      )
    )
}

export function chain<E>(
  SE: P.Semigroup<E>
): <A, B>(f: (a: A) => DatumThese<E, B>) => (ma: DatumThese<E, A>) => DatumThese<E, B> {
  return (f) => (ma) => chain_(SE)(ma, f)
}

export function getMonad<E>(SE: P.Semigroup<E>): P.Monad<DatumTheseF, HKT.Fix<'E', E>> {
  return P.Monad({
    ...getApplicative(SE),
    chain_: chain_(SE)
  })
}
