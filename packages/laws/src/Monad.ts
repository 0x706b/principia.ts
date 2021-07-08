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

function LeftIdentityLaw<M extends HKT.URIS, TC, A, N extends string, K, Q, W, X, I, S, R, E, B>(
  M: P.Monad<M, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      M,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      B
    >
  >,
  afb: (a: A) => HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, B>
): (a: A) => Promise<boolean>
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.UHKT<M>>,
  S: MaybeAsyncEq<HKT.HKT<M, B>>,
  afb: FunctionN<[A], HKT.HKT<M, B>>
): (a: A) => Promise<boolean>
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.UHKT<M>>,
  S: MaybeAsyncEq<HKT.HKT<M, B>>,
  afb: FunctionN<[A], HKT.HKT<M, B>>
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

function RightIdentityLaw<M extends HKT.URIS, TC, N extends string, K, Q, W, X, I, S, R, E, A>(
  M: P.Monad<M, TC>,
  S: MaybeAsyncEq<HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>>
): (a: HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function RightIdentityLaw<M, A>(
  M: P.Monad<HKT.UHKT<M>>,
  S: MaybeAsyncEq<HKT.HKT<M, A>>
): (fa: HKT.HKT<M, A>) => Promise<boolean>
function RightIdentityLaw<M, A>(
  M: P.Monad<HKT.UHKT<M>>,
  S: MaybeAsyncEq<HKT.HKT<M, A>>
): (fa: HKT.HKT<M, A>) => Promise<boolean> {
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

export function testMonad<M extends HKT.URIS, C>(
  M: P.Monad<M, C>
): <
  N extends string = HKT.Initial<C, 'N'>,
  K = HKT.Initial<C, 'K'>,
  Q = HKT.Initial<C, 'Q'>,
  W = HKT.Initial<C, 'W'>,
  X = HKT.Initial<C, 'X'>,
  I = HKT.Initial<C, 'I'>,
  S = HKT.Initial<C, 'S'>,
  R = HKT.Initial<C, 'R'>,
  E = HKT.Initial<C, 'E'>
>(
  liftEq: <A>(S: Eq.Eq<A>) => MaybeAsyncEq<HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, A>>
) => void
export function testMonad<M>(M: P.Monad<HKT.UHKT<M>>): (liftEq: <A>(S: Eq.Eq<A>) => Eq.Eq<HKT.HKT<M, A>>) => void {
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
