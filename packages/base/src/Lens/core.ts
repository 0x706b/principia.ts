import type { GetFn, Getter } from '../Getter'
import type { Optional, POptional } from '../Optional'
import type { Predicate } from '../Predicate'
import type { PPrism } from '../Prism'
import type { Refinement } from '../Refinement'
import type { SetFn_ } from '../Setter'
import type { PTraversal, Traversal } from '../Traversal'

import { flow, identity } from '../function'
import * as HKT from '../HKT'
import * as L from '../internal/Lens'
import * as Op from '../internal/Optional'
import * as Pr from '../internal/Prism'
import * as Tr from '../internal/Traversal'
import * as P from '../prelude'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface PLens<S, T, A, B> extends POptional<S, T, A, B>, Getter<S, A> {}

export interface PLensMin<S, T, A, B> {
  readonly get: GetFn<S, A>
  readonly set_: SetFn_<S, T, B>
}

export const PLens: <S, T, A, B>(_: PLensMin<S, T, A, B>) => PLens<S, T, A, B> = L.makePLens

export interface Lens<S, A> extends PLens<S, S, A, A> {}

export const Lens: <S, A>(_: PLensMin<S, S, A, A>) => Lens<S, A> = L.makePLens

export interface LensF extends HKT.HKT {
  readonly type: Lens<this['I'], this['A']>
  readonly variance: {
    I: '_'
    A: '+'
  }
}

/*
 * -------------------------------------------
 * Compositions
 * -------------------------------------------
 */

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composePrism_<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PPrism<A, B, C, D>): POptional<S, T, C, D> {
  return Op.compose_(sa, ab)
}

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composePrism<A, B, C, D>(
  ab: PPrism<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => composePrism_(sa, ab)
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional_<S, T, A, B, C, D>(
  sa: PLens<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return Op.compose_(sa, ab)
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => composeOptional_(sa, ab)
}

export function composeTraversal_<S, T, A, B, C, D>(
  sa: PLens<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return Tr.compose_(sa, ab)
}

export function composeTraversal<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => composeTraversal_(sa, ab)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function id<S, T = S>(): PLens<S, T, S, T> {
  return PLens({
    get: identity,
    set_: (_, t) => t
  })
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PLens<A, B, C, D>): PLens<S, T, C, D> {
  return PLens({
    get: flow(sa.get, ab.get),
    set_: (s, d) => sa.modify_(s, ab.set(d))
  })
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B, C, D>(ab: PLens<A, B, C, D>): <S, T>(sa: PLens<S, T, A, B>) => PLens<S, T, C, D> {
  return (sa) => compose_(sa, ab)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category = P.Category<LensF>({
  id,
  compose_: compose_
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
export function invmap_<I, A, B>(ea: Lens<I, A>, ab: (a: A) => B, ba: (b: B) => A): Lens<I, B> {
  return PLens({
    get: flow(ea.get, ab),
    set_: (i, b) => ea.set_(i, ba(b))
  })
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Lens<I, A>) => Lens<I, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<LensF> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Return a `Optional` from a `Lens` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fromNullable<S, A>(sa: Lens<S, A>): Optional<S, NonNullable<A>> {
  return composePrism_(sa, Pr.fromNullable<A>())
}

export function filter_<S, A, B extends A>(sa: Lens<S, A>, refinement: Refinement<A, B>): Optional<S, B>
export function filter_<S, A>(sa: Lens<S, A>, predicate: Predicate<A>): Optional<S, A>
export function filter_<S, A>(sa: Lens<S, A>, predicate: Predicate<A>): Optional<S, A> {
  return composePrism_(sa, Pr.fromPredicate(predicate))
}

/**
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A> {
  return (sa) => filter_(sa, predicate)
}

/**
 * Return a `Traversal` from a `Lens` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <S, K, Q, W, X, I, S_, R, E, A>(sta: Lens<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>) => Traversal<S, A> {
  return flow(composeTraversal(Tr.fromTraversable(T)()))
}
