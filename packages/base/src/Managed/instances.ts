import type * as HKT from '../HKT'
import type { Managed } from './core'

import * as P from '../prelude'
import { apC_, crossC_, crossWithC_ } from './op/apply-par'
import {
  ap_,
  bimap_,
  catchAll_,
  chain_,
  compose_,
  cross_,
  crossWith_,
  fail,
  flatten,
  id,
  map_,
  mapError_,
  pure,
  unit
} from './core'

export interface ManagedF extends HKT.HKT {
  readonly type: Managed<this['R'], this['E'], this['A']>
  readonly variance: {
    R: '-'
    E: '+'
    A: '+'
  }
}

export interface ManagedCategoryF extends HKT.HKT {
  readonly type: Managed<this['I'], this['E'], this['A']>
  readonly variance: {
    I: '-'
    E: '+'
    A: '+'
  }
}

export const Functor = P.Functor<ManagedF>({ map_ })

export const Bifunctor = P.Bifunctor<ManagedF>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<ManagedF>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorC = P.SemimonoidalFunctor<ManagedF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_
})

export const Apply = P.Apply<ManagedF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const mapN = P.mapNF(Apply)

export const sequenceS = P.sequenceSF(Apply)

export const ApplyC = P.Apply<ManagedF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  ap_: apC_
})

export const mapNC = P.mapNF(ApplyC)

export const sequenceSC = P.sequenceSF(ApplyC)

export const MonoidalFunctor = P.MonoidalFunctor<ManagedF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorC = P.MonoidalFunctor<ManagedF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  unit
})

export const Applicative = P.Applicative<ManagedF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeC = P.Applicative<ManagedF>({
  map_,
  cross_: crossC_,
  crossWith_: crossWithC_,
  ap_: apC_,
  unit,
  pure
})

export const Monad = P.Monad<ManagedF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<ManagedF>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  catchAll_,
  fail
})

export const Category = P.Category<ManagedCategoryF>({
  id,
  compose_
})
