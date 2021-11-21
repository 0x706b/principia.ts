import type { FunctorMin } from './Functor'

import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Extend<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly extend_: ExtendFn_<F, C>
  readonly extend: ExtendFn<F, C>
}

export type ExtendMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> & {
  readonly extend_: ExtendFn_<F, C>
}

export function Extend<F extends HKT.HKT, C = HKT.None>(F: ExtendMin<F, C>): Extend<F, C>
export function Extend<F>(F: ExtendMin<HKT.F<F>>): Extend<HKT.F<F>> {
  return HKT.instance({
    ...Functor(F),
    extend_: F.extend_,
    extend:
      <K, Q, W, X, I, S, R, E, A, B>(f: (wa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) => B) =>
      (wa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
        F.extend_(wa, f)
  })
}

export interface ExtendFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(f: (wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => B): (
    wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface ExtendFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(
    wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => B
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}
