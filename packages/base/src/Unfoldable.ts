import type * as HKT from './HKT'
import type { Maybe } from './internal/Maybe'

export interface Unfoldable<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly unfold: UnfoldFn<F, C>
}

export interface UnfoldFn<F extends HKT.HKT, C = HKT.None> {
  <
    A,
    B,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    b: B,
    f: (b: B) => Maybe<readonly [A, B]>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}
