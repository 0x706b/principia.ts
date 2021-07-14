import type { SemigroupoidMin } from './Semigroupoid'

import * as HKT from './HKT'
import { Semigroupoid } from './Semigroupoid'

export interface Category<F extends HKT.URIS, C = HKT.Auto> extends Semigroupoid<F, C> {
  readonly id: IdFn<F, C>
}

export type CategoryMin<F extends HKT.URIS, C = HKT.Auto> = { readonly id: IdFn<F, C> } & SemigroupoidMin<F, C>

export function Category<F extends HKT.URIS, C = HKT.Auto>(F: CategoryMin<F, C>): Category<F, C> {
  return HKT.instance<Category<F, C>>({
    ...Semigroupoid(F),
    id: F.id
  })
}

export interface IdFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(): HKT.Kind<F, C, K, Q, W, X, A, S, R, E, A>
}
