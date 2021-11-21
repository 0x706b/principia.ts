import * as HKT from './HKT'
import * as Maybe from './Maybe'
import * as P from './prelude'

export interface MaybeTF<F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  readonly type: HKT.Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    this['R'],
    this['E'],
    Maybe.Maybe<this['A']>
  >
  readonly variance: {
    K: F['variance']['K']
    Q: F['variance']['Q']
    W: F['variance']['W']
    X: F['variance']['X']
    I: F['variance']['I']
    S: F['variance']['S']
    R: F['variance']['R']
    E: F['variance']['E']
    A: F['variance']['A']
  }
}

export function getMaybeT<M extends HKT.HKT, C = HKT.None>(M: P.Monad<M, C>): MaybeT<M, C>
export function getMaybeT<M>(M: P.Monad<HKT.F<M>, HKT.None>): MaybeT<HKT.F<M>> {
  const chain_: MaybeT<HKT.F<M>>['chain_'] = (ma, f) =>
    M.chain_(
      ma,
      Maybe.match(() => M.pure(Maybe.nothing()), f)
    )

  return HKT.instance<MaybeT<HKT.F<M>>>({
    ...P.Monad({ ...P.getApplicativeComposition(M, Maybe.Applicative), chain_ }),
    nothing: () => M.pure(Maybe.nothing()),
    just: (a) => M.pure(Maybe.just(a)),
    justM: (ma) => M.map_(ma, Maybe.just),
    matchMaybe_: (ma, onNothing, onJust) => M.map_(ma, Maybe.match(onNothing, onJust)),
    matchMaybe: (onNothing, onJust) => M.map(Maybe.match(onNothing, onJust)),
    matchMaybeM_: (ma, onNothing, onJust) =>
      M.chain_(
        ma,
        Maybe.match(() => onNothing(), onJust)
      ),
    matchMaybeM: (onNothing, onJust) => (ma) =>
      M.chain_(
        ma,
        Maybe.match(() => onNothing(), onJust)
      ),
    getOrElse_: (fa, onNothing) =>
      M.chain_(
        fa,
        Maybe.match(() => onNothing(), M.pure)
      ),
    getOrElse: (onNone) => M.chain(Maybe.match(onNone, M.pure))
  })
}

export interface MaybeT<M extends HKT.HKT, C = HKT.None> extends P.Monad<MaybeTF<M>, C> {
  readonly just: JustFn<M, C>
  readonly nothing: NothingFn<M, C>
  readonly justM: JustFFn<M, C>
  readonly getOrElse_: GetOrElseFn_<M, C>
  readonly getOrElse: GetOrElseFn<M, C>

  readonly matchMaybe_: <K, Q, W, X, I, S, R, E, A, B, C>(
    ma: HKT.Kind<M, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>,
    onNothing: () => B,
    onJust: (a: A) => C
  ) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, B | C>

  readonly matchMaybe: <A, B, C>(
    onNothing: () => B,
    onJust: (a: A) => C
  ) => <K, Q, W, X, I, S, R, E>(
    ma: HKT.Kind<M, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
  ) => HKT.Kind<M, C, K, Q, W, X, I, S, R, E, B | C>

