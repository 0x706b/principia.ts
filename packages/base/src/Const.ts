import type { Eq } from './Eq'
import type * as HKT from './HKT'
import type { ConstURI } from './Modules'
import type { Ord } from './Ord'

import { identity, unsafeCoerce } from './function'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type Const<E, A> = E & { readonly _A: A }

type URI = [HKT.URI<ConstURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @optimize identity
 */
export function make<E, A = never>(e: E): Const<E, A> {
  return unsafeCoerce(e)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplicative<E>(M: P.Monoid<E>): P.Applicative<URI, HKT.Fix<'E', E>> {
  return P.Applicative({
    ...getApply(M),
    unit: () => make(undefined),
    pure: <A>() => make<E, A>(M.nat)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApply<E>(S: P.Semigroup<E>): P.Apply<URI, HKT.Fix<'E', E>> {
  type CE = HKT.Fix<'E', E>
  const ap_: P.Apply<URI, CE>['ap_'] = (fab, fa) => make(S.combine_(fab, fa))
  return P.Apply({
    map_,
    ap_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<E, A, D, B>(pab: Const<E, A>, f: (e: E) => D, _: (a: A) => B): Const<D, B> {
  return make(f(pab))
}

export function bimap<E, A, D, B>(f: (e: E) => D, g: (a: A) => B): (pab: Const<E, A>) => Const<D, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<E, A, D>(pab: Const<E, A>, f: (e: E) => D): Const<D, A> {
  return make(f(pab))
}

export function mapLeft<E, D>(f: (e: E) => D): <A>(pab: Const<E, A>) => Const<D, A> {
  return (pab) => make(f(pab))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bounded
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getBounded<E, A>(B: P.Bounded<E>): P.Bounded<Const<E, A>> {
  return identity(B) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<E, A, B>(fa: Const<E, A>, _: (b: B) => A): Const<E, B> {
  return unsafeCoerce(fa)
}

export function contramap<A, B>(_: (b: B) => A): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Eq
 * @since 1.0.0
 */
export function getEq<E, A>(E: Eq<E>): Eq<Const<E, A>> {
  return identity(E)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: Const<E, A>, _: (a: A) => B): Const<E, B> {
  return unsafeCoerce(fa)
}

export function map<A, B>(_: (a: A) => B): <E>(fa: Const<E, A>) => Const<E, B> {
  return unsafeCoerce
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Monoid
 * @since 1.0.0
 */
export function getMonoid<E, A>(M: P.Monoid<E>): P.Monoid<Const<E, A>> {
  return identity(M) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoidal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMonoidalFunctor<E>(M: P.Monoid<E>): P.MonoidalFunctor<URI, HKT.Fix<'E', E>> {
  return P.MonoidalFunctor({
    ...getSemimonoidalFunctor(M),
    unit: () => make(M.nat)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Ord
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getOrd<E, A>(O: Ord<E>): Ord<Const<E, A>> {
  return identity(O) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Ring
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Ring
 * @since 1.0.0
 */
export function getRing<E, A>(S: P.Ring<E>): P.Ring<Const<E, A>> {
  return identity(S) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Semigroup
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<E>): P.Semigroup<Const<E, A>> {
  return identity(S) as any
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getSemimonoidalFunctor<E>(S: P.Semigroup<E>): P.SemimonoidalFunctor<URI, HKT.Fix<'E', E>> {
  type CE = HKT.Fix<'E', E>
  const crossWith_: P.SemimonoidalFunctor<URI, CE>['crossWith_'] = (fa, fb, _) => make(S.combine_(fa, fb))
  return P.SemimonoidalFunctor({
    map_,
    crossWith_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export function getShow<E, A>(S: P.Show<E>): P.Show<Const<E, A>> {
  return {
    show: (c) => `Const(${S.show(c)})`
  }
}

export { ConstURI } from './Modules'
