import type * as HKT from '../HKT'
import type { PExit } from './core'

import * as P from '../prelude'
import { ap_, bimap_, chain_, cross_, crossWith_, flatten, map_, mapError_, pure, unit } from './core'

export interface PExitF extends HKT.HKT {
  readonly type: PExit<this['X'], this['E'], this['A']>
  readonly variance: {
    X: '+'
    E: '+'
    A: '+'
  }
}

export const Functor = P.Functor<PExitF>({
  map_
})

export const Bifunctor = P.Bifunctor<PExitF>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<PExitF>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<PExitF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const mapN = P.mapNF<PExitF>(Apply)

export const sequenceS = P.sequenceSF<PExitF>(Apply)

export const MonoidalFunctor = P.MonoidalFunctor<PExitF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<PExitF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<PExitF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})