  readonly matchMaybeM_: <
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
      HKT.Intro<M, 'K', K1, K2>,
      HKT.Intro<M, 'Q', Q1, Q2>,
      HKT.Intro<M, 'W', W1, W2>,
      HKT.Intro<M, 'X', X1, X2>,
      HKT.Intro<M, 'I', I1, I2>,
      HKT.Intro<M, 'S', S1, S2>,
      HKT.Intro<M, 'R', R1, R2>,
      HKT.Intro<M, 'E', E1, E2>,
      A2
    >,
    onJust: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<M, 'K', K1, K3>,
      HKT.Intro<M, 'Q', Q1, Q3>,
      HKT.Intro<M, 'W', W1, W3>,
      HKT.Intro<M, 'X', X1, X3>,
      HKT.Intro<M, 'I', I1, I3>,
      HKT.Intro<M, 'S', S1, S3>,
      HKT.Intro<M, 'R', R1, R3>,
      HKT.Intro<M, 'E', E1, E3>,
      HKT.Intro<M, 'A', A2, A3>
    >
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<M, 'K', [K1, K2, K3]>,
    HKT.Mix<M, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<M, 'Q', [W1, W2, W3]>,
    HKT.Mix<M, 'Q', [X1, X2, X3]>,
    HKT.Mix<M, 'Q', [I1, I2, I3]>,
    HKT.Mix<M, 'Q', [S1, S2, S3]>,
    HKT.Mix<M, 'Q', [R1, R2, R3]>,
    HKT.Mix<M, 'Q', [E1, E2, E3]>,
    HKT.Mix<M, 'A', [A2, A3]>
  >

  readonly matchMaybeM: <
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
      HKT.Intro<M, 'K', K1, K2>,
      HKT.Intro<M, 'Q', Q1, Q2>,
      HKT.Intro<M, 'W', W1, W2>,
      HKT.Intro<M, 'X', X1, X2>,
      HKT.Intro<M, 'I', I1, I2>,
      HKT.Intro<M, 'S', S1, S2>,
      HKT.Intro<M, 'R', R1, R2>,
      HKT.Intro<M, 'E', E1, E2>,
      A2
    >,
    onJust: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<M, 'K', K1, K3>,
      HKT.Intro<M, 'Q', Q1, Q3>,
      HKT.Intro<M, 'W', W1, W3>,
      HKT.Intro<M, 'X', X1, X3>,
      HKT.Intro<M, 'I', I1, I3>,
      HKT.Intro<M, 'S', S1, S3>,
      HKT.Intro<M, 'R', R1, R3>,
      HKT.Intro<M, 'E', E1, E3>,
      HKT.Intro<M, 'A', A2, A3>
    >
  ) => (
    ma: HKT.Kind<M, C, K1, Q1, W1, X1, I1, S1, R1, E1, Maybe.Maybe<A1>>
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<M, 'K', [K1, K2, K3]>,
    HKT.Mix<M, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<M, 'Q', [W1, W2, W3]>,
    HKT.Mix<M, 'Q', [X1, X2, X3]>,
    HKT.Mix<M, 'Q', [I1, I2, I3]>,
    HKT.Mix<M, 'Q', [S1, S2, S3]>,
    HKT.Mix<M, 'Q', [R1, R2, R3]>,
    HKT.Mix<M, 'Q', [E1, E2, E3]>,
    HKT.Mix<M, 'A', [A2, A3]>
  >
}

export interface JustFn<F extends HKT.HKT, C = HKT.None> {
  <
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    a: A
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
}

export interface NothingFn<F extends HKT.HKT, C = HKT.None> {
  <
    A = never,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>
}

export interface JustFFn<F extends HKT.HKT, C = HKT.None> {
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

export interface GetOrElseFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe.Maybe<A>>,
    onNothing: () => HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      HKT.Intro<F, 'I', I, I1>,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1>,
      HKT.Intro<F, 'E', E, E1>,
      HKT.Intro<F, 'A', A, A1>
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    HKT.Mix<F, 'I', [I, I1]>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    HKT.Mix<F, 'A', [A, A1]>
  >
}

export interface GetOrElseFn<F extends HKT.HKT, C = HKT.None> {
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
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      HKT.Intro<F, 'I', I, I1>,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1>,
      HKT.Intro<F, 'E', E, E1>,
      Maybe.Maybe<A>
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'Q', [W, W1]>,
    HKT.Mix<F, 'Q', [X, X1]>,
    HKT.Mix<F, 'Q', [I, I1]>,
    HKT.Mix<F, 'Q', [S, S1]>,
    HKT.Mix<F, 'Q', [R, R1]>,
    HKT.Mix<F, 'Q', [E, E1]>,
    A | A1
  >
}
