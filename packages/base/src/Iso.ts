import type { GetFn } from './Getter'
import type { PLens } from './Lens'
import type * as NT from './Newtype'
import type { PPrism, ReverseGetFn } from './Prism'

import { flow, identity } from './function'
import * as HKT from './HKT'
import * as Is from './internal/Iso'
import * as L from './internal/Lens'
import * as P from './prelude'

/*
 * -------------------------------------------
 * Iso Model
 * -------------------------------------------
 */

export interface PIso<S, T, A, B> extends PLens<S, T, A, B>, PPrism<S, T, A, B> {
  readonly reverse: () => PIso<B, A, T, S>
}

export interface PIsoMin<S, T, A, B> {
  readonly get: GetFn<S, A>
  readonly reverseGet: ReverseGetFn<T, B>
}

export const PIso: <S, T, A, B>(_: PIsoMin<S, T, A, B>) => PIso<S, T, A, B> = Is.makePIso

export interface Iso<S, A> extends PIso<S, S, A, A> {}

export const Iso: <S, A>(_: PIsoMin<S, S, A, A>) => Iso<S, A> = Is.makePIso

export interface IsoF extends HKT.HKT {
  readonly type: Iso<this['I'], this['A']>
  readonly variance: {
    I: '_'
    A: '+'
  }
}

export function andThenLens_<S, T, A, B, C, D>(sa: PIso<S, T, A, B>, ab: PLens<A, B, C, D>): PLens<S, T, C, D> {
  return L.andThen_(sa, ab)
}

export function andThenLens<A, B, C, D>(ab: PLens<A, B, C, D>): <S, T>(sa: PIso<S, T, A, B>) => PLens<S, T, C, D> {
  return (sa) => andThenLens_(sa, ab)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function andThen_<S, T, A, B, C, D>(sa: PIso<S, T, A, B>, ab: PIso<A, B, C, D>): PIso<S, T, C, D> {
  return PIso({
    get: flow(sa.get, ab.get),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  })
}

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function andThen<A, B, C, D>(ab: PIso<A, B, C, D>): <S, T>(sa: PIso<S, T, A, B>) => PIso<S, T, C, D> {
  return (sa) => andThen_(sa, ab)
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S, T>(): PIso<S, T, S, T> {
  return PIso({
    get: identity,
    reverseGet: identity
  })
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category = P.Category<IsoF>({
  id,
  andThen_
})

/*
 * -------------------------------------------
 * Invariant
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap_<I, A, B>(ea: Iso<I, A>, ab: (a: A) => B, ba: (b: B) => A): Iso<I, B> {
  return PIso({
    get: flow(ea.get, ab),
    reverseGet: flow(ba, ea.reverseGet)
  })
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Iso<I, A>) => Iso<I, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<IsoF> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function newtype<T extends NT.Newtype<any, any>>(): NT.NewtypeIso<T> {
  return PIso({
    get: (_) => _ as any,
    reverseGet: (_) => _ as any
  })
}
