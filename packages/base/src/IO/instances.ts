// tracing: off

import type * as HKT from '../HKT'
import type { IO } from './core'

import * as E from '../Either'
import { apSF, apTF, mapNF, sequenceSF } from '../prelude'
import * as P from '../prelude'
import { apC_, crossC_, crossWithC_ } from './op'
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

export interface IOF extends HKT.HKT {
  readonly type: IO<this['R'], this['E'], this['A']>
  readonly variance: {
    R: '-'
    E: '+'
    A: '+'
  }
}

export interface IOCategoryF extends HKT.HKT {
  readonly type: IO<this['I'], this['E'], this['A']>
  readonly variance: {
    I: '-'
    E: '+'
    A: '+'
  }
}

export const Functor = P.Functor<IOF>({
  map_
})

export const Bifunctor = P.Bifunctor<IOF>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<IOF>({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorC = P.SemimonoidalFunctor<IOF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_
})

export const Apply = P.Apply<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const mapN = mapNF(Apply)

export const sequenceS = sequenceSF(Apply)

export const apS = apSF(Apply)

export const apT = apTF(Apply)

export const ApplyC = P.Apply<IOF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  ap_: apC_
})

export const mapNC = mapNF(ApplyC)

export const sequenceSC = sequenceSF(ApplyC)

export const apSC = apSF(ApplyC)

export const apTC = apTF(ApplyC)

export const MonoidalFunctor = P.MonoidalFunctor<IOF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorC = P.MonoidalFunctor<IOF>({
  map_,
  crossWith_: crossWithC_,
  cross_: crossC_,
  unit
})

export const Applicative = P.Applicative<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeC = P.Applicative<IOF>({
  map_,
  cross_: crossC_,
  crossWith_: crossWithC_,
  ap_: apC_,
  unit,
  pure
})

export const Monad = P.Monad<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const chainRec_: <A, R, E, B>(a: A, f: (a: A) => IO<R, E, E.Either<A, B>>) => IO<R, E, B> = P.getChainRec_<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const chainRec: <A, R, E, B>(f: (a: A) => IO<R, E, E.Either<A, B>>) => (a: A) => IO<R, E, B> =
  P.getChainRec<IOF>({
    map_,
    crossWith_,
    cross_,
    ap_,
    unit,
    pure,
    chain_,
    flatten
  })

export const MonadExcept = P.MonadExcept<IOF>({
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

export const Category = P.Category<IOCategoryF>({
  id,
  compose_
})
