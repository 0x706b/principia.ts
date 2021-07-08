import type { FunctorMin } from './Functor'

import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Extend<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly extend_: ExtendFn_<F, C>
  readonly extend: ExtendFn<F, C>
}

export type ExtendMin<F extends HKT.URIS, C = HKT.Auto> = FunctorMin<F, C> & {
  readonly extend_: ExtendFn_<F, C>
}

export function Extend<F extends HKT.URIS, C = HKT.Auto>(F: ExtendMin<F, C>): Extend<F, C> {
  return HKT.instance({
    ...Functor(F),
    extend_: F.extend_,
    extend: (f) => (wa) => F.extend_(wa, f)
  })
}

export interface ExtendFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B): (
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface ExtendFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}
