import type * as HKT from './HKT'

export interface Swap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly swap: SwapFn<F, C>
}

export interface SwapFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(pab: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    A,
    E
  >
}
