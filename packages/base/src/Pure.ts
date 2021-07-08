import type * as HKT from './HKT'

export interface Pure<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly pure: PureFn<F, C>
}

export type PureMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly pure: PureFn<F, C>
}

export interface Pure2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly pure: PureFn2<F, G, CF, CG>
}

export interface PureFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    a: A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}

export interface PureFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<CF, 'N'>,
    K = HKT.Initial<CF, 'K'>,
    Q = HKT.Initial<CF, 'Q'>,
    W = HKT.Initial<CF, 'W'>,
    X = HKT.Initial<CF, 'X'>,
    I = HKT.Initial<CF, 'I'>,
    S = HKT.Initial<CF, 'S'>,
    R = HKT.Initial<CF, 'R'>,
    E = HKT.Initial<CF, 'E'>
  >(
    a: A
  ): HKT.Kind<
    F,
    CF,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    HKT.Kind<
      G,
      CG,
      HKT.Initial<CG, 'N'>,
      HKT.Initial<CG, 'K'>,
      HKT.Initial<CG, 'Q'>,
      HKT.Initial<CG, 'W'>,
      HKT.Initial<CG, 'X'>,
      HKT.Initial<CG, 'I'>,
      HKT.Initial<CG, 'S'>,
      HKT.Initial<CG, 'R'>,
      HKT.Initial<CG, 'E'>,
      A
    >
  >
}
