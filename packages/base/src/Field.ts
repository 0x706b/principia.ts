import type { Eq } from './Eq'
import type { RingMin } from './Ring'

import { Ring } from './Ring'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export interface Field<A> extends Ring<A> {
  readonly degree: (a: A) => number
  readonly div_: (x: A, y: A) => A
  readonly div: (y: A) => (x: A) => A
  readonly mod_: (x: A, y: A) => A
  readonly mod: (y: A) => (x: A) => A
}

export type FieldMin<A> = RingMin<A> & {
  readonly degree: (a: A) => number
  readonly div_: (x: A, y: A) => A
  readonly mod_: (x: A, y: A) => A
}

export function Field<A>(F: FieldMin<A>): Field<A> {
  return {
    ...Ring(F),
    degree: F.degree,
    div_: F.div_,
    div: (y) => (x) => F.div_(x, y),
    mod_: F.mod_,
    mod: (y) => (x) => F.mod_(x, y)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * utils
 * -------------------------------------------------------------------------------------------------
 */

export function gcd_<A>(E: Eq<A>, F: Field<A>): (x: A, y: A) => A {
  const zero = F.zero
  return (x, y) => {
    let _x = x
    let _y = y
    while (!E.equals_(_y, zero)) {
      const mod = F.mod_(_x, _y)
      _x        = _y
      _y        = mod
    }
    return _x
  }
}

export function gcd<A>(E: Eq<A>, F: Field<A>): (y: A) => (x: A) => A {
  const gcdEF_ = gcd_(E, F)
  return (y) => (x) => gcdEF_(x, y)
}

export function lcm_<A>(E: Eq<A>, F: Field<A>): (x: A, y: A) => A {
  const zero   = F.zero
  const gcdEF_ = gcd_(E, F)
  return (x, y) => (E.equals_(x, zero) || E.equals_(y, zero) ? zero : F.div_(F.mul_(x, y), gcdEF_(x, y)))
}

export function lcm<A>(E: Eq<A>, F: Field<A>): (y: A) => (x: A) => A {
  const lcmEF_ = lcm_(E, F)
  return (y) => (x) => lcmEF_(x, y)
}
