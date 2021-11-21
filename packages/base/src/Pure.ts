import type * as H from './HKT'

export interface Pure<F extends H.HKT, C = H.None> extends H.Typeclass<F, C> {
  readonly pure: PureFn<F, C>
}

export type PureMin<F extends H.HKT, C = H.None> = {
  readonly pure: PureFn<F, C>
}

export interface Pure2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> extends H.Typeclass2<F, G, CF, CG> {
  readonly pure: PureFn2<F, G, CF, CG>
}

export interface PureFn<F extends H.HKT, C = H.None> {
  <
    A,
    K = H.Low<F, 'K'>,
    Q = H.Low<F, 'Q'>,
    W = H.Low<F, 'W'>,
    X = H.Low<F, 'X'>,
    I = H.Low<F, 'I'>,
    S = H.Low<F, 'S'>,
    R = H.Low<F, 'R'>,
    E = H.Low<F, 'E'>
  >(
    a: A
  ): H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface PureFn2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <
    A,
    K = H.Low<F, 'K'>,
    Q = H.Low<F, 'Q'>,
    W = H.Low<F, 'W'>,
    X = H.Low<F, 'X'>,
    I = H.Low<F, 'I'>,
    S = H.Low<F, 'S'>,
    R = H.Low<F, 'R'>,
    E = H.Low<F, 'E'>
  >(
    a: A
  ): H.Kind<
    F,
    CF,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    H.Kind<
      G,
      CG,
      H.Low<G, 'K'>,
      H.Low<G, 'Q'>,
      H.Low<G, 'W'>,
      H.Low<G, 'X'>,
      H.Low<G, 'I'>,
      H.Low<G, 'S'>,
      H.Low<G, 'R'>,
      H.Low<G, 'E'>,
      A
    >
  >
}
