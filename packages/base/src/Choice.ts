import type { Category } from './Category'
import type * as HKT from './HKT'
import type { Either } from './internal/Either'
import type { Profunctor } from './Profunctor'

import { identity, pipe } from './function'

export interface Choice<F extends HKT.URIS, C = HKT.Auto> extends Profunctor<F, C> {
  readonly left: LeftFn<F, C>
  readonly right: RightFn<F, C>
}

export interface LeftFn<F extends HKT.URIS, TC = HKT.Auto> {
  <C>(): <N extends string, K, Q, W, X, I, S, R, A, B>(
    pab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, B>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, Either<A, C>, Either<B, C>>
}

export interface RightFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A>(): <N extends string, K, Q, W, X, I, S, R, B, C>(
    pbc: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, B, C>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, Either<A, B>, Either<A, C>>
}

export function splitF<F extends HKT.URIS, TC = HKT.Auto>(P: Choice<F, TC>, C: Category<F, TC>) {
  return <N extends string, K, Q, W, X, I, S, R, A, B, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, C, D>(
    pab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, B>,
    pcd: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N1, N>,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      HKT.Intro<TC, 'I', I1, I>,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      C,
      D
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    Either<A, C>,
    Either<B, D>
  > => pipe(P.left<C>()(pab), C.compose(P.right<D>()(pcd)))
}

export function fanInF<F extends HKT.URIS, TC = HKT.Auto>(P: Choice<F, TC>, C: Category<F, TC>) {
  return <N extends string, K, Q, W, X, I, S, R, A, B, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, C>(
    pac: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, C>,
    pbc: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N, N1>,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      HKT.Intro<TC, 'I', I, I1>,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      B,
      C
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    Either<A, B>,
    C
  > =>
    pipe(
      splitF(P, C)(pac, pbc),
      C.compose(
        pipe(
          C.id<C>(),
          P.dimap((cc: Either<C, C>) => (cc._tag === 'Left' ? cc.left : cc.right), identity)
        )
      )
    )
}
