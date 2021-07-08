import type { ExtendMin } from './Extend'

import { Extend } from './Extend'
import * as HKT from './HKT'

export interface Comonad<F extends HKT.URIS, C = HKT.Auto> extends Extend<F, C> {
  readonly extract: ExtractFn<F, C>
}

export type ComonadMin<F extends HKT.URIS, C = HKT.Auto> = ExtendMin<F, C> & {
  readonly extract: ExtractFn<F, C>
}

export function Comonad<F extends HKT.URIS, C = HKT.Auto>(F: ComonadMin<F, C>): Comonad<F, C> {
  return HKT.instance({
    ...Extend(F),
    extract: F.extract
  })
}

export interface ExtractFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): A
}

export interface DuplicateFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
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
    E,
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  >
}
