import type * as HKT from '../HKT'
import type { IterableURI } from '../Modules'

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

type URI = [HKT.URI<IterableURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI>({
  map_
})

export const FunctorWithIndex = P.FunctorWithIndex<URI>({
  imap_: map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<URI>({
  imap_: map_,
  ifilter_: filter_,
  ifilterMap_: filterMap_,
  ipartition_: partition_,
  ipartitionMap_: partitionMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_: foldl_,
  ifoldr_: foldr_,
  ifoldMap_: foldMap_
})

export const Traversable = P.Traversable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export { IterableURI } from '../Modules'
