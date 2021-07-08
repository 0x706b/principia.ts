import type { Eq } from './Eq'
import type { Both, Left, Right, These } from './internal/These'
import type { TheseURI } from './Modules'
import type * as O from './Option'
import type { Show } from './Show'

import * as HKT from './HKT'
import { none, some } from './internal/Option'
import * as T from './internal/These'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export { Both, Left, Right, These } from './internal/These'

export type V = HKT.V<'E', '+'>

type URI = [HKT.URI<TheseURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category constructors
 */
export const left = T.left

export function leftOrThese_<E, A>(me: O.Option<A>, e: E): These<E, A> {
  return me._tag === 'None' ? left(e) : both(e, me.value)
}

export function leftOrThese<E>(e: E): <A>(me: O.Option<A>) => These<E, A> {
  return (me) => leftOrThese_(me, e)
}

/**
 * @category constructors
 */
export const right = T.right

export function rightOrThese_<E, A>(me: O.Option<E>, a: A): These<E, A> {
  return me._tag === 'None' ? right(a) : both(me.value, a)
}

export function rightOrThese<A>(a: A): <E>(me: O.Option<E>) => These<E, A> {
  return (me) => rightOrThese_(me, a)
}

/**
 * @category constructors
 */
export const both = T.both

export function fromOptions<E, A>(fe: O.Option<E>, fa: O.Option<A>): O.Option<These<E, A>> {
  return fe._tag === 'None'
    ? fa._tag === 'None'
      ? none()
      : some(right(fa.value))
    : fa._tag === 'None'
    ? some(left(fe.value))
    : some(both(fe.value, fa.value))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isBoth<E, A>(fa: These<E, A>): fa is Both<E, A> {
  return fa._tag === 'Both'
}

export function isLeft<E, A>(fa: These<E, A>): fa is Left<E> {
  return fa._tag === 'Left'
}

export function isRight<E, A>(fa: These<E, A>): fa is Right<A> {
  return fa._tag === 'Right'
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

export function getLeft<E, A>(fa: These<E, A>): O.Option<E> {
  return isRight(fa) ? none() : some(fa.left)
}

export function getLeftOnly<E, A>(fa: These<E, A>): O.Option<E> {
  return isLeft(fa) ? some(fa.left) : none()
}

export function getRight<E, A>(fa: These<E, A>): O.Option<A> {
  return isLeft(fa) ? none() : some(fa.right)
}

export function getRightOnly<E, A>(fa: These<E, A>): O.Option<A> {
  return isRight(fa) ? some(fa.right) : none()
}

export const match_ = T.match_

export const match = T.match

export function toTuple_<E, A>(fa: These<E, A>, e: E, a: A): readonly [E, A] {
  return isLeft(fa) ? [fa.left, a] : isRight(fa) ? [e, fa.right] : [fa.left, fa.right]
}

export function toTuple<E, A>(e: E, a: A): (fa: These<E, A>) => readonly [E, A] {
  return (fa) => toTuple_(fa, e, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoidal
 * -------------------------------------------------------------------------------------------------
 */

export function getMonoidal<E>(SE: P.Semigroup<E>): P.MonoidalFunctor<URI, HKT.Fix<'E', E>> {
  return HKT.instance({
    ...getSemimonoidal(SE),
    unit
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function getApply<E>(SE: P.Semigroup<E>): P.Apply<URI, HKT.Fix<'E', E>> {
  return P.Apply(getSemimonoidal(SE))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function getApplicative<E>(SE: P.Semigroup<E>): P.Applicative<URI, HKT.Fix<'E', E>> {
  return P.Applicative({
    ...getApply(SE),
    unit,
    pure: right
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * ApplicativeExcept
 * -------------------------------------------------------------------------------------------------
 */

export function getApplicativeExcept<E>(SE: P.Semigroup<E>) {
  const catchAll_: P.CatchAllFn_<URI, HKT.Fix<'E', E>> = (fa, f) => (fa._tag === 'Left' ? f(fa.left) : fa)

  return P.ApplicativeExcept({
    ...getApplicative(SE),
    catchAll_,
    fail: left
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal
 * -------------------------------------------------------------------------------------------------
 */

export function getSemimonoidal<E>(SE: P.Semigroup<E>): P.SemimonoidalFunctor<URI, HKT.Fix<'E', E>> {
  const crossWith_: P.CrossWithFn_<URI, HKT.Fix<'E', E>> = (fa, fb, f) =>
    isLeft(fa)
      ? isLeft(fb)
        ? left(SE.combine_(fa.left, fb.left))
        : isRight(fb)
        ? fa
        : left(SE.combine_(fa.left, fb.left))
      : isRight(fa)
      ? isLeft(fb)
        ? left(fb.left)
        : isRight(fb)
        ? right(f(fa.right, fb.right))
        : both(fb.left, f(fa.right, fb.right))
      : isLeft(fb)
      ? left(SE.combine_(fa.left, fb.left))
      : isRight(fb)
      ? both(fa.left, f(fa.right, fb.right))
      : both(SE.combine_(fa.left, fb.left), f(fa.right, fb.right))

  return P.SemimonoidalFunctor({
    map_,
    crossWith_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<E, A, G, B>(pab: These<E, A>, f: (e: E) => G, g: (a: A) => B): These<G, B> {
  return isLeft(pab) ? left(f(pab.left)) : isRight(pab) ? right(g(pab.right)) : both(f(pab.left), g(pab.right))
}

export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: These<E, A>) => These<G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<E, A, G>(pab: These<E, A>, f: (e: E) => G): These<G, A> {
  return isLeft(pab) ? left(f(pab.left)) : isBoth(pab) ? both(f(pab.left), pab.right) : pab
}

export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: These<E, A>) => These<G, A> {
  return (pab) => mapLeft_(pab, f)
}

export function swap<E, A>(pab: These<E, A>): These<A, E> {
  return isLeft(pab) ? right(pab.left) : isRight(pab) ? left(pab.right) : both(pab.right, pab.left)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<E, A>(EE: Eq<E>, EA: Eq<A>): Eq<These<E, A>> {
  return P.Eq((x, y) =>
    isLeft(x)
      ? isLeft(y) && EE.equals_(x.left, y.left)
      : isRight(x)
      ? isRight(y) && EA.equals_(x.right, y.right)
      : isBoth(y) && EE.equals_(x.left, y.left) && EA.equals_(x.right, y.right)
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<E, A, B>(fa: These<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right)
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: These<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: These<E, A>, f: (a: A) => M) => M {
  return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: These<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function foldr_<E, A, B>(fa: These<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: These<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: These<E, A>, f: (a: A) => B): These<E, B> {
  return isLeft(fa) ? fa : isRight(fa) ? right(f(fa.right)) : both(fa.left, f(fa.right))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: These<E, A>) => These<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function getMonad<E>(SE: P.Semigroup<E>): P.Monad<[HKT.URI<TheseURI, {}>], HKT.Fix<'E', E>> {
  const chain_: P.ChainFn_<URI, HKT.Fix<'E', E>> = (ma, f) => {
    if (isLeft(ma)) {
      return ma
    }
    if (isRight(ma)) {
      return f(ma.right)
    }
    const fb = f(ma.right)
    return isLeft(fb)
      ? left(SE.combine_(ma.left, fb.left))
      : isRight(fb)
      ? both(ma.left, fb.right)
      : both(SE.combine_(ma.left, fb.left), fb.right)
  }
  return P.Monad({
    ...getApplicative(SE),
    chain_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

export function getMonadExcept<E>(SE: P.Semigroup<E>): P.MonadExcept<URI, HKT.Fix<'E', E>> {
  return P.MonadExcept({ ...getApplicativeExcept(SE), ...getMonad(SE) })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getSemigroup<E, A>(SE: P.Semigroup<E>, SA: P.Semigroup<A>): P.Semigroup<These<E, A>> {
  return P.Semigroup((x, y) =>
    isLeft(x)
      ? isLeft(y)
        ? left(SE.combine_(x.left, y.left))
        : isRight(y)
        ? both(x.left, y.right)
        : both(SE.combine_(x.left, y.left), y.right)
      : isRight(x)
      ? isLeft(y)
        ? both(y.left, x.right)
        : isRight(y)
        ? right(SA.combine_(x.right, y.right))
        : both(y.left, SA.combine_(x.right, y.right))
      : isLeft(y)
      ? both(SE.combine_(x.left, y.left), x.right)
      : isRight(y)
      ? both(x.left, SA.combine_(x.right, y.right))
      : both(SE.combine_(x.left, y.left), SA.combine_(x.right, y.right))
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<These<E, A>> {
  return {
    show: match(
      (l) => `Left(${SE.show(l)})`,
      (r) => `Right(${SA.show(r)})`,
      (l, r) => `Both(${SE.show(l)}, ${SA.show(r)})`
    )
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapAFn_<URI, V> = (AG) => (ta, f) =>
  isLeft(ta) ? AG.pure(ta) : isRight(ta) ? AG.map_(f(ta.right), right) : AG.map_(f(ta.right), (b) => both(ta.left, b))

export const mapA: P.MapAFn<URI, V> = (AG) => {
  const mapA__ = mapA_(AG)
  return (f) => (ta) => mapA__(ta, f)
}

export const sequence: P.SequenceFn<URI, V> = (AG) => mapA(AG)(P.identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): These<never, void> {
  return right(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function condemn<E, A>(ma: These<E, A>): These<E, A> {
  return isBoth(ma) ? left(ma.left) : ma
}

export function condemnWhen_<E, A>(ma: These<E, A>, predicate: P.Predicate<E>): These<E, A> {
  if (isBoth(ma) && predicate(ma.left)) {
    return left(ma.left)
  }
  return ma
}

export function condemnWhen<E>(predicate: P.Predicate<E>): <A>(ma: These<E, A>) => These<E, A> {
  return (ma) => condemnWhen_(ma, predicate)
}

export { TheseURI } from './Modules'
