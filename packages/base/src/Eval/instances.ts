import type * as E from '../Either'
import type * as HKT from '../HKT'
import type { Eval } from './core'

import { identity } from '../function'
import * as P from '../prelude'
import { ap_, chain_, cross_, crossWith_, defer, map_, now, pure, unit } from './core'

export interface EvalF extends HKT.HKT {
  readonly type: Eval<this['A']>
  readonly variance: {
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<EvalF>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<EvalF>({ map_, crossWith_, cross_ })

export const Apply = P.Apply<EvalF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const apS = P.apSF(Apply)
export const apT = P.apTF(Apply)

export const sequenceS = P.sequenceSF(Apply)

export const mapN_ = P.mapNF_(Apply)

/**
 * @dataFirst mapN_
 */
export const mapN = P.mapNF(Apply)

export const MonoidalFunctor = P.MonoidalFunctor<EvalF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<EvalF>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure
})

export const Monad = P.Monad<EvalF>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})

export const chainRec_: <A, B>(a: A, f: (a: A) => Eval<E.Either<A, B>>) => Eval<B> = P.getChainRec_<EvalF>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})

/**
 * @dataFirst chainRec_
 */
export const chainRec: <A, B>(f: (a: A) => Eval<E.Either<A, B>>) => (a: A) => Eval<B> = P.getChainRec<EvalF>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})
