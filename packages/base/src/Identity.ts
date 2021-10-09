import type * as HKT from './HKT'
import type { IdentityURI } from './Modules'

import { identity, pipe } from './function'
import * as P from './prelude'
import { tuple } from './tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type Identity<A> = A

type URI = [HKT.URI<IdentityURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @optimize identity
 */
export const alt_: <A>(fa: A, that: () => A) => A = identity

/**
 * @dataFirst alt_
 */
export function alt<A>(that: () => A): (fa: A) => A {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @optimize identity
 */
export function pure<A>(a: A): A {
  return a
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export const cross_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple

/**
 * @dataFirst cross_
 */
export function cross<B>(fb: B): <A>(fa: A) => readonly [A, B] {
  return (fa) => cross_(fa, fb)
}

export function ap_<A, B>(fab: (a: A) => B, fa: A): B {
  return fab(fa)
}

/**
 * @dataFirst ap_
 */
export function ap<A>(fa: A): <B>(fab: (a: A) => B) => B {
  return (fab) => fab(fa)
}

export function crossFirst_<A, B>(fa: A, fb: B): A {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * @dataFirst crossFirst_
 */
export function crossFirst<B>(fb: B): <A>(fa: A) => A {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<A, B>(fa: A, fb: B): B {
  return ap_(
    map_(fa, (_) => (b: B) => b),
    fb
  )
}

/**
 * @dataFirst crossSecond_
 */
export function crossSecond<B>(fb: B): <A>(fa: A) => B {
  return (fa) => crossSecond_(fa, fb)
}

export function crossWith_<A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C {
  return f(fa, fb)
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: B, f: (a: A, b: B) => C): (fa: A) => C {
  return (fa) => f(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<A, B>(wa: A, f: (wa: A) => B): B {
  return f(wa)
}

/**
 * @dataFirst extend_
 */
export function extend<A, B>(f: (wa: A) => B): (wa: A) => B {
  return (wa) => f(wa)
}

/**
 * @optimize identity
 */
export const extract: <A>(wa: A) => A = identity

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: A, b: B, f: (b: B, a: A) => B): B {
  return f(b, fa)
}

/**
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: A) => B {
  return (fa) => f(b, fa)
}

export function foldMap_<M>(_: P.Monoid<M>): <A>(fa: A, f: (a: A) => M) => M {
  return (fa, f) => f(fa)
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(_: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: A) => M {
  return (f) => (fa) => f(fa)
}

export function foldr_<A, B>(fa: A, b: B, f: (a: A, b: B) => B): B {
  return f(fa, b)
}

/**
 * @dataFirst foldr_
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: A) => B {
  return (fa) => f(fa, b)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: A, f: (a: A) => B) {
  return f(fa)
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: A) => B {
  return (fa) => f(fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: A, f: (a: A) => B): B {
  return f(ma)
}

/**
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => B): (ma: A) => B {
  return (ma) => f(ma)
}

export function tap_<A, B>(ma: A, f: (a: A) => B): A {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * @dataFirst tap_
 */
export function tap<A, B>(f: (a: A) => B): (ma: A) => A {
  return (ma) => tap_(ma, f)
}

export function flatten<A>(mma: A): A {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapAFn_<URI> = (_) => (ta, f) => f(ta)

/**
 * @dataFirst mapA_
 */
export const mapA: P.MapAFn<URI> = (AG) => (f) => (ta) => mapA_(AG)(ta, f)

export const sequence: P.SequenceFn<URI> = (_) => (ta) => ta

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): void {
  return undefined
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI>({
  map_
})

export const Semimonoidal = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const Monoidal = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  pure,
  unit
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  pure,
  unit,
  chain_,
  flatten
})

export const Do = P.Do(Monad)

export const chainS_ = P.chainSF_(Monad)
/**
 * @dataFirst chainS_
 */
export const chainS = P.chainSF(Monad)
export const pureS_ = P.pureSF_(Monad)
/**
 * @dataFirst pureS_
 */
export const pureS = P.pureSF(Monad)
export const toS_  = P.toSF_(Monad)
/**
 * @dataFirst toS_
 */
export const toS = P.toSF(Monad)

export { IdentityURI } from './Modules'
