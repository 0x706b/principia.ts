import type * as HKT from './HKT'

import * as E from './Either'
import * as P from './prelude'
import { tuple } from './tuple/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Function0<A> {
  (): A
}

export interface Function0F extends HKT.HKT {
  readonly type: Function0<this['A']>
  readonly variance: {
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Function0<A>, f: (a: A) => B): Function0<B> {
  return () => f(fa())
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Function0<A>) => Function0<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Function0<A>, f: (a: A) => Function0<B>): Function0<B> {
  return f(ma())
}

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Function0<B>): (ma: Function0<A>) => Function0<B> {
  return (fa) => chain_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal Functor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<A, B, C>(fa: Function0<A>, fb: Function0<B>, f: (a: A, b: B) => C): Function0<C> {
  return () => f(fa(), fb())
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Function0<B>, f: (a: A, b: B) => C): (fa: Function0<A>) => Function0<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: Function0<A>, fb: Function0<B>): Function0<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
export function cross<B>(fb: Function0<B>): <A>(fa: Function0<A>) => Function0<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossFirst_<A, B>(fa: Function0<A>, fb: Function0<B>): Function0<A> {
  return () => {
    const a = fa()
    fb()
    return a
  }
}

/**
 * @dataFirst crossFirst_
 */
export function crossFirst<B>(fb: Function0<B>): <A>(fa: Function0<A>) => Function0<A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<A, B>(fa: Function0<A>, fb: Function0<B>): Function0<B> {
  return () => {
    fa()
    return fb()
  }
}

/**
 * @dataFirst crossSecond_
 */
export function crossSecond<B>(fb: Function0<B>): <A>(fa: Function0<A>) => Function0<B> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoidal Functor
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Function0<void> {
  return () => undefined
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<A, B>(fab: Function0<(a: A) => B>, fa: Function0<A>): Function0<B> {
  return () => fab()(fa())
}

/**
 * @dataFirst ap_
 */
export function ap<A>(fa: Function0<A>): <B>(fab: Function0<(a: A) => B>) => Function0<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Function0<A> {
  return () => a
}

/*
 * -------------------------------------------------------------------------------------------------
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRec_<A, B>(a: A, f: (a: A) => Function0<E.Either<A, B>>): Function0<B> {
  return () => {
    let v = f(a)()
    while (E.isLeft(v)) {
      v = f(v.left)()
    }
    return v.right
  }
}

export function chainRec<A, B>(f: (a: A) => Function0<E.Either<A, B>>): (a: A) => Function0<B> {
  return (a) => chainRec_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Typeclasses
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<Function0F>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<Function0F>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<Function0F>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<Function0F>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<Function0F>({
  map_,
  crossWith_,
  cross_,
  unit,
  ap_,
  pure
})
