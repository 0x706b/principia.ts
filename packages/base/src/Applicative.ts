import type { Apply2, ApplyMin } from './Apply'
import type { MonoidalFunctorMin } from './MonoidalFunctor'
import type { Pure, Pure2, PureFn, PureMin } from './Pure'
import type { Unit, Unit2, UnitMin } from './Unit'

import { Apply, getApplyComposition } from './Apply'
import { flow } from './function'
import * as HKT from './HKT'
import { getMonoidalFunctorComposition } from './MonoidalFunctor'

/**
 * A lax monoidal endofunctor
 *
 * `Applicative` is isomorphic to `MonoidalFunctor`
 */
export interface Applicative<F extends HKT.URIS, C = HKT.Auto> extends Apply<F, C>, Unit<F, C>, Pure<F, C> {}

export type ApplicativeMin<F extends HKT.URIS, C = HKT.Auto> =
  | (ApplyMin<F, C> & (PureMin<F, C> | UnitMin<F, C>))
  | (ApplyMin<F, C> & PureMin<F, C> & UnitMin<F, C>)
  | (MonoidalFunctorMin<F, C> & PureMin<F, C>)
  | MonoidalFunctorMin<F, C>

export function Applicative<F extends HKT.URIS, C = HKT.Auto>(F: ApplicativeMin<F, C>): Applicative<F, C> {
  const ApplyF = Apply(F)
  if ('pure' in F) {
    return HKT.instance<Applicative<F, C>>({
      ...ApplyF,
      pure: F.pure,
      unit: () => F.pure(undefined)
    })
  } else {
    return HKT.instance<Applicative<F, C>>({
      ...ApplyF,
      pure: (a) => F.map_(F.unit(), () => a),
      unit: F.unit
    })
  }
}

export interface Applicative2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends Apply2<F, G, CF, CG>,
    Unit2<F, G, CF, CG>,
    Pure2<F, G, CF, CG> {}

export function getApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Applicative<F, CF>,
  G: Applicative<G, CG>
): Applicative2<F, G, CF, CG> {
  return HKT.instance<Applicative2<F, G, CF, CG>>({
    ...getApplyComposition(F, G),
    ...getMonoidalFunctorComposition(F, G),
    pure: flow(G.pure, F.pure)
  })
}

export function pureF<F extends HKT.URIS, C = HKT.Auto>(F: ApplicativeMin<F, C>): PureFn<F, C> {
  if ('pure' in F) {
    return F.pure
  } else {
    return (a) => F.map_(F.unit(), () => a)
  }
}
