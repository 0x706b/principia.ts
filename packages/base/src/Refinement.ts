import type * as O from './internal/Option'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface Refinement<A, B extends A> {
  (a: A): a is B
}

export interface RefinementWithIndex<I, A, B extends A> {
  (i: I, a: A): a is B
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function fromOptionK<A, B extends A>(pf: (a: A) => O.Option<B>): Refinement<A, B> {
  return (a): a is B => pf(a)._tag === 'Some'
}

/*
 * -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function compose_<A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C> {
  return (i): i is C => ab(i) && bc(i)
}

export function compose<A, B extends A, C extends B>(bc: Refinement<B, C>): (ab: Refinement<A, B>) => Refinement<A, C> {
  return (ab) => compose_(ab, bc)
}

export function id<A>(): Refinement<A, A> {
  return (_): _ is A => true
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function not<A, B extends A>(refinement: Refinement<A, B>): Refinement<A, Exclude<A, B>> {
  return (a): a is Exclude<A, B> => !refinement(a)
}

export function or_<A, B extends A, C extends A>(
  first: Refinement<A, B>,
  second: Refinement<A, C>
): Refinement<A, B | C> {
  return (a): a is B | C => first(a) || second(a)
}

export function or<A, C extends A>(
  second: Refinement<A, C>
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B | C> {
  return (first) => or_(first, second)
}

export function and_<A, B extends A, C extends A>(
  first: Refinement<A, B>,
  second: Refinement<A, C>
): Refinement<A, B & C> {
  return (a): a is B & C => first(a) && second(a)
}

export function and<A, C extends A>(
  second: Refinement<A, C>
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B & C> {
  return (first) => and_(first, second)
}

export function zero<A, B extends A>(): Refinement<A, B> {
  return (_): _ is B => false
}
