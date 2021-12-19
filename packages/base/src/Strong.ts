import type { Category } from './Category'
import type * as HKT from './HKT'
import type { ProfunctorCategory } from './ProfunctorCategory'

import { identity, pipe } from './function'
import { tuple } from './tuple/core'

export interface Strong<F extends HKT.HKT, C = HKT.None> extends ProfunctorCategory<F, C> {
  readonly first: FirstFn<F, C>
  readonly second: SecondFn<F, C>
}

export interface FirstFn<F extends HKT.HKT, TC = HKT.None> {
  <C>(): <K, Q, W, X, S, R, E, A, B>(
    pab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>
  ) => HKT.Kind<F, TC, K, Q, W, X, readonly [A, C], S, R, E, readonly [B, C]>
}

export interface SecondFn<F extends HKT.HKT, TC = HKT.None> {
  <A>(): <K, Q, W, X, S, R, E, B, C>(
    pbc: HKT.Kind<F, TC, K, Q, W, X, B, S, R, E, C>
  ) => HKT.Kind<F, TC, K, Q, W, X, readonly [A, B], S, R, E, readonly [A, C]>
}

export interface SplitF<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, E, S, R, A, B, K1, Q1, W1, X1, S1, R1, E1, C, D>(
    pab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>,
    pcd: HKT.Kind<
      F,
      TC,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      C,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1>,
      HKT.Intro<F, 'E', E, E1>,
      D
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    readonly [A, C],
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    readonly [B, D]
  >
}

export function splitF<F extends HKT.HKT, TC = HKT.None>(S: Strong<F, TC>, C: Category<F, TC>): SplitF<F, TC>
export function splitF<F>(S: Strong<HKT.F<F>>, C: Category<HKT.F<F>>): SplitF<HKT.F<F>> {
  return <K, Q, W, X, S, R, E, A, B, C, D>(
    pab: HKT.FK<F, K, Q, W, X, A, S, R, E, B>,
    pcd: HKT.FK<F, K, Q, W, X, C, S, R, E, D>
  ) => C.andThen_(S.first<C>()(pab), S.second<B>()(pcd))
}

export interface FanOutF<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, S, R, E, A, B, K1, Q1, W1, X1, S1, R1, E1, C>(
    pab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>,
    pbc: HKT.Kind<
      F,
      TC,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      A,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1>,
      HKT.Intro<F, 'E', E, E1>,
      C
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    A,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    readonly [B, C]
  >
}

export function fanOutF<F extends HKT.HKT, TC = HKT.None>(S: Strong<F, TC>, C: Category<F, TC>): FanOutF<F, TC>
export function fanOutF<F>(S: Strong<HKT.F<F>>, C: Category<HKT.F<F>>): FanOutF<HKT.F<F>> {
  return <K, Q, W, X, S, R, E, A, B, C>(
    pab: HKT.FK<F, K, Q, W, X, A, S, R, E, B>,
    pbc: HKT.FK<F, K, Q, W, X, A, S, R, E, C>
  ): HKT.FK<F, K, Q, W, X, A, S, R, E, readonly [B, C]> => {
    const splitSC = splitF(S, C)
    return pipe(
      C.id<A>(),
      S.map((a: A) => tuple(a, a)),
      C.andThen(splitSC(pab, pbc))
    )
  }
}
