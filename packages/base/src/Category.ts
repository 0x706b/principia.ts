import type { SemigroupoidMin } from './Semigroupoid'

import * as HKT from './HKT'
import { Semigroupoid } from './Semigroupoid'

export interface Category<F extends HKT.HKT, C = HKT.None> extends Semigroupoid<F, C> {
  readonly id: IdFn<F, C>
}

export type CategoryMin<F extends HKT.HKT, C = HKT.None> = { readonly id: IdFn<F, C> } & SemigroupoidMin<F, C>

export function Category<F extends HKT.HKT, C = HKT.None>(F: CategoryMin<F, C>): Category<F, C> {
  return HKT.instance<Category<F, C>>({
    ...Semigroupoid(F),
    id: F.id
  })
}

export interface IdFn<F extends HKT.HKT, C = HKT.None> {
  <
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(): HKT.Kind<F, C, K, Q, W, X, A, S, R, E, A>
}
