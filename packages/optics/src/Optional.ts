import type { ReplaceFn_ } from './Setter'
import type { PTraversal } from './Traversal'
import type * as HKT from '@principia/base/HKT'
import type * as O from '@principia/base/Option'

import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'

import * as _ from './internal'

/*
 * -------------------------------------------
 * Optional Model
 * -------------------------------------------
 */

export interface POptional<S, T, A, B> extends PTraversal<S, T, A, B> {
  readonly getOption: GetOptionFn<S, A>
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly modifyOption_: ModifyOptionFn_<S, T, A, B>
  readonly modifyOption: ModifyOptionFn<S, T, A, B>
}

export interface POptionalMin<S, T, A, B> {
  readonly getOrModify: GetOrModifyFn<S, T, A>
  readonly replace_: ReplaceFn_<S, T, B>
}

export const POptional: <S, T, A, B>(_: POptionalMin<S, T, A, B>) => POptional<S, T, A, B> = _.makePOptional

export interface Optional<S, A> extends POptional<S, S, A, A> {}

export const Optional: <S, A>(_: POptionalMin<S, S, A, A>) => Optional<S, A> = _.makePOptional

export interface GetOptionFn<S, A> {
  (s: S): O.Option<A>
}

export interface GetOrModifyFn<S, T, A> {
  (s: S): E.Either<T, A>
}

export interface ModifyOptionFn_<S, T, A, B> {
  (s: S, f: (a: A) => B): O.Option<T>
}

export interface ModifyOptionFn<S, T, A, B> {
  (f: (a: A) => B): (s: S) => O.Option<T>
}

export interface ReplaceOptionFn_<S, T, B> {
  (s: S, b: B): O.Option<T>
}

export interface ReplaceOptionFn<S, T, B> {
  (b: B): (s: S) => O.Option<T>
}

export type V = HKT.V<'I', '_'>

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
            E.bimap((b) => sa.replace_(s, b), identity)
          )
        )
      ),
    replace_: (s, d) => sa.modify_(s, ab.replace(d))
  })
}

export function andThen<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: POptional<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThen_(sa, ab)
}
