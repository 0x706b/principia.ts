import type * as HKT from '../HKT'
import type { ManagedURI } from '../Modules'

import * as P from '../prelude'
import { apPar_, crossPar_, crossWithPar_ } from './combinators/apply-par'
import { ap_, bimap_, catchAll_, chain_, cross_, crossWith_, fail, flatten, map_, mapError_, pure, unit } from './core'

export type URI = [HKT.URI<ManagedURI>]
export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

export const Functor = P.Functor<URI, V>({ map_ })

export const Bifunctor = P.Bifunctor<URI, V>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const crossFlat_ = P.crossFlatF_<URI, V>({
  map_,
  cross_,
  crossWith_
})
export const crossFlat = P.crossFlatF<URI, V>({
  map_,
  cross_,
  crossWith_
})

export const crossFlatPar_ = P.crossFlatF_<URI, V>({ map_, cross_, crossWith_ })
export const crossFlatPar  = P.crossFlatF<URI, V>({ map_, cross_, crossWith_ })

export const mapN    = P.mapNF(SemimonoidalFunctor)
export const mapNPar = P.mapNF(SemimonoidalFunctorPar)

export const sequenceS    = P.sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = P.sequenceSF(SemimonoidalFunctorPar)

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar = P.Apply<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativePar = P.Applicative<URI, V>({
  map_,
  cross_: crossPar_,
  crossWith_: crossWithPar_,
  ap_: apPar_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, V>({
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
