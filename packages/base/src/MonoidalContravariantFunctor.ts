import type { ContravariantFunctor } from './ContravariantFunctor'
import type * as HKT from './HKT'
import type { MonoidalFunctor } from './MonoidalFunctor'

export interface MonoidalContravariantFunctor<F extends HKT.HKT, C = HKT.None>
  extends ContravariantFunctor<F, C>,
    MonoidalFunctor<F, C> {}
