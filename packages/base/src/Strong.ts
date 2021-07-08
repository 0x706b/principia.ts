import type { Category } from './Category'
import type * as HKT from './HKT'
import type { Profunctor } from './Profunctor'

import { identity, pipe } from './function'
import { tuple } from './tuple'

export interface Strong<F extends HKT.URIS, C = HKT.Auto> extends Profunctor<F, C> {
  readonly first: FirstFn<F, C>
  readonly second: SecondFn<F, C>
}

export interface FirstFn<F extends HKT.URIS, TC = HKT.Auto> {
  <C>(): <N extends string, K, Q, W, X, I, S, R, A, B>(
    pab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, B>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, readonly [A, C], readonly [B, C]>
}

export interface SecondFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A>(): <N extends string, K, Q, W, X, I, S, R, B, C>(
    pbc: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, B, C>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, readonly [A, B], readonly [A, C]>
}

export function splitF<F extends HKT.URIS, TC = HKT.Auto>(S: Strong<F, TC>, C: Category<F, TC>) {
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
    readonly [A, C],
    readonly [B, D]
  > => pipe(S.first<C>()(pab), C.compose(S.second<D>()(pcd)))
}

export function fanOutF<F extends HKT.URIS, TC = HKT.Auto>(S: Strong<F, TC>, C: Category<F, TC>) {
  return <N extends string, K, Q, W, X, I, S, R, A, B, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, C>(
    pab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, B>,
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
    A,
    readonly [B, C]
  > =>
    pipe(
      C.id<A>(),
      S.dimap(identity, (a) => tuple(a, a)),
      C.compose(splitF(S, C)(pab, pbc))
    )
}
