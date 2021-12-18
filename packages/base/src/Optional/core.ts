import type * as M from '../Maybe'
import type * as P from '../prelude'
import type { SetFn_ } from '../Setter'
import type { PTraversal, Traversal } from '../Traversal'

import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as HKT from '../HKT'
import * as Op from '../internal/Optional'
import * as Pr from '../internal/Prism'
import * as Tr from '../Traversal'

/*
 * -------------------------------------------
 * Optional Model
 * -------------------------------------------
 */

export interface POptional<S, T, A, B> extends PTraversal<S, T, A, B> {
  readonly getMaybe: GetMaybeFn<S, A>
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly modifyMaybe_: ModifyMaybeFn_<S, T, A, B>
  readonly modifyMaybe: ModifyMaybeFn<S, T, A, B>
}

export interface POptionalMin<S, T, A, B> {
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly replace_: SetFn_<S, T, B>
}

export const POptional: <S, T, A, B>(_: POptionalMin<S, T, A, B>) => POptional<S, T, A, B> = Op.makePOptional

export interface Optional<S, A> extends POptional<S, S, A, A> {}

export const Optional: <S, A>(_: POptionalMin<S, S, A, A>) => Optional<S, A> = Op.makePOptional

export interface GetMaybeFn<S, A> {
  (s: S): M.Maybe<A>
}

export interface GetOrModifyFn<S, T, A> {
  (s: S): E.Either<T, A>
}

export interface ModifyMaybeFn_<S, T, A, B> {
  (s: S, f: (a: A) => B): M.Maybe<T>
}

export interface ModifyMaybeFn<S, T, A, B> {
  (f: (a: A) => B): (s: S) => M.Maybe<T>
}

export interface ReplaceMaybeFn_<S, T, B> {
  (s: S, b: B): M.Maybe<T>
}

export interface ReplaceMaybeFn<S, T, B> {
  (b: B): (s: S) => M.Maybe<T>
}

export interface OptionalF extends HKT.HKT {
  readonly type: Optional<this['I'], this['A']>
  readonly variance: {
    I: '_'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export const fromFind = Op.fromFind

export function fromNullable<S, A>(sa: Optional<S, A>): Optional<S, NonNullable<A>> {
  return andThen_(sa, Pr.fromNullable())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Invariant
 * -------------------------------------------------------------------------------------------------
 */

export function invmap_<S, A, B>(fa: Optional<S, A>, ab: (a: A) => B, ba: (b: B) => A): Optional<S, B> {
  return POptional({
    getOrModify: flow(fa.getOrModify, E.map(ab)),
    replace_: (s, b) => fa.set_(s, ba(b))
  })
}

export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <S>(fa: Optional<S, A>) => Optional<S, B> {
  return (fa) => invmap_(fa, ab, ba)
}

export const Invariant: P.Invariant<OptionalF> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function id<S, T>(): POptional<S, T, S, T> {
  return POptional({
    getOrModify: E.right,
    replace_: (_, t) => t
  })
}

export function andThen_<S, T, A, B, C, D>(
  sa: POptional<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return POptional({
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
    replace_: (s, d) => sa.modify_(s, ab.set(d))
  })
}

export function andThen<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: POptional<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThen_(sa, ab)
}

export function andThenTraversal_<S, T, A, B, C, D>(
  sa: POptional<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return Tr.andThen_(sa, ab)
}

export function andThenTraversal<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: POptional<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => andThenTraversal_(sa, ab)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<S, A, B extends A>(sa: Optional<S, A>, refinement: P.Refinement<A, B>): Optional<S, B>
export function filter_<S, A>(sa: Optional<S, A>, predicate: P.Predicate<A>): Optional<S, A>
export function filter_<S, A>(sa: Optional<S, A>, predicate: P.Predicate<A>): Optional<S, A> {
  return andThen_(sa, Pr.fromPredicate(predicate))
}

/**
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: P.Refinement<A, B>): <S>(sa: Optional<S, A>) => Optional<S, B>
export function filter<A>(predicate: P.Predicate<A>): <S>(sa: Optional<S, A>) => Optional<S, A>
export function filter<A>(predicate: P.Predicate<A>): <S>(sa: Optional<S, A>) => Optional<S, A> {
  return (sa) => filter_(sa, predicate)
}

export function traverse<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <S, K, Q, W, X, I, S_, R, E, A>(sta: Optional<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>) => Traversal<S, A> {
  return flow(Tr.andThen(Tr.fromTraversable(T)()))
}
