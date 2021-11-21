import type { MaybeAsyncEq } from './utils'
import type * as Eq from '@principia/base/Eq'
import type { FunctionN } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/prelude'

import * as N from '@principia/base/number'
import * as S from '@principia/base/string'
import * as fc from 'fast-check'

import { isPromise } from './utils'

function CompositionLaw<F extends HKT.HKT, TC, K, Q, W, X, I, S, R, E, A, B, C>(
  F: P.Functor<F, TC>,
  S: MaybeAsyncEq<HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, C>>,
  ab: FunctionN<[A], B>,
  bc: FunctionN<[B], C>
): (fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function CompositionLaw<F, A, B, C>(
  F: P.Functor<HKT.F<F>>,
  S: MaybeAsyncEq<HKT.FK1<F, C>>,
  ab: FunctionN<[A], B>,
  bc: FunctionN<[B], C>
): (fa: HKT.FK1<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.map_(fa, (a) => bc(ab(a))),
      F.map_(F.map_(fa, ab), bc)
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

function IdentityLaw<F extends HKT.HKT, TC, K, Q, W, X, I, S, R, E, A>(
  F: P.Functor<F, TC>,
  S: MaybeAsyncEq<HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>>
): (fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function IdentityLaw<F, A>(
  F: P.Functor<HKT.F<F>>,
  S: MaybeAsyncEq<HKT.FK1<F, A>>
): (fa: HKT.FK1<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.map_(fa, (a) => a),
      fa
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Functor = {
  identity: IdentityLaw,
  composition: CompositionLaw
}

export function testFunctorComposition<F extends HKT.HKT, C>(
  F: P.Functor<F, C>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
    HKT.Kind<
      F,
      C,
      HKT.Low<F, 'K'>,
      HKT.Low<F, 'Q'>,
      HKT.Low<F, 'W'>,
      HKT.Low<F, 'X'>,
      HKT.Low<F, 'I'>,
      HKT.Low<F, 'S'>,
      HKT.Low<F, 'R'>,
      HKT.Low<F, 'E'>,
      A
    >
  >,
  liftEq: <A>(
    Sa: Eq.Eq<A>
  ) => MaybeAsyncEq<
    HKT.Kind<
      F,
      C,
      HKT.Low<F, 'K'>,
      HKT.Low<F, 'Q'>,
      HKT.Low<F, 'W'>,
      HKT.Low<F, 'X'>,
      HKT.Low<F, 'I'>,
      HKT.Low<F, 'S'>,
      HKT.Low<F, 'R'>,
      HKT.Low<F, 'E'>,
      A
    >
  >
) => void {
  return (lift, liftEq) => {
    const arb = lift(fc.string())
    const Sa  = liftEq(S.Eq)
    const Sc  = liftEq(N.Eq)
    const ab  = (s: string): number | null | undefined => (s.length === 1 ? undefined : s.length === 2 ? null : s.length)
    const bc  = (n: number | null | undefined): number => (n === undefined ? 1 : n === null ? 2 : n * 2)

    const composition = fc.asyncProperty(arb, Functor.composition(F, Sc, ab, bc))
    const identity    = fc.asyncProperty(arb, Functor.identity(F, Sa))

    fc.assert(identity, { seed: -525356605, path: '26:2:2', endOnFailure: true, verbose: true })
    fc.assert(composition, { seed: -525356605, path: '26:2:2', endOnFailure: true, verbose: true })
  }
}
