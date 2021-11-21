import type * as HKT from './HKT'

export interface Nil<F extends HKT.HKT, TC = HKT.None> extends HKT.Typeclass<F, TC> {
  readonly nil: NilFn<F, TC>
}

export type NilMin<F extends HKT.HKT, C = HKT.None> = {
  readonly nil: NilFn<F, C>
}

export interface NilFn<F extends HKT.HKT, TC = HKT.None> {
  <
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, never>
}
