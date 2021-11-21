import type * as HKT from './HKT'

export interface Swap<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly swap: SwapFn<F, C>
}

export interface SwapFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A>(pab: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): HKT.Kind<F, C, K, Q, W, X, I, S, R, A, E>
}
