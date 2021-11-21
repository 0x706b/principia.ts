import type { MaybeAsyncEq } from './utils'
import type * as Eq from '@principia/base/Eq'
import type { FunctionN } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/prelude'

import * as B from '@principia/base/boolean'
import * as N from '@principia/base/number'
import * as S from '@principia/base/string'
import * as fc from 'fast-check'

import { Bind } from './Chain'
import { isPromise } from './utils'

function LeftIdentityLaw<M extends HKT.HKT, TC, A, K, Q, W, X, I, S, R, E, B>(
  M: P.Monad<M, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      M,
      TC,
      HKT.Low<M, 'K'>,
      HKT.Low<M, 'Q'>,
      HKT.Low<M, 'W'>,
      HKT.Low<M, 'X'>,
      HKT.Low<M, 'I'>,
      HKT.Low<M, 'S'>,
      HKT.Low<M, 'R'>,
      HKT.Low<M, 'E'>,
      B
    >
  >,
  afb: (a: A) => HKT.Kind<M, TC, K, Q, W, X, I, S, R, E, B>
): (a: A) => Promise<boolean>
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.F<M>>,
  S: MaybeAsyncEq<HKT.FK1<M, B>>,
  afb: FunctionN<[A], HKT.FK1<M, B>>
): (a: A) => Promise<boolean>
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.F<M>>,
  S: MaybeAsyncEq<HKT.FK1<M, B>>,
  afb: FunctionN<[A], HKT.FK1<M, B>>
): (a: A) => Promise<boolean> {
  return (a) => {
    const b = S.equals_(
      M.flatten(
        M.map_(
          M.map_(M.pure(undefined), () => a),
          afb
        )
      ),
      afb(a)
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

function RightIdentityLaw<M extends HKT.HKT, TC, K, Q, W, X, I, S, R, E, A>(
  M: P.Monad<M, TC>,
  S: MaybeAsyncEq<HKT.Kind<M, TC, K, Q, W, X, I, S, R, E, A>>
): (a: HKT.Kind<M, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function RightIdentityLaw<M, A>(
  M: P.Monad<HKT.F<M>>,
  S: MaybeAsyncEq<HKT.FK1<M, A>>
): (fa: HKT.FK1<M, A>) => Promise<boolean>
function RightIdentityLaw<M, A>(
  M: P.Monad<HKT.F<M>>,
  S: MaybeAsyncEq<HKT.FK1<M, A>>
): (fa: HKT.FK1<M, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(M.flatten(M.map_(fa, (a) => M.map_(M.pure(undefined), () => a))), fa)
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Monad = {
  ...Bind,
  leftIdentity: LeftIdentityLaw,
  rightIdentity: RightIdentityLaw
}

export function testMonad<M extends HKT.HKT, C>(
  M: P.Monad<M, C>
): <
  K = HKT.Low<M, 'K'>,
  Q = HKT.Low<M, 'Q'>,
  W = HKT.Low<M, 'W'>,
  X = HKT.Low<M, 'X'>,
  I = HKT.Low<M, 'I'>,
  S = HKT.Low<M, 'S'>,
  R = HKT.Low<M, 'R'>,
  E = HKT.Low<M, 'E'>
>(
  liftEq: <A>(S: Eq.Eq<A>) => MaybeAsyncEq<HKT.Kind<M, C, K, Q, W, X, I, S, R, E, A>>
) => void
export function testMonad<M>(M: P.Monad<HKT.F<M>>): (liftEq: <A>(S: Eq.Eq<A>) => Eq.Eq<HKT.FK1<M, A>>) => void {
  return (liftEq) => {
    const Sa = liftEq(S.Eq)
    const Sb = liftEq(N.Eq)
    const Sc = liftEq(B.Eq)

    const arbFa = fc.string().map(M.pure)
    const afb   = (s: string) => M.pure(s.length)
    const afc   = (n: number) => M.pure(n > 2)

    const associativity = fc.asyncProperty(arbFa, Monad.associativity(M, Sc, afb, afc))
    const leftId        = fc.asyncProperty(fc.string(), Monad.leftIdentity(M, Sb, afb))
    const rightId       = fc.asyncProperty(arbFa, Monad.rightIdentity(M, Sa))

    fc.assert(associativity, { verbose: true })
    fc.assert(leftId, { verbose: true })
    fc.assert(rightId, { verbose: true })
  }
}
