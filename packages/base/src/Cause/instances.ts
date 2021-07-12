import type * as HKT from '../HKT'
import type { CauseURI } from '../Modules'

import { mapNF, sequenceSF } from '../prelude'
import * as P from '../prelude'
import { ap_, chain_, cross_, crossWith_, flatten, map_, pure, unit } from './core'

export type URI = [HKT.URI<CauseURI>]

export const Functor = P.Functor<URI>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const crossFlat_ = P.crossFlatF_<URI>({
  map_,
  cross_,
  crossWith_
})
export const crossFlat = P.crossFlatF<URI>({
  map_,
  cross_,
  crossWith_
})

export const mapN = mapNF(SemimonoidalFunctor)

export const sequenceS = sequenceSF(SemimonoidalFunctor)

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
