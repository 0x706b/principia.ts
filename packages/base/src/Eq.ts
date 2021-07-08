import { memoize } from './function'

export interface Eq<A> {
  readonly equals_: EqualsFn_<A>
  readonly equals: EqualsFn<A>
}

export function Eq<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  const equals_ = (x: A, y: A) => x === y || equals(x, y)
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}

export interface EqualsFn_<A> {
  (x: A, y: A): boolean
}

export interface EqualsFn<A> {
  (y: A): (x: A) => boolean
}

export type TypeOf<E> = E extends Eq<infer A> ? A : never

/**
 * An alias of `Eq` for easy imports
 */
export const makeEq = Eq

/*
 * -------------------------------------------------------------------------------------------------
 * Primitives
 * -------------------------------------------------------------------------------------------------
 */

export const any: Eq<any> = Eq(() => true)

export const never: Eq<never> = Eq(() => false)

export const strict: Eq<unknown> = Eq((x, y) => x === y)

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function nullable<A>(E: Eq<A>): Eq<null | A> {
  return Eq((x, y) => (x == null || y == null ? x === y : E.equals_(x, y)))
}

export function lazy<A>(f: () => Eq<A>): Eq<A> {
  const get = memoize<void, Eq<A>>(f)
  return Eq((x, y) => get().equals_(x, y))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Contravariant
 * -------------------------------------------------------------------------------------------------
 */

export function contramap_<A, B>(fa: Eq<A>, f: (b: B) => A): Eq<B> {
  return Eq((x, y) => fa.equals_(f(x), f(y)))
}

export function contramap<A, B>(f: (b: B) => A): (fa: Eq<A>) => Eq<B> {
  return (fa) => contramap_(fa, f)
}

export { EqURI } from './Modules'
