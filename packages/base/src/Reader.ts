import type * as HKT from './HKT'

import { flow, identity } from './function'
import * as P from './prelude'
import { tuple } from './tuple/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Reader<R, A> {
  (r: R): A
}

export interface ReaderF extends HKT.HKT {
  readonly type: Reader<this['R'], this['A']>
  readonly variance: {
    R: '-'
    A: '+'
  }
}

export interface ReaderCategoryF extends HKT.HKT {
  readonly type: Reader<this['I'], this['A']>
  readonly variance: {
    I: '-'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function ask<R>(): Reader<R, R> {
  return identity
}

export function asks<R, A>(f: (r: R) => A): Reader<R, A> {
  return f
}

export function asksReader<R, R1, A>(f: (r: R) => Reader<R1, A>): Reader<R & R1, A> {
  return (r) => f(r)(r)
}

export function gives_<Q, R, A>(ra: Reader<R, A>, f: (q: Q) => R): Reader<Q, A> {
  return (q) => ra(f(q))
}

/**
 * @dataFirst gives_
 */
export function gives<Q, R>(f: (q: Q) => R): <A>(ra: Reader<R, A>) => Reader<Q, A> {
  return (ra) => gives_(ra, f)
}

export function give_<R, A>(ra: Reader<R, A>, r: R): Reader<unknown, A> {
  return () => ra(r)
}

/**
 * @dataFirst give_
 */
export function give<R>(r: R): <A>(ra: Reader<R, A>) => Reader<unknown, A> {
  return (ra) => give_(ra, r)
}

export function runReader_<A>(ra: Reader<unknown, A>): A
export function runReader_<R, A>(ra: Reader<R, A>, r: R): A
export function runReader_<R, A>(ra: Reader<R, A>, r?: R): A {
  return r ? ra(r) : ra(undefined as any)
}

/**
 * @dataFirst runReader_
 */
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

/**
 * @dataFirst ap_
 */
export function ap<R, A>(fa: Reader<R, A>): <R1, B>(fab: Reader<R1, (a: A) => B>) => Reader<R & R1, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst apFirst_
 */
export function apFirst<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst apSecond_
 */
export function apSecond<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, B> {
  return (fa) => apSecond_(fa, fb)
}

export function cross_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
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

/**
 * @dataFirst crossWith_
 */
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

export function compose_<A, B, C>(ab: Reader<A, B>, bc: Reader<B, C>): Reader<A, C> {
  return flow(ab, bc)
}

/**
 * @dataFirst compose_
 */
export function compose<B, C>(bc: Reader<B, C>): <A>(ab: Reader<A, B>) => Reader<A, C> {
  return (ab) => compose_(ab, bc)
}

export function id<R>(): Reader<R, R> {
  return identity
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, A, B>(fa: Reader<R, A>, f: (a: A) => B): Reader<R, B> {
  return flow(fa, f)
}

/**
 * @dataFirst map_
 */
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

/**
 * @dataFirst chain_
 */
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

/**
 * @dataFirst tap_
 */
export function tap<A, R1, B>(f: (a: A) => Reader<R1, B>): <R>(ma: Reader<R, A>) => Reader<R & R1, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function dimap_<R, A, Q, B>(pa: Reader<R, A>, f: (q: Q) => R, g: (a: A) => B): Reader<Q, B> {
  return flow(f, pa, g)
}

/**
 * @dataFirst dimap_
 */
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

export const Functor = P.Functor<ReaderF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<ReaderF>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<ReaderF>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<ReaderF>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<ReaderF>({
  map_,
  cross_,
  crossWith_,
  unit,
  pure
})

export const Monad = P.Monad<ReaderF>({
  map_,
  cross_,
  crossWith_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadEnv = P.MonadEnv<ReaderF>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure,
  unit,
  chain_,
  flatten,
  asks,
  give_
})

export const Profunctor = P.Profunctor<ReaderF>({
  map_,
  dimap_,
  lmap_: gives_
})

export const Category = P.Category<ReaderCategoryF>({
  compose_,
  id
})
