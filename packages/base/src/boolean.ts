import type { Predicate } from './Predicate'

import * as G from './Guard'
import * as P from './prelude'

export function allPass_<A>(a: A, ps: ReadonlyArray<Predicate<A>>): boolean {
  return ps.every((f) => f(a))
}

export function allPass<A>(ps: ReadonlyArray<Predicate<A>>): (a: A) => boolean {
  return (a) => ps.every((f) => f(a))
}

export function and_(x: boolean, y: boolean): boolean {
  return x && y
}

export function and(y: boolean): (x: boolean) => boolean {
  return (x) => x && y
}

export function andPass_<A>(f: Predicate<A>, g: Predicate<A>): Predicate<A> {
  return (a) => and_(f(a), g(a))
}

export function andPass<A>(g: Predicate<A>): (f: Predicate<A>) => Predicate<A> {
  return (f) => andPass_(f, g)
}

export function anyPass_<A>(a: A, ps: ReadonlyArray<Predicate<A>>): boolean {
  return ps.some((f) => f(a))
}

export function anyPass<A>(ps: ReadonlyArray<Predicate<A>>): (a: A) => boolean {
  return (a) => ps.some((f) => f(a))
}

export function invert(b: boolean): boolean {
  return !b
}

export function or_(x: boolean, y: boolean): boolean {
  return x || y
}

export function or(y: boolean): (x: boolean) => boolean {
  return (x) => x || y
}

export function orPass_<A>(f: Predicate<A>, g: Predicate<A>): Predicate<A> {
  return (a) => or_(f(a), g(a))
}

export function orPass<A>(g: Predicate<A>): (f: Predicate<A>) => Predicate<A> {
  return (f) => orPass_(f, g)
}

export function xor_(x: boolean, y: boolean): boolean {
  return (x && !y) || (!x && y)
}

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
