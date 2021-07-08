import type * as HKT from './HKT'
import type { Tuple2URI } from './Modules'

import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Tuple2<A, B> extends Readonly<[A, B]> {}

export type V = HKT.V<'I', '+'>

type URI = [HKT.URI<Tuple2URI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function tuple_<A, I>(a: A, i: I): Tuple2<A, I> {
  return [a, i]
}

export function tuple<I>(i: I): <A>(a: A) => Tuple2<A, I> {
  return (a) => [a, i]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

export function fst<A, I>(ai: Tuple2<A, I>): A {
  return ai[0]
}

export function snd<A, I>(ai: Tuple2<A, I>): I {
  return ai[1]
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function getSemimonoidalFunctor<M>(S: P.Semigroup<M>): P.SemimonoidalFunctor<URI, HKT.Fix<'I', M>> {
  const crossWith_: P.CrossWithFn_<URI, HKT.Fix<'I', M>> = (fa, fb, f) => [
    f(fst(fa), fst(fb)),
    S.combine_(snd(fa), snd(fb))
  ]

  return P.SemimonoidalFunctor({
    map_,
    crossWith_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function getApply<M>(S: P.Semigroup<M>): P.Apply<URI, HKT.Fix<'I', M>> {
  const ap_: P.ApFn_<URI, HKT.Fix<'I', M>> = (fab, fa) => [fst(fab)(fst(fa)), S.combine_(snd(fab), snd(fa))]

  return P.Apply({
    ...getSemimonoidalFunctor(S),
    ap_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function getMonoidalFunctor<M>(M: P.Monoid<M>): P.MonoidalFunctor<URI, HKT.Fix<'I', M>> {
  return P.MonoidalFunctor({
    ...getSemimonoidalFunctor(M),
    unit: () => tuple_(undefined, M.nat)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function getApplicative<M>(M: P.Monoid<M>): P.Applicative<URI, HKT.Fix<'I', M>> {
  return P.Applicative({
    ...getApply(M),
    unit: () => tuple_(undefined, M.nat),
    pure: (a) => tuple_(a, M.nat)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<A, I, G, B>(pab: Tuple2<A, I>, f: (i: I) => G, g: (a: A) => B): Tuple2<B, G> {
  return [g(fst(pab)), f(snd(pab))]
}

export function bimap<I, G, A, B>(f: (i: I) => G, g: (a: A) => B): (pab: Tuple2<A, I>) => Tuple2<B, G> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<A, I, G>(pab: Tuple2<A, I>, f: (i: I) => G): Tuple2<A, G> {
  return [fst(pab), f(snd(pab))]
}

export function mapLeft<I, G>(f: (i: I) => G): <A>(pab: Tuple2<A, I>) => Tuple2<A, G> {
  return (pab) => mapLeft_(pab, f)
}

export function swap<A, I>(ai: Tuple2<A, I>): Tuple2<I, A> {
  return [snd(ai), fst(ai)]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<A, I, B>(wa: Tuple2<A, I>, f: (wa: Tuple2<A, I>) => B): Tuple2<B, I> {
  return [f(wa), snd(wa)]
}

export function extend<A, I, B>(f: (wa: Tuple2<A, I>) => B): (wa: Tuple2<A, I>) => Tuple2<B, I> {
  return (wa) => extend_(wa, f)
}

export const extract: <A, I>(wa: Tuple2<A, I>) => A = fst

export const duplicate: <A, I>(wa: Tuple2<A, I>) => Tuple2<Tuple2<A, I>, I> = extend(P.identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, I, B>(fa: Tuple2<A, I>, b: B, f: (b: B, a: A) => B): B {
  return f(b, fst(fa))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <I>(fa: Tuple2<A, I>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(_M: P.Monoid<M>): <A, I>(fa: Tuple2<A, I>, f: (a: A) => M) => M {
  return (fa, f) => f(fst(fa))
}

export function foldMap<M>(_M: P.Monoid<M>): <A>(f: (a: A) => M) => <I>(fa: Tuple2<A, I>) => M {
  return (f) => (fa) => foldMap_(_M)(fa, f)
}

export function foldr_<A, I, B>(fa: Tuple2<A, I>, b: B, f: (a: A, b: B) => B): B {
  return f(fst(fa), b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <I>(fa: Tuple2<A, I>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, I, B>(fa: Tuple2<A, I>, f: (a: A) => B): Tuple2<B, I> {
  return [f(fst(fa)), snd(fa)]
}

export function map<A, B>(f: (a: A) => B): <I>(fa: Tuple2<A, I>) => Tuple2<B, I> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function getMonad<M>(M: P.Monoid<M>): P.Monad<URI, HKT.Fix<'I', M>> {
  const chain_: P.ChainFn_<URI, HKT.Fix<'I', M>> = (ma, f) => {
    const mb = f(fst(ma))
    return [fst(mb), M.combine_(snd(ma), snd(mb))]
  }

  return P.Monad({
    ...getApplicative(M),
    chain_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroupoid
 * -------------------------------------------------------------------------------------------------
 */

export function compose_<B, A, C>(ab: Tuple2<B, A>, bc: Tuple2<C, B>): Tuple2<C, A> {
  return [fst(bc), snd(ab)]
}

export function compose<C, B>(bc: Tuple2<C, B>): <A>(ab: Tuple2<B, A>) => Tuple2<C, A> {
  return (ab) => compose_(ab, bc)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapAFn_<URI, V> = (AG) => (ta, f) => AG.map_(f(fst(ta)), (b) => [b, snd(ta)])

export const mapA: P.MapAFn<URI, V> = (A) => {
  const mapA__ = mapA_(A)
  return (f) => (ta) => mapA__(ta, f)
}

export const sequence: P.SequenceFn<URI, V> = (AG) => (ta) => AG.map_(fst(ta), (a) => [a, snd(ta)])

export { Tuple2URI } from './Modules'
