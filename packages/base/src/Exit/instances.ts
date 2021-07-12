import type * as HKT from '../HKT'
import type { ExitURI } from '../Modules'

import * as P from '../prelude'
import { ap_, bimap_, chain_, cross_, crossWith_, flatten, map_, mapError_, pure, unit } from './core'

export type URI = [HKT.URI<ExitURI>]
export type V = HKT.V<'E', '+'>

export const Functor = P.Functor<URI, V>({
  map_
})

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

export const mapN = P.mapNF<URI, V>(SemimonoidalFunctor)

export const sequenceS = P.sequenceSF<URI, V>(SemimonoidalFunctor)

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
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
