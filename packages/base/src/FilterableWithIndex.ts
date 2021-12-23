import type { FunctorWithIndexMin } from './FunctorWithIndex'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'
import type { PredicateWithIndex } from './Predicate'
import type { RefinementWithIndex } from './Refinement'

import { FunctorWithIndex } from './FunctorWithIndex'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Maybe'

export interface FilterableWithIndex<F extends HKT.HKT, C = HKT.None> extends FunctorWithIndex<F, C> {
  readonly ipartitionMap_: PartitionMapWithIndexFn_<F, C>
  readonly ipartition_: PartitionWithIndexFn_<F, C>
  readonly ifilterMap_: FilterMapWithIndexFn_<F, C>
  readonly ifilter_: FilterWithIndexFn_<F, C>
  readonly ipartitionMap: PartitionMapWithIndexFn<F, C>
  readonly ipartition: PartitionWithIndexFn<F, C>
  readonly ifilterMap: FilterMapWithIndexFn<F, C>
  readonly ifilter: FilterWithIndexFn<F, C>
}

export type FilterableWithIndexMin<F extends HKT.HKT, C = HKT.None> = FunctorWithIndexMin<F, C> &
  (
    | {
        readonly ifilterMap_: FilterMapWithIndexFn_<F, C>
        readonly ipartitionMap_: PartitionMapWithIndexFn_<F, C>
      }
    | {
        readonly ifilterMap_: FilterMapWithIndexFn_<F, C>
        readonly ipartitionMap_: PartitionMapWithIndexFn_<F, C>
        readonly ifilter_: FilterWithIndexFn_<F, C>
        readonly ipartition_: PartitionWithIndexFn_<F, C>
      }
  )

export function FilterableWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FilterableWithIndexMin<F, C>
): FilterableWithIndex<F, C>
export function FilterableWithIndex<F>(F: FilterableWithIndexMin<HKT.F<F>>): FilterableWithIndex<HKT.F<F>> {
  const ifilterMap_: FilterMapWithIndexFn_<HKT.F<F>>       = F.ifilterMap_
  const ipartitionMap_: PartitionMapWithIndexFn_<HKT.F<F>> = F.ipartitionMap_
  let ipartition_: PartitionWithIndexFn_<HKT.F<F>>
  let ifilter_: FilterWithIndexFn_<HKT.F<F>>

  if ('ifilter_' in F) {
    ifilter_ = F.ifilter_
  } else {
    ifilter_ = <K, Q, W, X, I, S, R, E, A>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      predicate: PredicateWithIndex<K, A>
    ): HKT.FK<F, K, Q, W, X, I, S, R, E, A> => F.ifilterMap_(fa, (i, a) => (predicate(i, a) ? O.just(a) : O.nothing()))
  }

  if ('ipartition_' in F) {
    ipartition_ = F.ipartition_
  } else {
    ipartition_ = <K, Q, W, X, I, S, R, E, A>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      predicate: PredicateWithIndex<K, A>
    ): readonly [HKT.FK<F, K, Q, W, X, I, S, R, E, A>, HKT.FK<F, K, Q, W, X, I, S, R, E, A>] =>
      ipartitionMap_(fa, (i, a) => (predicate(i, a) ? E.right(a) : E.left(a)))
  }

  return HKT.instance<FilterableWithIndex<HKT.F<F>>>({
    ...FunctorWithIndex(F),
    ifilterMap_,
    ifilterMap: (f) => (fa) => ifilterMap_(fa, f),
    ipartitionMap_,
    ipartitionMap: (f) => (fa) => ipartitionMap_(fa, f),
    ifilter_,
    ifilter:
      <K, A>(f: PredicateWithIndex<K, A>) =>
      <Q, W, X, I, S, R, E>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
        ifilter_(fa, f),
    ipartition_,
    ipartition:
      <K, A>(f: PredicateWithIndex<K, A>) =>
      <Q, W, X, I, S, R, E>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
        ipartition_(fa, f)
  })
}

export interface FilterWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B extends A>(refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface FilterWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface FilterMapWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B>(f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => Maybe<B>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => Maybe<B>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionMapWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B, B1>(f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => Either<B, B1>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B extends A>(refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>
  ): readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]
  <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>]
}
