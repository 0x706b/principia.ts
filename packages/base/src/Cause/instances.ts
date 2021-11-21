import type * as HKT from '../HKT'
import type { PCause } from './core'

import { mapNF, sequenceSF } from '../prelude'
import * as P from '../prelude'
import { ap_, chain_, cross_, crossWith_, flatten, map_, pure, unit } from './core'

export interface PCauseF extends HKT.HKT {
  readonly type: PCause<this['X'], this['A']>
  readonly variance: {
    X: '+'
    A: '+'
  }
}

export const Functor = P.Functor<PCauseF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<PCauseF>({
  map_,
  crossWith_,
  cross_
})

export const mapN = mapNF(SemimonoidalFunctor)

export const sequenceS = sequenceSF(SemimonoidalFunctor)

export const Apply = P.Apply<PCauseF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<PCauseF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<PCauseF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<PCauseF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})
