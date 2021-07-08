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
  (i: I, a: A): boolean
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant Functor
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<A, B>(fa: Predicate<A>, f: (b: B) => A): Predicate<B> {
  return (b) => fa(f(b))
}

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

export function or<A>(second: Predicate<A>): (first: Predicate<A>) => Predicate<A> {
  return (first) => or_(first, second)
}

export function and_<A>(first: Predicate<A>, second: Predicate<A>): Predicate<A> {
  return (a) => first(a) && second(a)
}

export function and<A>(second: Predicate<A>): (first: Predicate<A>) => Predicate<A> {
  return (first) => and_(first, second)
}
