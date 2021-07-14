import type * as HKT from './HKT'

export interface Nil<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly nil: NilFn<F, TC>
}

export type NilMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly nil: NilFn<F, C>
}

export interface NilFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, never>
}
