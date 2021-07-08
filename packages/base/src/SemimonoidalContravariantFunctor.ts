import type { ContravariantFunctor } from './ContravariantFunctor'
import type * as HKT from './HKT'
import type { Semimonoidal } from './Semimonoidal'

export interface SemimonoidalContravariantFunctor<F extends HKT.URIS, C = HKT.Auto>
  extends ContravariantFunctor<F, C>,
    Semimonoidal<F, C> {}
