import type { PLens } from './Lens'
import type { PrismURI } from './Modules'
import type { GetOrModifyFn, Optional, POptional } from './Optional'
import type { PTraversal, Traversal } from './Traversal'
import type { Newtype } from '@principia/base/Newtype'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'

import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import * as HKT from '@principia/base/HKT'
import * as P from '@principia/base/prelude'

import * as At from './At'
import * as _ from './internal'
import * as Ix from './Ix'
import * as L from './Lens'

export interface PPrism<S, T, A, B> extends POptional<S, T, A, B> {
  readonly reverseGet: ReverseGetFn<T, B>
}

export interface PPrismMin<S, T, A, B> {
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly reverseGet: ReverseGetFn<T, B>
}

export const PPrism: <S, T, A, B>(_: PPrismMin<S, T, A, B>) => PPrism<S, T, A, B> = _.makePPrism

export interface ReverseGetFn<T, B> {
  (b: B): T
}

export interface Prism<S, A> extends PPrism<S, S, A, A> {}

export const Prism: <S, A>(_: PPrismMin<S, S, A, A>) => Prism<S, A> = _.makePPrism

export type _S<X> = X extends Prism<infer S, any> ? S : never
export type _A<X> = X extends Prism<any, infer A> ? A : never

export type V = HKT.V<'I', '_'>

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
  return _.prismFromPredicate(predicate)
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
export function andThenLens_<S, T, A, B, C, D>(sa: PPrism<S, T, A, B>, ab: PLens<A, B, C, D>): POptional<S, T, C, D> {
  return _.optionalAndThenOptional(sa, ab)
}

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenLens<A, B, C, D>(
  ab: PLens<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThenLens_(sa, ab)
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenOptional_<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return _.optionalAndThenOptional(sa, ab)
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenOptional<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThenOptional_(sa, ab)
}

export function andThenTraversal_<S, T, A, B, C, D>(
  sa: PPrism<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return _.traversalAndThenTraversal(sa, ab)
}

export function andThenTraversal<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: PPrism<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => andThenTraversal_(sa, ab)
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
export function andThen_<S, T, A, B, C, D>(sa: PPrism<S, T, A, B>, ab: PPrism<A, B, C, D>): PPrism<S, T, C, D> {
  return PPrism({
    getOrModify: (s) =>
      pipe(
        sa.getOrModify(s),
        E.chain(
          flow(
            ab.getOrModify,
            E.bimap((b) => sa.replace_(s, b), identity)
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
export function andThen<A, B, C, D>(ab: PPrism<A, B, C, D>): <S, T>(sa: PPrism<S, T, A, B>) => PPrism<S, T, C, D> {
  return (sa) => andThen_(sa, ab)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category = P.Category<[HKT.URI<PrismURI>], V>({
  andThen_,
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
export const Invariant: P.Invariant<[HKT.URI<PrismURI>], V> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function fromNullable<A>(): Prism<A, NonNullable<A>> {
  return PPrism({
    getOrModify: (a) => E.fromNullable_(a, () => a),
    reverseGet: identity
  })
}

/**
 * Return a `Prism` from a `Prism` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function nullable<S, A>(sa: Prism<S, A>): Prism<S, NonNullable<A>> {
  return andThen_(sa, fromNullable())
}

export function filter_<S, A, B extends A>(sa: Prism<S, A>, refinement: Refinement<A, B>): Prism<S, B>
export function filter_<S, A>(sa: Prism<S, A>, predicate: Predicate<A>): Prism<S, A>
export function filter_<S, A>(sa: Prism<S, A>, predicate: Predicate<A>): Prism<S, A> {
  return andThen_(sa, fromPredicate(predicate))
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return andThen(fromPredicate(predicate))
}

export function prop_<S, A, P extends keyof A>(sa: Prism<S, A>, prop: P): Optional<S, A[P]> {
  return andThenLens_(sa, pipe(L.id<A, A>(), L.prop(prop)))
}

/**
 * Return a `Optional` from a `Prism` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return (sa) => prop_(sa, prop)
}

export function props_<S, A, P extends keyof A>(
  sa: Prism<S, A>,
  ...props: [P, P, ...Array<P>]
): Optional<S, { [K in P]: A[K] }> {
  return andThenLens_(sa, pipe(L.id<A, A>(), L.props(...props)))
}

/**
 * Return a `Optional` from a `Prism` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Prism<S, A>) => Optional<
  S,
  {
    [K in P]: A[K]
  }
> {
  return (sa) => props_(sa, ...props)
}

export function component_<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
  sa: Prism<S, A>,
  prop: P
): Optional<S, A[P]> {
  return andThenLens_(sa, pipe(L.id<A, A>(), L.component(prop)))
}

/**
 * Return a `Optional` from a `Prism` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return (sa) => component_(sa, prop)
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index_<S, A>(sa: Prism<S, ReadonlyArray<A>>, i: number): Optional<S, A> {
  return pipe(sa, andThenOptional(Ix.array<A>().index(i)))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number): <S, A>(sa: Prism<S, readonly A[]>) => Optional<S, A> {
  return (sa) => index_(sa, i)
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key_<S, A>(sa: Prism<S, Readonly<Record<string, A>>>, key: string): Optional<S, A> {
  return pipe(sa, andThenOptional(Ix.record<A>().index(key)))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string): <S, A>(sa: Prism<S, Readonly<Record<string, A>>>) => Optional<S, A> {
  return (sa) => key_(sa, key)
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function atKey_<S, A>(sa: Prism<S, Readonly<Record<string, A>>>, key: string): Optional<S, Option<A>> {
  return andThenLens_(sa, At.atRecord<A>().at(key))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function atKey(key: string): <S, A>(sa: Prism<S, Readonly<Record<string, A>>>) => Optional<S, Option<A>> {
  return (sa) => atKey_(sa, key)
}

/**
 * Return a `Prism` from a `Prism` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Prism<S, Option<A>>) => Prism<S, A> = andThen(_.prismSome())

/**
 * Return a `Prism` from a `Prism` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Prism<S, E.Either<E, A>>) => Prism<S, A> = andThen(_.prismRight())

/**
 * Return a `Prism` from a `Prism` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Prism<S, E.Either<E, A>>) => Prism<S, E> = andThen(_.prismLeft())

/**
 * Return a `Traversal` from a `Prism` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.URIS, C = HKT.Auto>(
  T: P.Traversable<T, C>
): <S, N extends string, K, Q, W, X, I, S_, R, E, A>(
  sta: Prism<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A> {
  return andThenTraversal(_.fromTraversable(T)())
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findFirst: <A>(predicate: Predicate<A>) => <S>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
  _.findFirst,
  andThenOptional
)

export function newtype<T extends Newtype<any, any>>(getOption: Predicate<T['_A']>): Prism<T['_A'], T> {
  return PPrism({
    getOrModify: (s) => (getOption(s) ? E.right(s) : E.left(s)),
    reverseGet: (a) => a as any
  })
}
