import type * as HKT from './HKT'
import type { Maybe } from './internal/Maybe'

export interface Unfoldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly unfold: UnfoldFn<F, C>
}

export interface UnfoldFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    B,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    b: B,
    f: (b: B) => Maybe<readonly [A, B]>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}
