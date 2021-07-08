import { flow, identity } from './function'
import { Monoid } from './Monoid'
import { Semigroup } from './Semigroup'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Endomorphism<A> {
  (a: A): A
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export function getSemigroup<A>(): Semigroup<Endomorphism<A>> {
  return Semigroup((x, y) => flow(x, y))
}

export function getMonoid<A>(): Monoid<Endomorphism<A>> {
  return Monoid((x, y) => flow(x, y), identity)
}
