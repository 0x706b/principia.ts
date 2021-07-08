import type * as HKT from './HKT'
import type { StateURI } from './Modules'

import { identity } from './function'
import * as P from './prelude'
import { tuple } from './tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface State<S, A> {
  (s: S): [A, S]
}

export type V = HKT.V<'S', '_'>

/*
 * -------------------------------------------------------------------------------------------------
 * State
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Get the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function get<S>(): State<S, S> {
  return (s) => [s, s]
}

/**
 * Set the state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function put<S>(s: S): State<S, void> {
  return () => [undefined, s]
}

/**
 * Modify the state by applying a function to the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function modify<S>(f: (s: S) => S): State<S, void> {
  return (s) => [undefined, f(s)]
}

/**
 * Get a value which depends on the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function gets<S, A>(f: (s: S) => A): State<S, A> {
  return (s) => [f(s), s]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Run
 * -------------------------------------------------------------------------------------------------
 */

export function evaluate_<S, A>(ma: State<S, A>, s: S): A {
  return ma(s)[0]
}

export function evaluate<S>(s: S): <A>(ma: State<S, A>) => A {
  return (ma) => ma(s)[0]
}

export function execute_<S, A>(ma: State<S, A>, s: S): S {
  return ma(s)[1]
}

export function execute<S>(s: S): <A>(ma: State<S, A>) => S {
  return (ma) => ma(s)[1]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<S = never, A = never>(a: A): State<S, A> {
  return (s) => [a, s]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function cross_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<S, A, B, C>(fa: State<S, A>, fb: State<S, B>, f: (a: A, b: B) => C): State<S, C> {
  return (s) => {
    const [a, s1] = fa(s)
    const [b, s2] = fb(s1)
    return [f(a, b), s2]
  }
}

export function crossWith<S, A, B, C>(fb: State<S, B>, f: (a: A, b: B) => C): (fa: State<S, A>) => State<S, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<S, A, B>(fab: State<S, (a: A) => B>, fa: State<S, A>): State<S, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<S, A>(fa: State<S, A>): <B>(fab: State<S, (a: A) => B>) => State<S, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function crossFirst<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<S, A, B>(fa: State<S, A>, fb: State<S, B>): State<S, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function crossSecond<S, B>(fb: State<S, B>): <A>(fa: State<S, A>) => State<S, B> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<S, A, B>(fa: State<S, A>, f: (a: A) => B): State<S, B> {
  return (s) => {
    const [a, s2] = fa(s)
    return [f(a), s2]
  }
}

export function map<A, B>(f: (a: A) => B): <S>(fa: State<S, A>) => State<S, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, B> {
  return (s) => {
    const [a, s2] = ma(s)
    return f(a)(s2)
  }
}

export function chain<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, B> {
  return (ma) => chain_(ma, f)
}

export function tap_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

export function tap<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<S, A>(mma: State<S, State<S, A>>): State<S, A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit<S>(): State<S, void> {
  return (s) => [undefined, s]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor: P.Functor<[HKT.URI<StateURI>], V> = P.Functor({
  map_
})

export const SemimonoidalFunctor: P.SemimonoidalFunctor<[HKT.URI<StateURI>]> = P.SemimonoidalFunctor({
  map_,
  crossWith_,
  cross_
})

export const Apply: P.Apply<[HKT.URI<StateURI>], V> = P.Apply({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor: P.MonoidalFunctor<[HKT.URI<StateURI>], V> = P.MonoidalFunctor({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative: P.Applicative<[HKT.URI<StateURI>], V> = P.Applicative({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad: P.Monad<[HKT.URI<StateURI>], V> = P.Monad({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})
