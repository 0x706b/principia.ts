// tracing: off

import type * as HKT from '../../HKT'
import type { IOCategoryURI, IOURI } from '../../Modules'
import type { IO, V } from './core'

import * as E from '../../Either'
import { mapNF, sequenceSF } from '../../prelude'
import * as P from '../../prelude'
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

export type URI = [HKT.URI<IOURI>]

export type CURI = [HKT.URI<IOCategoryURI>]

export type CV = HKT.V<'I', '-'> & HKT.V<'E', '+'>

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

export const SemimonoidalFunctorPar = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const mapN    = mapNF(SemimonoidalFunctor)
export const mapNPar = mapNF(SemimonoidalFunctorPar)

export const sequenceS    = sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = sequenceSF(SemimonoidalFunctorPar)

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

export const chainRec_: <A, R, E, B>(a: A, f: (a: A) => IO<R, E, E.Either<A, B>>) => IO<R, E, B> = P.getChainRec_<
  URI,
  V
>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const chainRec: <A, R, E, B>(f: (a: A) => IO<R, E, E.Either<A, B>>) => (a: A) => IO<R, E, B> = P.getChainRec<
  URI,
  V
>({
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

export const Category = P.Category<CURI, CV>({
  id,
  andThen_,
  compose_
})
