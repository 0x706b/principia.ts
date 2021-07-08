import type { FunctorWithIndexMin } from './FunctorWithIndex'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'
import type { PredicateWithIndex } from './Predicate'
import type { RefinementWithIndex } from './Refinement'

import { FunctorWithIndex } from './FunctorWithIndex'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Option'

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends FunctorWithIndex<F, C> {
  readonly ipartitionMap_: PartitionMapWithIndexFn_<F, C>
  readonly ipartition_: PartitionWithIndexFn_<F, C>
  readonly ifilterMap_: FilterMapWithIndexFn_<F, C>
  readonly ifilter_: FilterWithIndexFn_<F, C>
  readonly ipartitionMap: PartitionMapWithIndexFn<F, C>
  readonly ipartition: PartitionWithIndexFn<F, C>
  readonly ifilterMap: FilterMapWithIndexFn<F, C>
  readonly ifilter: FilterWithIndexFn<F, C>
}

export type FilterableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = FunctorWithIndexMin<F, C> &
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

export function FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: FilterableWithIndexMin<F, C>
): FilterableWithIndex<F, C>
export function FilterableWithIndex<F>(F: FilterableWithIndexMin<HKT.UHKT<F>>): FilterableWithIndex<HKT.UHKT<F>> {
  const ifilterMap_: FilterMapWithIndexFn_<HKT.UHKT<F>>       = F.ifilterMap_
  const ipartitionMap_: PartitionMapWithIndexFn_<HKT.UHKT<F>> = F.ipartitionMap_
  let ipartition_: PartitionWithIndexFn_<HKT.UHKT<F>>
  let ifilter_: FilterWithIndexFn_<HKT.UHKT<F>>

  if ('ifilter_' in F) {
    ifilter_ = F.ifilter_
  } else {
    ifilter_ = <A>(fa: HKT.HKT<F, A>, predicate: PredicateWithIndex<unknown, A>): HKT.HKT<F, A> =>
      F.ifilterMap_(fa, (i, a) => (predicate(i, a) ? O.some(a) : O.none()))
  }

  if ('ipartition_' in F) {
    ipartition_ = F.ipartition_
  } else {
    ipartition_ = <A>(
      fa: HKT.HKT<F, A>,
      predicate: PredicateWithIndex<unknown, A>
    ): readonly [HKT.HKT<F, A>, HKT.HKT<F, A>] =>
      ipartitionMap_(fa, (i, a) => (predicate(i, a) ? E.right(a) : E.left(a)))
  }

  return HKT.instance<FilterableWithIndex<HKT.UHKT<F>>>({
    ...FunctorWithIndex(F),
    ifilterMap_,
    ifilterMap: (f) => (fa) => ifilterMap_(fa, f),
    ipartitionMap_,
    ipartitionMap: (f) => (fa) => ipartitionMap_(fa, f),
    ifilter_,
    ifilter:
      <A>(f: PredicateWithIndex<unknown, A>) =>
      (fa: HKT.HKT<F, A>) =>
        ifilter_(fa, f),
    ipartition_,
    ipartition:
      <A>(f: PredicateWithIndex<unknown, A>) =>
      (fa: HKT.HKT<F, A>) =>
        ipartition_(fa, f)
  })
}

export interface FilterWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, A>(
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Option<B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Option<B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B, B1>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Either<B, B1>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, A>(
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}
