import type { Monoid } from './Monoid'
import type { MonoidalFunctor } from './MonoidalFunctor'
import type { SemigroupKind } from './SemigroupKind'

import * as HKT from './HKT'
import { liftSemigroup } from './SemigroupKind'

export interface MonoidKind<A, F extends HKT.HKT, C = HKT.None> extends SemigroupKind<A, F, C> {
  readonly nat: HKT.Kind<
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
}

export function liftMonoid<F extends HKT.HKT, C = HKT.None>(
  F: MonoidalFunctor<F, C>
): <A>(M: Monoid<A>) => MonoidKind<A, F, C> {
  return <A>(M: Monoid<A>) => {
    const skfm = liftSemigroup(F)(M)
    return HKT.instance<MonoidKind<A, F, C>>({
      ...skfm,
      nat: F.map_(F.unit(), () => M.nat)
    })
  }
}
