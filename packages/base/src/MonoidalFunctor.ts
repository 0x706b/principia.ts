import type { SemimonoidalFunctor2, SemimonoidalFunctorMin } from './SemimonoidalFunctor'
import type { Unit, Unit2, UnitMin } from './Unit'

import { flow, pipe } from './function'
import * as HKT from './HKT'
import { getSemimonoidalFunctorComposition, SemimonoidalFunctor } from './SemimonoidalFunctor'

export interface MonoidalFunctor<F extends HKT.HKT, C = HKT.None> extends SemimonoidalFunctor<F, C>, Unit<F, C> {}

export type MonoidalFunctorMin<F extends HKT.HKT, C = HKT.None> = SemimonoidalFunctorMin<F, C> & UnitMin<F, C>

export function MonoidalFunctor<F extends HKT.HKT, C = HKT.None>(F: MonoidalFunctorMin<F, C>): MonoidalFunctor<F, C> {
  return HKT.instance<MonoidalFunctor<F, C>>({
    ...SemimonoidalFunctor(F),
    unit: F.unit
  })
}

export interface MonoidalFunctor2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends SemimonoidalFunctor2<F, G, CF, CG>,
    Unit2<F, G, CF, CG> {}

export function getMonoidalFunctorComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: MonoidalFunctor<F, CF>,
  G: MonoidalFunctor<G, CG>
): MonoidalFunctor2<F, G, CF, CG> {
  return HKT.instance({
    ...getSemimonoidalFunctorComposition(F, G),
    unit: () =>
      pipe(
        F.unit(),
        F.map(() => G.unit())
      )
  })
}
