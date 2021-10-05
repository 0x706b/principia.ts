import type { MaybeURI } from './Maybe'

import * as HKT from './HKT'
import * as Maybe from './Maybe'
import * as P from './prelude'

export function getMaybeT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): MaybeT<M, C>
export function getMaybeT<M>(M: P.Monad<HKT.UHKT<M>, HKT.Auto>): MaybeT<HKT.UHKT<M>> {
  const chain_: MaybeT<HKT.UHKT<M>>['chain_'] = (ma, f) =>
    M.chain_(
      ma,
      Maybe.match(() => M.pure(Maybe.nothing()), f)
    )

  return HKT.instance<MaybeT<HKT.UHKT<M>>>({
    ...P.Monad({ ...P.getApplicativeComposition(M, Maybe.Applicative), chain_ }),
    nothing: () => M.pure(Maybe.nothing()),
    just: (a) => M.pure(Maybe.just(a)),
    justM: (ma) => M.map_(ma, Maybe.just),
    matchOption_: (ma, onNothing, onJust) => M.map_(ma, Maybe.match(onNothing, onJust)),
    matchOption: (onNothing, onJust) => M.map(Maybe.match(onNothing, onJust)),
    matchOptionM_: <A1, A2, A3>(
      ma: HKT.HKT<M, Maybe.Maybe<A1>>,
      onNothing: () => HKT.HKT<M, A2>,
      onJust: (a: A1) => HKT.HKT<M, A3>
    ) =>
      M.chain_(
        ma,
        Maybe.match((): HKT.HKT<M, A2 | A3> => onNothing(), onJust)
      ),
    matchOptionM:
      <A1, A2, A3>(onNothing: () => HKT.HKT<M, A2>, onJust: (a: A1) => HKT.HKT<M, A3>) =>
      (ma: HKT.HKT<M, Maybe.Maybe<A1>>) =>
        M.chain_(
          ma,
          Maybe.match((): HKT.HKT<M, A2 | A3> => onNothing(), onJust)
        ),
    getOrElse_: <A, A1>(fa: HKT.HKT<M, Maybe.Maybe<A>>, onNothing: () => HKT.HKT<M, A1>) =>
      M.chain_(
        fa,
        Maybe.match((): HKT.HKT<M, A | A1> => onNothing(), M.pure)
      ),
    getOrElse: (onNone) => M.chain(Maybe.match(onNone, M.pure))
  })
}

