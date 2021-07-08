import type * as HKT from './HKT'
import type { ReaderURI } from './Modules'

import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Reader<R, A> {
  (r: R): A
}

export type V = HKT.V<'R', '-'>

type URI = [HKT.URI<ReaderURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function ask<R>(): Reader<R, R> {
  return P.identity
}

export function asks<R, A>(f: (r: R) => A): Reader<R, A> {
  return f
}

export function asksM<R, R1, A>(f: (r: R) => Reader<R1, A>): Reader<R & R1, A> {
  return (r) => f(r)(r)
}

export function gives_<Q, R, A>(ra: Reader<R, A>, f: (q: Q) => R): Reader<Q, A> {
  return (q) => ra(f(q))
}

export function gives<Q, R>(f: (q: Q) => R): <A>(ra: Reader<R, A>) => Reader<Q, A> {
  return (ra) => gives_(ra, f)
}

export function giveAll_<R, A>(ra: Reader<R, A>, r: R): Reader<unknown, A> {
  return () => ra(r)
}

export function giveAll<R>(r: R): <A>(ra: Reader<R, A>) => Reader<unknown, A> {
  return (ra) => giveAll_(ra, r)
}

export function runReader_<A>(ra: Reader<unknown, A>): A
export function runReader_<R, A>(ra: Reader<R, A>, r: R): A
export function runReader_<R, A>(ra: Reader<R, A>, r?: R): A {
  return r ? ra(r) : ra(undefined as any)
}

export function runReader(): <A>(ra: Reader<unknown, A>) => A
export function runReader<R>(r: R): <A>(ra: Reader<R, A>) => A
export function runReader<R>(r?: R): <A>(ra: Reader<R, A>) => A {
  return (ra) => (r ? ra(r) : ra(undefined as any))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Reader<unknown, A> {
  return () => a
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<R, A, R1, B>(fab: Reader<R1, (a: A) => B>, fa: Reader<R, A>): Reader<R & R1, B> {
  return (r) => fab(r)(fa(r))
}

export function ap<R, A>(fa: Reader<R, A>): <R1, B>(fab: Reader<R1, (a: A) => B>) => Reader<R & R1, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, B> {
  return (fa) => crossSecond_(fa, fb)
}

export function cross_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

export function cross<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<R, A, R1, B, C>(
  fa: Reader<R, A>,
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): Reader<R & R1, C> {
  return (r) => f(fa(r), fb(r))
}

export function crossWith<A, R1, B, C>(
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): <R>(fa: Reader<R, A>) => Reader<R & R1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/* -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function compose_<R, A, B>(fa: Reader<R, A>, fb: Reader<A, B>): Reader<R, B> {
  return P.flow(fa, fb)
}

export function compose<A, B>(fb: Reader<A, B>): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => compose_(fa, fb)
}

export function id<R>(): Reader<R, R> {
  return P.identity
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, A, B>(fa: Reader<R, A>, f: (a: A) => B): Reader<R, B> {
  return P.flow(fa, f)
}

export function map<A, B>(f: (a: A) => B): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<R, A, R1, B>(ma: Reader<R, A>, f: (a: A) => Reader<R1, B>): Reader<R & R1, B> {
  return (r) => f(ma(r))(r)
}

export function chain<A, R1, B>(f: (a: A) => Reader<R1, B>): <R>(ma: Reader<R, A>) => Reader<R & R1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<R, R1, A>(mma: Reader<R, Reader<R1, A>>): Reader<R & R1, A> {
  return (r) => mma(r)(r)
}

export function tap_<R, A, R1, B>(ma: Reader<R, A>, f: (a: A) => Reader<R1, B>): Reader<R & R1, A> {
  return (r) => {
    const a = ma(r)
    f(a)(r)
    return a
  }
}

export function tap<A, R1, B>(f: (a: A) => Reader<R1, B>): <R>(ma: Reader<R, A>) => Reader<R & R1, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function dimap_<R, A, Q, B>(pa: Reader<R, A>, f: (q: Q) => R, g: (a: A) => B): Reader<Q, B> {
  return P.flow(f, pa, g)
}

export function dimap<R, A, Q, B>(f: (q: Q) => R, g: (a: A) => B): (pa: Reader<R, A>) => Reader<Q, B> {
  return (pa) => dimap_(pa, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Reader<unknown, void> {
  return () => undefined
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI, V>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  cross_,
  crossWith_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  cross_,
  crossWith_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadEnv = P.MonadEnv<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure,
  unit,
  chain_,
  flatten,
  asks,
  giveAll_
})

export const Profunctor = P.Profunctor<URI, V>({
  map_,
  dimap_,
  lmap_: gives_
})

export { ReaderURI } from './Modules'
