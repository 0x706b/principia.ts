import * as A from './Array/core'
import { constFalse, constTrue } from './function'
import { Monoid } from './Monoid'
import { Semigroup } from './Semigroup'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */
export interface Predicate<A> {
  (a: A): boolean
}

export interface PredicateWithIndex<I, A> {
  (a: A, i: I): boolean
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant Functor
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<A, B>(fa: Predicate<A>, f: (b: B) => A): Predicate<B> {
  return (b) => fa(f(b))
}

/**
 * @dataFirst contramap_
 */
export function contramap<A, B>(f: (b: B) => A): (fa: Predicate<A>) => Predicate<B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export function getSemigroupAny<A = never>(): Semigroup<Predicate<A>> {
  return Semigroup(or_)
}

export function getMonoidAny<A = never>(): Monoid<Predicate<A>> {
  return Monoid<Predicate<A>>(or_, constFalse)
}

export function getSemigroupAll<A = never>(): Semigroup<Predicate<A>> {
  return Semigroup(and_)
}

export function getMonoidAll<A = never>(): Monoid<Predicate<A>> {
  return Monoid<Predicate<A>>(and_, constTrue)
}

/*
 * -------------------------------------------------------------------------------------------------
 * utils
 * -------------------------------------------------------------------------------------------------
 */

export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a)
}

export function or_<A>(first: Predicate<A>, second: Predicate<A>): Predicate<A> {
  return (a) => first(a) || second(a)
}

/**
 * @dataFirst or_
 */
export function or<A>(second: Predicate<A>): (first: Predicate<A>) => Predicate<A> {
  return (first) => or_(first, second)
}

export function and_<A>(first: Predicate<A>, second: Predicate<A>): Predicate<A> {
  return (a) => first(a) && second(a)
}

/**
 * @dataFirst and_
 */
export function and<A>(second: Predicate<A>): (first: Predicate<A>) => Predicate<A> {
  return (first) => and_(first, second)
}

export function all<A>(ps: ReadonlyArray<Predicate<A>>): Predicate<A> {
  return A.fold(getMonoidAll<A>())(ps)
}

export function any<A>(ps: ReadonlyArray<Predicate<A>>): Predicate<A> {
  return A.fold(getMonoidAny<A>())(ps)
}
