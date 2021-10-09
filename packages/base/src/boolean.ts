import * as G from './Guard'
import * as P from './prelude'

export function match_<A, B>(value: boolean, onFalse: () => A, onTrue: () => B): A | B {
  return value ? onTrue() : onFalse()
}

/**
 * @dataFirst match_
 */
export function match<A, B>(onFalse: () => A, onTrue: () => B): (value: boolean) => A | B {
  return (value) => match_(value, onFalse, onTrue)
}

export function and_(x: boolean, y: boolean): boolean {
  return x && y
}

/**
 * @dataFirst and_
 */
export function and(y: boolean): (x: boolean) => boolean {
  return (x) => x && y
}

export function invert(b: boolean): boolean {
  return !b
}

export function or_(x: boolean, y: boolean): boolean {
  return x || y
}

/**
 * @dataFirst or_
 */
export function or(y: boolean): (x: boolean) => boolean {
  return (x) => x || y
}

export function xor_(x: boolean, y: boolean): boolean {
  return (x && !y) || (!x && y)
}

/**
 * @dataFirst xor_
 */
export function xor(y: boolean): (x: boolean) => boolean {
  return (x) => (x && !y) || (!x && y)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const BooleanAlgebra: P.BooleanAlgebra<boolean> = {
  meet: (x, y) => x && y,
  join: (x, y) => x || y,
  zero: false,
  one: true,
  implies: (x, y) => !x || y,
  not: (x) => !x
}

export const SemigroupAll: P.Semigroup<boolean> = P.Semigroup((x, y) => x && y)

export const SemigroupAny: P.Semigroup<boolean> = P.Semigroup((x, y) => x || y)

export const Eq: P.Eq<boolean> = P.Eq((x, y) => x === y)

export const Show: P.Show<boolean> = P.Show((a) => JSON.stringify(a))

export const Guard: G.Guard<unknown, boolean> = G.Guard((u): u is boolean => typeof u === 'boolean')
