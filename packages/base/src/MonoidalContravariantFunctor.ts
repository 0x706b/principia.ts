import type { ContravariantFunctor } from './ContravariantFunctor'
import type * as HKT from './HKT'
import type { MonoidalFunctor } from './MonoidalFunctor'

export interface MonoidalContravariantFunctor<F extends HKT.URIS, C = HKT.Auto>
  extends ContravariantFunctor<F, C>,
    MonoidalFunctor<F, C> {}
