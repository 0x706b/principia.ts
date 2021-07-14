import type { MaybeAsyncEq } from './utils'
import type * as Eq from '@principia/base/Eq'
import type * as HKT from '@principia/base/HKT'
import type { MonoidalFunctor } from '@principia/base/prelude'

import { andThen_, tuple, tupleFlip, tupleUnit } from '@principia/base/Equivalence'
import * as N from '@principia/base/number'
import * as S from '@principia/base/string'
import * as fc from 'fast-check'

import { isPromise } from './utils'

function LeftIdentityLaw<F extends HKT.URIS, TC, A>(
  F: MonoidalFunctor<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >
): <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function LeftIdentityLaw<F, A>(
  F: MonoidalFunctor<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, A>>
): (fa: HKT.HKT<F, A>) => Promise<boolean> {
  const equiv = andThen_(tupleFlip<void, A>(), tupleUnit())
  return (fa) => {
    const left  = F.cross_(F.unit(), fa)
    const right = fa
    const left2 = F.map_(left, equiv.to)
    const b     = S.equals_(left2, right)
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

function RightIdentityLaw<F extends HKT.URIS, TC, A>(
  F: MonoidalFunctor<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >
): <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function RightIdentityLaw<F, A>(
  F: MonoidalFunctor<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, A>>
): (fa: HKT.HKT<F, A>) => Promise<boolean> {
  const equiv = tupleUnit<A>()
  return (fa) => {
    const left  = F.cross_(fa, F.unit())
    const right = fa
    const left2 = F.map_(left, equiv.to)
    const b     = S.equals_(left2, right)
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

function AssociativityLaw<F extends HKT.URIS, TC, A, B, C>(
  F: MonoidalFunctor<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      readonly [readonly [A, B], C]
    >
  >
): <K, Q, W, X, I, S, R, E, A, KB, QB, WB, XB, IB, SB, RB, EB, B, KC, QC, WC, XC, IC, SC, RC, EC, C>(
  fs: [
    HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, TC, KB, QB, WB, XB, IB, SB, RB, EB, B>,
    HKT.Kind<F, TC, KC, QC, WC, XC, IC, SC, RC, EC, C>
  ]
) => Promise<boolean>
function AssociativityLaw<F, A, B, C>(
  F: MonoidalFunctor<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, readonly [readonly [A, B], C]>>
): (fs: [HKT.HKT<F, A>, HKT.HKT<F, B>, HKT.HKT<F, C>]) => Promise<boolean> {
  const equiv = tuple<A, B, C>()
  return ([fa, fb, fc]) => {
    const left  = F.cross_(fa, F.cross_(fb, fc))
    const right = F.cross_(F.cross_(fa, fb), fc)
    const left2 = F.map_(left, equiv.to)
    const b     = S.equals_(left2, right)
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const ApplicativeLaws = {
  associativity: AssociativityLaw,
  leftIdentity: LeftIdentityLaw,
  rightIdentity: RightIdentityLaw
}

export function testMonoidalAssociativity<F extends HKT.URIS, TC>(
  F: MonoidalFunctor<F, TC>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >,
  liftEqs: <A, B, C>(
    Sa: Eq.Eq<A>,
    Sb: Eq.Eq<B>,
    Sc: Eq.Eq<C>
  ) => MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      readonly [readonly [A, B], C]
    >
  >
) => void {
  return (lift, liftEqs) => {
    const arbString = lift(fc.string())
    const arbNumber = lift(fc.double())
    const Sabc      = liftEqs(S.Eq, N.Eq, N.Eq)

    const associativity = fc.asyncProperty(
      fc.tuple(arbString, arbNumber, arbNumber),
      ApplicativeLaws.associativity(F, Sabc)
    )

    fc.assert(associativity, {
      seed: -525356605,
      path: '26:2:2',
      endOnFailure: true,
      verbose: true
    })
  }
}
