import type { PLens } from '../Lens'
import type { Newtype } from '../Newtype'
import type { GetOrModifyFn, POptional } from '../Optional'
import type { Predicate } from '../Predicate'
import type { Refinement } from '../Refinement'
import type { PTraversal, Traversal } from '../Traversal'

import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as HKT from '../HKT'
import * as Op from '../internal/Optional'
import * as Pr from '../internal/Prism'
import * as Tr from '../internal/Traversal'
import * as P from '../prelude'

export interface PPrism<S, T, A, B> extends POptional<S, T, A, B> {
  readonly reverseGet: ReverseGetFn<T, B>
}

export interface PPrismMin<S, T, A, B> {
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly reverseGet: ReverseGetFn<T, B>
}

export const PPrism: <S, T, A, B>(_: PPrismMin<S, T, A, B>) => PPrism<S, T, A, B> = Pr.makePPrism

export interface ReverseGetFn<T, B> {
  (b: B): T
}

export interface Prism<S, A> extends PPrism<S, S, A, A> {}

export const Prism: <S, A>(_: PPrismMin<S, S, A, A>) => Prism<S, A> = Pr.makePPrism

export type _S<X> = X extends Prism<infer S, any> ? S : never
export type _A<X> = X extends Prism<any, infer A> ? A : never

export interface PrismF extends HKT.HKT {
  readonly type: Prism<this['I'], this['A']>
  readonly variance: {
    I: '_'
    A: '+'
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate<S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A>
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return Pr.fromPredicate(predicate)
}

export function fromNullable<A>(): Prism<A, NonNullable<A>> {
  return PPrism({
    getOrModify: (a) => E.fromNullable_(a, () => a),
    reverseGet: identity
  })
}

/*
 * -------------------------------------------
 * Compositions
 * -------------------------------------------
 */

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeLens_<S, T, A, B, C, D>(sa: PPrism<S, T, A, B>, ab: PLens<A, B, C, D>): POptional<S, T, C, D> {
  return Op.compose_(sa, ab)
}

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeLens<A, B, C, D>(
  ab: PLens<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => composeLens_(sa, ab)
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional_<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return Op.compose_(sa, ab)
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => composeOptional_(sa, ab)
}

export function composeTraversal_<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return Tr.compose_(sa, ab)
}

export function composeTraversal<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => composeTraversal_(sa, ab)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S, T>(): PPrism<S, T, S, T> {
  return PPrism({
    getOrModify: E.right,
    reverseGet: identity
  })
}

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, T, A, B, C, D>(sa: PPrism<S, T, A, B>, ab: PPrism<A, B, C, D>): PPrism<S, T, C, D> {
  return PPrism({
    getOrModify: (s) =>
      pipe(
        sa.getOrModify(s),
        E.chain(
          flow(
            ab.getOrModify,
            E.bimap((b) => sa.set_(s, b), identity)
          )
        )
      ),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  })
}

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B, C, D>(ab: PPrism<A, B, C, D>): <S, T>(sa: PPrism<S, T, A, B>) => PPrism<S, T, C, D> {
  return (sa) => compose_(sa, ab)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category = P.Category<PrismF>({
  compose_: compose_,
  id
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
export function invmap_<S, A, B>(ea: Prism<S, A>, ab: (a: A) => B, ba: (b: B) => A): Prism<S, B> {
  return PPrism({
    getOrModify: flow(ea.getOrModify, E.map(ab)),
    reverseGet: flow(ba, ea.reverseGet)
  })
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <S>(ea: Prism<S, A>) => Prism<S, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<PrismF> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Return a `Prism` from a `Prism` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function nullable<S, A>(sa: Prism<S, A>): Prism<S, NonNullable<A>> {
  return compose_(sa, fromNullable())
}

export function filter_<S, A, B extends A>(sa: Prism<S, A>, refinement: Refinement<A, B>): Prism<S, B>
export function filter_<S, A>(sa: Prism<S, A>, predicate: Predicate<A>): Prism<S, A>
export function filter_<S, A>(sa: Prism<S, A>, predicate: Predicate<A>): Prism<S, A> {
  return compose_(sa, fromPredicate(predicate))
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return compose(fromPredicate(predicate))
}

/**
 * Return a `Traversal` from a `Prism` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <S, K, Q, W, X, I, S_, R, E, A>(sta: Prism<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>) => Traversal<S, A> {
  return composeTraversal(Tr.fromTraversable(T)())
}

export function newtype<T extends Newtype<any, any>>(getMaybe: Predicate<T['_A']>): Prism<T['_A'], T> {
  return PPrism({
    getOrModify: (s) => (getMaybe(s) ? E.right(s) : E.left(s)),
    reverseGet: (a) => a as any
  })
}
