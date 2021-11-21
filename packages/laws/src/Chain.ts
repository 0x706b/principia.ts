import type { MaybeAsyncEq } from './utils'
import type { FunctionN } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/prelude'

import { isPromise } from './utils'

function AssociativeCompositionLaw<
  F extends HKT.HKT,
  TC,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A,
  KB,
  QB,
  WB,
  XB,
  IB,
  SB,
  RB,
  EB,
  B,
  KC,
  QC,
  WC,
  XC,
  IC,
  SC,
  RC,
  EC,
  C
>(
  F: P.Chain<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Mix<F, 'K', [K, KB, KC]>,
      HKT.Mix<F, 'Q', [Q, QB, QC]>,
      HKT.Mix<F, 'W', [W, WB, WC]>,
      HKT.Mix<F, 'X', [X, XB, XC]>,
      HKT.Mix<F, 'I', [I, IB, IC]>,
      HKT.Mix<F, 'S', [S, SB, SC]>,
      HKT.Mix<F, 'R', [R, RB, RC]>,
      HKT.Mix<F, 'E', [E, EB, EC]>,
      C
    >
  >,
  afb: (a: A) => HKT.Kind<F, TC, KB, QB, WB, XB, IB, SB, RB, EB, B>,
  bfc: (b: B) => HKT.Kind<F, TC, KC, QC, WC, XC, IC, SC, RC, EC, C>
): (fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Chain<HKT.F<F>>,
  S: MaybeAsyncEq<HKT.FK1<F, C>>,
  afb: FunctionN<[A], HKT.FK1<F, B>>,
  bfc: FunctionN<[B], HKT.FK1<F, C>>
): (fa: HKT.FK1<F, A>) => Promise<boolean>
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Chain<HKT.F<F>>,
  S: MaybeAsyncEq<HKT.FK1<F, C>>,
  afb: FunctionN<[A], HKT.FK1<F, B>>,
  bfc: FunctionN<[B], HKT.FK1<F, C>>
): (fa: HKT.FK1<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.chain_(F.chain_(fa, afb), bfc),
      F.chain_(fa, (a) => F.chain_(afb(a), bfc))
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Bind = {
  associativity: AssociativeCompositionLaw
}
