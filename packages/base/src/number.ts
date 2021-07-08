import type * as G from './Guard'

import * as E from './Eq'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * refinements
 * -------------------------------------------------------------------------------------------------
 */

export function isNumber(u: unknown): u is number {
  return typeof u === 'number'
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category instances
 */
export const Eq: P.Eq<number> = E.strict

/**
 * @category instances
 */
export const Ord: P.Ord<number> = P.Ord({
  compare_: (x, y) => (x < y ? -1 : x > y ? 1 : 0),
  equals_: (x, y) => x === y
})

/**
 * @category instances
 */
export const Bounded: P.Bounded<number> = {
  ...Ord,
  top: Infinity,
  bottom: -Infinity
}

/**
 * @category instances
 */
export const Show: P.Show<number> = P.Show((x) => JSON.stringify(x))

/**
 * @category instances
 */
export const SemigroupSum: P.Semigroup<number> = P.Semigroup((x, y) => x + y)

/**
 * @category instances
 */
export const SemigroupProduct: P.Semigroup<number> = P.Semigroup((x, y) => x * y)

/**
 * @category instances
 */
export const MonoidSum: P.Monoid<number> = {
  ...SemigroupSum,
  nat: 0
}

/**
 * @category instances
 */
export const MonoidProduct: P.Monoid<number> = {
  ...SemigroupProduct,
  nat: 1
}

/**
 * @category instances
 */
export const Guard: G.Guard<unknown, number> = {
  is: isNumber
}

/**
 * @category instances
 */
export const Field: P.Field<number> = P.Field({
  zero: 0,
  one: 1,
  degree: (_) => 1,
  add_: (x, y) => x + y,
  mul_: (x, y) => x * y,
  sub_: (x, y) => x - y,
  div_: (x, y) => x / y,
  mod_: (x, y) => x % y
})
