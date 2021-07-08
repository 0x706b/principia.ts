import type * as HKT from './HKT'
import type { Semigroupoid } from './Semigroupoid'

export interface Category<F extends HKT.URIS, C = HKT.Auto> extends Semigroupoid<F, C> {
  readonly id: IdFn<F, C>
}

export interface IdFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(): HKT.Kind<F, C, N, K, Q, W, X, A, S, R, E, A>
}
