import type * as HKT from './HKT'
import type { Predicate } from './Predicate'
import type { Refinement } from './Refinement'

import * as A from './Array/core'
import * as C from './Const'
import { Fold } from './Fold'
import { identity } from './function'
import * as I from './Identity'
import * as Pr from './internal/Prism'
import * as Tr from './internal/Traversal'
import * as P from './prelude'
import { PSetter } from './Setter'

/*
 * -------------------------------------------
 * Traversal Model
 * -------------------------------------------
 */

export interface ModifyAFn_<S, T, A, B> {
  <F extends HKT.HKT, C = HKT.None>(F: P.Applicative<F, C>): <K, Q, W, X, I, _S, R, E>(
    s: S,
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, _S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, _S, R, E, T>
}

export interface ModifyAFn<S, T, A, B> {
  <F extends HKT.HKT, C = HKT.None>(F: P.Applicative<F, C>): <K, Q, W, X, I, _S, R, E>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, _S, R, E, B>
  ) => (s: S) => HKT.Kind<F, C, K, Q, W, X, I, _S, R, E, T>
}

export interface PTraversal<S, T, A, B> extends PSetter<S, T, A, B>, Fold<S, A> {
  readonly modifyA_: ModifyAFn_<S, T, A, B>
  readonly modifyA: ModifyAFn<S, T, A, B>
}

export interface PTraversalMin<S, T, A, B> {
  readonly modifyA_: ModifyAFn_<S, T, A, B>
}

export function PTraversal<S, T, A, B>(F: PTraversalMin<S, T, A, B>): PTraversal<S, T, A, B> {
  return {
    modifyA_: F.modifyA_,
    modifyA: (A) => (f) => (s) => F.modifyA_(A)(s, f),
    ...PSetter({
      modify_: (s, f) => F.modifyA_(I.Applicative)(s, f),
      set_: (s, b) => F.modifyA_(I.Applicative)(s, () => b)
    }),
    ...Fold({
      foldMap_:
        <M>(M: P.Monoid<M>) =>
        (s: S, f: (a: A) => M) =>
          F.modifyA_(C.getApplicative(M))(s, (a) => C.make(f(a)))
    })
  }
}

export interface Traversal<S, A> extends PTraversal<S, S, A, A> {}

export interface TraversalF extends HKT.HKT {
  readonly type: Traversal<this['I'], this['A']>
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
 * Create a `Traversal` from a `Traversable`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromTraversable = Tr.fromTraversable

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S, T>(): PTraversal<S, T, S, T> {
  return PTraversal<S, T, S, T>({
    modifyA_: (_) => (s, f) => f(s)
  })
}

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, T, A, B, C, D>(
  sa: PTraversal<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return Tr.compose_(sa, ab)
}

/**
 * Compose a `Traversal` with a `Traversal`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: PTraversal<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => compose_(sa, ab)
}

export const Category = P.Category<TraversalF>({
  id,
  compose_
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * @category Combinators
 * @since 1.0.0
 */
export function modify<A>(f: (a: A) => A): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return (sa) => sa.modify(f)
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function replace<A>(a: A): <S>(sa: Traversal<S, A>) => (s: S) => S {
  return modify(() => a)
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Traversal<S, A>) => Traversal<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Traversal<S, A>) => Traversal<S, A> {
  return compose(Pr.fromPredicate(predicate))
}

/**
 * Return a `Traversal` from a `Traversal` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <K, Q, W, X, I, S_, R, S, A>(sta: Traversal<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, S, A>>) => Traversal<S, A> {
  return compose(fromTraversable(T)())
}

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <S>(sa: Traversal<S, A>) => (s: S) => M {
  return (f) => (sa) => sa.foldMap(M)(f)
}

/**
 * Map each target to a `Monoid` and combine the results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold<A>(M: P.Monoid<A>): <S>(sa: Traversal<S, A>) => (s: S) => A {
  return foldMap(M)(identity)
}

export function getAll_<S, A>(sa: Traversal<S, A>, s: S): ReadonlyArray<A> {
  return sa.foldMap_(A.getMonoid<A>())(s, A.pure)
}

/**
 * Get all the targets of a `Traversal`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getAll<S>(s: S): <A>(sa: Traversal<S, A>) => ReadonlyArray<A> {
  return (sa) => getAll_(sa, s)
}
