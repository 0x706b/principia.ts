import type * as E from '../Either'
import type * as HKT from '../HKT'
import type { EvalURI } from '../Modules'
import type { Eval } from './core'

import * as P from '../prelude'
import { ap_, chain_, cross_, crossWith_, defer, map_, now, pure, unit } from './core'

type URI = [HKT.URI<EvalURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({ map_, crossWith_, cross_ })

export const crossFlat_ = P.crossFlatF_<URI>({ map_, cross_, crossWith_ })
export const crossFlat  = P.crossFlatF<URI>({ map_, cross_, crossWith_ })

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)
export const mapN_     = P.mapNF_(SemimonoidalFunctor)
export const mapN      = P.mapNF(SemimonoidalFunctor)

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const apS = P.apSF(Apply)
export const apT = P.apTF(Apply)

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
  unit,
  pure
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})

export const chainRec_: <A, B>(a: A, f: (a: A) => Eval<E.Either<A, B>>) => Eval<B> = P.getChainRec_<URI>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})

export const chainRec: <A, B>(f: (a: A) => Eval<E.Either<A, B>>) => (a: A) => Eval<B> = P.getChainRec<URI>({
  map_,
  crossWith_,
  cross_,
  unit,
  pure,
  chain_
})

export class GenEval<A> {
  readonly _A!: () => A
  constructor(readonly ma: Eval<A>) {}
  *[Symbol.iterator](): Generator<GenEval<A>, A, any> {
    return yield this
  }
}

function _run<T extends GenEval<any>, A>(
  state: IteratorYieldResult<T> | IteratorReturnResult<A>,
  iterator: Generator<T, A, any>
): Eval<A> {
  if (state.done) {
    return now(state.value)
  }
  return chain_(state.value.ma, (val) => {
    const next = iterator.next(val)
    return _run(next, iterator)
  })
}

export function gen<T extends GenEval<any>, A>(f: (i: <A>(_: Eval<A>) => GenEval<A>) => Generator<T, A, any>): Eval<A> {
  return defer(() => {
    const iterator = f((_) => new GenEval(_))
    const state    = iterator.next()
    return _run(state, iterator)
  })
}
