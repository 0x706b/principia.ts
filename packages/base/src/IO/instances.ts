// tracing: off

import type * as HKT from '../HKT'
import type { IO } from './core'

import * as E from '../Either'
import { mapNF, sequenceSF } from '../prelude'
import * as P from '../prelude'
import { apPar_, crossPar_, crossWithPar_ } from './combinators'
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

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<IOF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const mapN    = mapNF(SemimonoidalFunctor)
export const mapNPar = mapNF(SemimonoidalFunctorPar)

export const sequenceS    = sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = sequenceSF(SemimonoidalFunctorPar)

export const Apply = P.Apply<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar = P.Apply<IOF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor = P.MonoidalFunctor<IOF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar = P.MonoidalFunctor<IOF>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
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

export const ApplicativePar = P.Applicative<IOF>({
  map_,
  cross_: crossPar_,
  crossWith_: crossWithPar_,
  ap_: apPar_,
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
  andThen_,
  compose_
})
