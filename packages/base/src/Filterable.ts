import type { FunctorMin } from './Functor'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'
import type { Predicate } from './Predicate'
import type { Refinement } from './Refinement'

import { Functor } from './Functor'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Option'

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly partitionMap_: PartitionMapFn_<F, C>
  readonly partitionMap: PartitionMapFn<F, C>
  readonly partition_: PartitionFn_<F, C>
  readonly partition: PartitionFn<F, C>
  readonly filterMap_: FilterMapFn_<F, C>
  readonly filterMap: FilterMapFn<F, C>
  readonly filter_: FilterFn_<F, C>
  readonly filter: FilterFn<F, C>
}

export type FilterableMin<F extends HKT.URIS, C = HKT.Auto> = FunctorMin<F, C> &
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

export function Filterable<F extends HKT.URIS, C = HKT.Auto>(F: FilterableMin<F, C>): Filterable<F, C>
export function Filterable<F>(F: FilterableMin<HKT.UHKT<F>>): Filterable<HKT.UHKT<F>> {
  const filterMap_: FilterMapFn_<HKT.UHKT<F>>       = F.filterMap_
  const partitionMap_: PartitionMapFn_<HKT.UHKT<F>> = F.partitionMap_
  let partition_: PartitionFn_<HKT.UHKT<F>>
  let filter_: FilterFn_<HKT.UHKT<F>>

  if ('filter_' in F) {
    filter_ = F.filter_
  } else {
    filter_ = <A>(fa: HKT.HKT<F, A>, predicate: Predicate<A>): HKT.HKT<F, A> =>
      F.filterMap_(fa, (a) => O.fromPredicate_(a, predicate))
  }

  if ('partition_' in F) {
    partition_ = F.partition_
  } else {
    partition_ = <A>(fa: HKT.HKT<F, A>, predicate: Predicate<A>): readonly [HKT.HKT<F, A>, HKT.HKT<F, A>] =>
      partitionMap_(fa, (a) => (predicate(a) ? E.right(a) : E.left(a)))
  }

  return HKT.instance<Filterable<HKT.UHKT<F>>>({
    ...Functor(F),
    filterMap_,
    filterMap: (f) => (fa) => filterMap_(fa, f),
    partitionMap_,
    partitionMap: (f) => (fa) => partitionMap_(fa, f),
    filter_,
    filter:
      <A>(f: Predicate<A>) =>
      (fa: HKT.HKT<F, A>) =>
        filter_(fa, f),
    partition_,
    partition:
      <A>(f: Predicate<A>) =>
      (fa: HKT.HKT<F, A>) =>
        partition_(fa, f)
  })
}

export interface FilterFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: Predicate<A>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => Option<B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Option<B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: Predicate<A>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B, B1>(f: (a: A) => Either<B, B1>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}
