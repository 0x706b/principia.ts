import type * as HKT from './HKT'

export interface Defer<F extends HKT.URIS, C = HKT.Auto> {
  readonly defer: DeferFn<F, C>
}

export interface DeferFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A>(fa: () => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >
}
