import type { MaybeAsyncEq } from './utils'
import type { FunctionN } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/prelude'

import { isPromise } from './utils'

function AssociativeCompositionLaw<F extends HKT.HKT, TC, C>(
  F: P.Apply<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Low<F, 'K'>,
      HKT.Low<F, 'Q'>,
      HKT.Low<F, 'W'>,
      HKT.Low<F, 'X'>,
      HKT.Low<F, 'I'>,
      HKT.Low<F, 'S'>,
      HKT.Low<F, 'R'>,
      HKT.Low<F, 'E'>,
      C
    >
  >
): <K, Q, W, X, I, S, R, E, A, KB, QB, WB, XB, IB, SB, RB, EB, B, KC, QC, WC, XC, IC, SC, RC, EC>(
  fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>,
  fab: HKT.Kind<F, TC, KB, QB, WB, XB, IB, SB, RB, EB, (a: A) => B>,
  fbc: HKT.Kind<F, TC, KC, QC, WC, XC, IC, SC, RC, EC, (b: B) => C>
) => Promise<boolean>
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Apply<HKT.F<F>>,
  S: MaybeAsyncEq<HKT.FK1<F, C>>
): (fa: HKT.FK1<F, A>, fab: HKT.FK1<F, FunctionN<[A], B>>, fbc: HKT.FK1<F, FunctionN<[B], C>>) => Promise<boolean> {
  return (fa, fab, fbc) => {
    const b = S.equals_(
      F.ap_(
        F.ap_(
          F.map_(fbc, (bc) => (ab: FunctionN<[A], B>) => (a: A) => bc(ab(a))),
          fab
        ),
        fa
      ),
      F.ap_(fbc, F.ap_(fab, fa))
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Apply = {
  associativeComposition: AssociativeCompositionLaw
}
