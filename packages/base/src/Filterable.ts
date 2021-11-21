import type { FunctorMin } from './Functor'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'
import type { Predicate } from './Predicate'
import type { Refinement } from './Refinement'

import { Functor } from './Functor'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as M from './internal/Maybe'

export interface Filterable<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly partitionMap_: PartitionMapFn_<F, C>
  readonly partitionMap: PartitionMapFn<F, C>
  readonly partition_: PartitionFn_<F, C>
  readonly partition: PartitionFn<F, C>
  readonly filterMap_: FilterMapFn_<F, C>
  readonly filterMap: FilterMapFn<F, C>
  readonly filter_: FilterFn_<F, C>
  readonly filter: FilterFn<F, C>
}

export type FilterableMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> &
  (
    | {
        readonly filterMap_: FilterMapFn_<F, C>
        readonly partitionMap_: PartitionMapFn_<F, C>
      }
    | {
        readonly filterMap_: FilterMapFn_<F, C>
        readonly partitionMap_: PartitionMapFn_<F, C>
        readonly filter_: FilterFn_<F, C>
        readonly partition_: PartitionFn_<F, C>
      }
  )

export function Filterable<F extends HKT.HKT, C = HKT.None>(F: FilterableMin<F, C>): Filterable<F, C>
export function Filterable<F>(F: FilterableMin<HKT.F<F>>): Filterable<HKT.F<F>> {
  const filterMap_: FilterMapFn_<HKT.F<F>>       = F.filterMap_
  const partitionMap_: PartitionMapFn_<HKT.F<F>> = F.partitionMap_
  let partition_: PartitionFn_<HKT.F<F>>
  let filter_: FilterFn_<HKT.F<F>>

  if ('filter_' in F) {
    filter_ = F.filter_
  } else {
    filter_ = <K, Q, W, X, I, S, R, E, A>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      predicate: Predicate<A>
    ): HKT.FK<F, K, Q, W, X, I, S, R, E, A> => F.filterMap_(fa, (a) => M.fromPredicate_(a, predicate))
  }

  if ('partition_' in F) {
    partition_ = F.partition_
  } else {
    partition_ = <K, Q, W, X, I, S, R, E, A>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      predicate: Predicate<A>
    ): readonly [HKT.FK<F, K, Q, W, X, I, S, R, E, A>, HKT.FK<F, K, Q, W, X, I, S, R, E, A>] =>
      partitionMap_(fa, (a) => (predicate(a) ? E.right(a) : E.left(a)))
  }

  return HKT.instance<Filterable<HKT.F<F>>>({
    ...Functor(F),
    filterMap_,
    filterMap: (f) => (fa) => filterMap_(fa, f),
    partitionMap_,
    partitionMap: (f) => (fa) => partitionMap_(fa, f),
    filter_,
    filter:
      <A>(f: Predicate<A>) =>
      <K, Q, W, X, I, S, R, E>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
        filter_(fa, f),
    partition_,
    partition:
      <A>(f: Predicate<A>) =>
      <K, Q, W, X, I, S, R, E>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
        partition_(fa, f)
  })
}

export interface FilterFn<F extends HKT.HKT, C = HKT.None> {
  <A, B extends A>(refinement: Refinement<A, B>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <A>(predicate: Predicate<A>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface FilterFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, predicate: Predicate<A>): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >
}

export interface FilterMapFn<F extends HKT.HKT, C = HKT.None> {
  <A, B>(f: (a: A) => Maybe<B>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (a: A) => Maybe<B>): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    B
  >
}

export interface PartitionFn<F extends HKT.HKT, C = HKT.None> {
  <A, B extends A>(refinement: Refinement<A, B>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]
  <A>(predicate: Predicate<A>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, predicate: Predicate<A>): readonly [
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ]
}

export interface PartitionMapFn<F extends HKT.HKT, C = HKT.None> {
  <A, B, B1>(f: (a: A) => Either<B, B1>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>]
}
