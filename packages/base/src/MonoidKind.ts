import type { Monoid } from './Monoid'
import type { MonoidalFunctor } from './MonoidalFunctor'
import type { SemigroupKind } from './SemigroupKind'

import * as HKT from './HKT'
import { liftSemigroup } from './SemigroupKind'

export interface MonoidKind<A, F extends HKT.URIS, C = HKT.Auto> extends SemigroupKind<A, F, C> {
  readonly nat: HKT.Kind<
    F,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    HKT.Initial<C, 'E'>,
    A
  >
}

export function liftMonoid<F extends HKT.URIS, C = HKT.Auto>(
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