export interface MaybeT<M extends HKT.URIS, C = HKT.Auto>
  extends P.Monad<[M[0], ...HKT.Rest<M>, HKT.URI<MaybeURI>], C> {
  readonly just: JustFn<M, C>
  readonly nothing: NothingFn<M, C>
  readonly justM: FromFFn<M, C>
  readonly getOrElse_: GetOrElseFn_<M, C>
  readonly getOrElse: GetOrElseFn<M, C>

  readonly matchOption_: <K, Q, W, X, I, S, R, E, A, B, C>(
    ma: HKT.Kind<M, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>,
    onNothing: () => B,
    onJust: (a: A) => C
  ) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, B | C>

  readonly matchOption: <A, B, C>(
    onNothing: () => B,
    onJust: (a: A) => C
  ) => <K, Q, W, X, I, S, R, E>(
    ma: HKT.Kind<M, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
  ) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, B | C>

  readonly matchOptionM_: <
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    K2,
    Q2,
    W2,
    X2,
    I2,
    S2,
    R2,
    E2,
    A2,
    K3,
    Q3,
    W3,
    X3,
    I3,
    S3,
    R3,
    E3,
    A3
  >(
    ma: HKT.Kind<M, C, K1, Q1, W1, X1, I1, S1, R1, E1, Maybe.Maybe<A1>>,
    onNothing: () => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'K', K1, K2>,
      HKT.Intro<C, 'Q', Q1, Q2>,
      HKT.Intro<C, 'W', W1, W2>,
      HKT.Intro<C, 'X', X1, X2>,
      HKT.Intro<C, 'I', I1, I2>,
      HKT.Intro<C, 'S', S1, S2>,
      HKT.Intro<C, 'R', R1, R2>,
      HKT.Intro<C, 'E', E1, E2>,
      A2
    >,
    onJust: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'K', K2, K3>,
      HKT.Intro<C, 'Q', Q2, Q3>,
      HKT.Intro<C, 'W', W2, W3>,
      HKT.Intro<C, 'X', X2, X3>,
      HKT.Intro<C, 'I', I2, I3>,
      HKT.Intro<C, 'S', S2, S3>,
      HKT.Intro<C, 'R', R2, R3>,
      HKT.Intro<C, 'E', E2, E3>,
      A3
    >
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<C, 'K', [K1, K2, K3]>,
    HKT.Mix<C, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<C, 'Q', [W1, W2, W3]>,
    HKT.Mix<C, 'Q', [X1, X2, X3]>,
    HKT.Mix<C, 'Q', [I1, I2, I3]>,
    HKT.Mix<C, 'Q', [S1, S2, S3]>,
    HKT.Mix<C, 'Q', [R1, R2, R3]>,
    HKT.Mix<C, 'Q', [E1, E2, E3]>,
    A2 | A3
  >

  readonly matchOptionM: <
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    K2,
    Q2,
    W2,
    X2,
    I2,
    S2,
    R2,
    E2,
    A2,
    K3,
    Q3,
    W3,
    X3,
    I3,
    S3,
    R3,
    E3,
    A3
  >(
    onNothing: () => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'K', K1, K2>,
      HKT.Intro<C, 'Q', Q1, Q2>,
      HKT.Intro<C, 'W', W1, W2>,
      HKT.Intro<C, 'X', X1, X2>,
      HKT.Intro<C, 'I', I1, I2>,
      HKT.Intro<C, 'S', S1, S2>,
      HKT.Intro<C, 'R', R1, R2>,
      HKT.Intro<C, 'E', E1, E2>,
      A2
    >,
    onJust: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'K', K2, K3>,
      HKT.Intro<C, 'Q', Q2, Q3>,
      HKT.Intro<C, 'W', W2, W3>,
      HKT.Intro<C, 'X', X2, X3>,
      HKT.Intro<C, 'I', I2, I3>,
      HKT.Intro<C, 'S', S2, S3>,
      HKT.Intro<C, 'R', R2, R3>,
      HKT.Intro<C, 'E', E2, E3>,
      A3
    >
  ) => (
    ma: HKT.Kind<M, C, K1, Q1, W1, X1, I1, S1, R1, E1, Maybe.Maybe<A1>>
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<C, 'K', [K1, K2, K3]>,
    HKT.Mix<C, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<C, 'Q', [W1, W2, W3]>,
    HKT.Mix<C, 'Q', [X1, X2, X3]>,
    HKT.Mix<C, 'Q', [I1, I2, I3]>,
    HKT.Mix<C, 'Q', [S1, S2, S3]>,
    HKT.Mix<C, 'Q', [R1, R2, R3]>,
    HKT.Mix<C, 'Q', [E1, E2, E3]>,
    A2 | A3
  >
}

export interface JustFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
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
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
}

export interface NothingFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A = never,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
}

export interface FromFFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    Maybe.Maybe<A>
  >
}

export interface GetOrElseFn_<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>,
    onNothing: () => HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      A1
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'Q', [W, W1]>,
    HKT.Mix<C, 'Q', [X, X1]>,
    HKT.Mix<C, 'Q', [I, I1]>,
    HKT.Mix<C, 'Q', [S, S1]>,
    HKT.Mix<C, 'Q', [R, R1]>,
    HKT.Mix<C, 'Q', [E, E1]>,
    A | A1
  >
}

export interface GetOrElseFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A>(onNothing: () => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): <
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1
  >(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      Maybe.Maybe<A>
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'Q', [W, W1]>,
    HKT.Mix<C, 'Q', [X, X1]>,
    HKT.Mix<C, 'Q', [I, I1]>,
    HKT.Mix<C, 'Q', [S, S1]>,
    HKT.Mix<C, 'Q', [R, R1]>,
    HKT.Mix<C, 'Q', [E, E1]>,
    A | A1
  >
}
