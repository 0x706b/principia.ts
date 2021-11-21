import type { Category } from './Category'
import type * as HKT from './HKT'
import type { Either } from './internal/Either'
import type { ProfunctorCategory } from './ProfunctorCategory'

import { pipe } from './function'

export interface Choice<F extends HKT.HKT, C = HKT.None> extends ProfunctorCategory<F, C> {
  readonly left: LeftFn<F, C>
  readonly right: RightFn<F, C>
}

export interface LeftFn<F extends HKT.HKT, TC = HKT.None> {
  <C>(): <K, Q, W, X, S, R, E, A, B>(
    pab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>
  ) => HKT.Kind<F, TC, K, Q, W, X, Either<A, C>, S, R, E, Either<B, C>>
}

export interface RightFn<F extends HKT.HKT, TC = HKT.None> {
  <A>(): <K, Q, W, X, S, R, E, B, C>(
    pbc: HKT.Kind<F, TC, K, Q, W, X, B, S, R, E, C>
  ) => HKT.Kind<F, TC, K, Q, W, X, Either<A, B>, S, R, E, Either<A, C>>
}

export interface SplitFn<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, S, R, E, A, B, K1, Q1, W1, X1, S1, R1, E1, C, D>(
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
    Either<A, C>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    Either<B, D>
  >
}

export function splitF<F extends HKT.HKT, TC = HKT.None>(P: Choice<F, TC>, C: Category<F, TC>): SplitFn<F, TC>
export function splitF<F>(P: Choice<HKT.F<F>>, C: Category<HKT.F<F>>): SplitFn<HKT.F<F>> {
  return <K, Q, W, X, S, R, E, A, B, C, D>(
    pab: HKT.FK<F, K, Q, W, X, A, S, R, E, B>,
    pcd: HKT.FK<F, K, Q, W, X, C, S, R, E, D>
  ): HKT.FK<F, K, Q, W, X, Either<A, C>, S, R, E, Either<B, D>> => pipe(P.left<C>()(pab), C.andThen(P.right<B>()(pcd)))
}

export interface FanInFn<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, S, R, E, A, B, K1, Q1, W1, X1, S1, R1, E1, C>(
    pac: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, C>,
    pbc: HKT.Kind<
      F,
      TC,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      B,
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
    Either<A, B>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    C
  >
}

export function fanInF<F extends HKT.HKT, TC = HKT.None>(P: Choice<F, TC>, C: Category<F, TC>): FanInFn<F, TC>
export function fanInF<F>(P: Choice<HKT.F<F>>, C: Category<HKT.F<F>>): FanInFn<HKT.F<F>> {
  const splitPC = splitF(P, C)
  return <K, Q, W, X, S, R, E, A, B, C>(
    pac: HKT.FK<F, K, Q, W, X, A, S, R, E, C>,
    pbc: HKT.FK<F, K, Q, W, X, B, S, R, E, C>
  ): HKT.FK<F, K, Q, W, X, Either<A, B>, S, R, E, C> =>
    pipe(
      splitPC(pac, pbc),
      C.andThen(
        pipe(
          C.id<C>(),
          P.lmap((cc) => (cc._tag === 'Left' ? cc.left : cc.right))
        )
      )
    )
}
