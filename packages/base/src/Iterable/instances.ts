import type * as HKT from '../HKT'

import * as P from '../prelude'
import {
  ap_,
  chain_,
  cross_,
  crossWith_,
  filter_,
  filterMap_,
  flatten,
  foldl_,
  foldMap_,
  foldr_,
  map_,
  partition_,
  partitionMap_,
  pure,
  traverse_,
  unit
} from './core'

export interface IterableF extends HKT.HKT {
  readonly type: Iterable<this['A']>
  readonly index: number
  readonly variance: {
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<IterableF>({
  map_
})

export const FunctorWithIndex = P.FunctorWithIndex<IterableF>({
  imap_: map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<IterableF>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<IterableF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<IterableF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<IterableF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<IterableF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const Filterable = P.Filterable<IterableF>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<IterableF>({
  imap_: map_,
  ifilter_: filter_,
  ifilterMap_: filterMap_,
  ipartition_: partition_,
  ipartitionMap_: partitionMap_
})

export const Foldable = P.Foldable<IterableF>({
  foldl_,
  foldr_,
  foldMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<IterableF>({
  ifoldl_: foldl_,
  ifoldr_: foldr_,
  ifoldMap_: foldMap_
})

export const Traversable = P.Traversable<IterableF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})
