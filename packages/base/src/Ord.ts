import type { Endomorphism } from './Endomorphism'
import type { Eq, EqualsFn_ } from './Eq'
import type { Monoid } from './Monoid'
import type { Ordering } from './Ordering'
import type { Predicate } from './Predicate'

import { flow } from './function'
import * as O from './internal/Ord'
import { EQ, GT, LT } from './Ordering'
import { Semigroup } from './Semigroup'

export interface Ord<A> extends Eq<A> {
  readonly compare_: CompareFn_<A>
  readonly compare: CompareFn<A>
}

export interface CompareFn<A> {
  (y: A): (x: A) => Ordering
}

export interface CompareFn_<A> {
  (x: A, y: A): Ordering
}

export type OrdMin<A> = {
  compare_: CompareFn_<A>
  equals_: EqualsFn_<A>
}

export function Ord<A>(_: OrdMin<A>): Ord<A> {
  return {
    compare_: _.compare_,
    compare: (y) => (x) => _.compare_(x, y),
    equals_: _.equals_,
    equals: (y) => (x) => _.equals_(x, y)
  }
}

export type TypeOf<O> = O extends Ord<infer A> ? A : never

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return Ord({
    compare_: (x, y) => fa.compare_(f(x), f(y)),
    equals_: (x, y) => fa.equals_(f(x), f(y))
  })
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

export function lt<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): boolean =>
      O.compare_(x, y) === LT
}

export function gt<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): boolean =>
      O.compare_(x, y) === GT
}

export function leq<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): boolean =>
      O.compare_(x, y) !== GT
}

export function geq<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): boolean =>
      O.compare_(x, y) !== LT
}

export const min_ = O.min_

export const max_ = O.max_

export function min<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): A =>
      O.compare_(x, y) === GT ? y : x
}

export function max<A>(O: Ord<A>) {
  return (y: A) =>
    (x: A): A =>
      O.compare_(x, y) === LT ? y : x
}

export function lt_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === LT
}

export function gt_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) === GT
}

export function leq_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== GT
}

export function geq_<A>(O: Ord<A>) {
  return (x: A, y: A): boolean => O.compare_(x, y) !== LT
}

export function clamp<A>(O: Ord<A>): (low: A, hi: A) => Endomorphism<A> {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => flow(minO(hi), maxO(low))
}

export function between<A>(O: Ord<A>): (low: A, hi: A) => Predicate<A> {
  const ltO = lt_(O)
  const gtO = gt_(O)
  return (low, hi) => (a) => ltO(a, low) || gtO(a, hi) ? false : true
}

export function reverse<A>(O: Ord<A>): Ord<A> {
  return Ord({
    compare_: (x, y) => O.compare_(y, x),
    equals_: O.equals_
  })
}

export const getSemigroup = <A = never>(): Semigroup<Ord<A>> => {
  return Semigroup((x, y) =>
    Ord({
      compare_: (a1, a2) => {
        const ox = x.compare_(a1, a2)
        return ox !== 0 ? ox : y.compare_(a1, a2)
      },
      equals_: (a1, a2) => x.equals_(a1, a2) && y.equals_(a1, a2)
    })
  )
}

export const getMonoid = <A = never>(): Monoid<Ord<A>> => ({
  ...getSemigroup<A>(),
  nat: Ord({ compare_: () => EQ, equals_: () => true })
})
