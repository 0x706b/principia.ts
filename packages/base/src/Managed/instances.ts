import type * as HKT from '../HKT'
import type { Managed } from './core'

import * as P from '../prelude'
import { apPar_, crossPar_, crossWithPar_ } from './combinators/apply-par'
import {
  andThen_,
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

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<ManagedF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const mapN    = P.mapNF(SemimonoidalFunctor)
export const mapNPar = P.mapNF(SemimonoidalFunctorPar)

export const sequenceS    = P.sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = P.sequenceSF(SemimonoidalFunctorPar)

export const Apply = P.Apply<ManagedF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar = P.Apply<ManagedF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor = P.MonoidalFunctor<ManagedF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar = P.MonoidalFunctor<ManagedF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
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

export const ApplicativePar = P.Applicative<ManagedF>({
  map_,
  cross_: crossPar_,
  crossWith_: crossWithPar_,
  ap_: apPar_,
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
  andThen_,
  compose_
})
