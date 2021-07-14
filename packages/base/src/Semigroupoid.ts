import * as HKT from './HKT'

export interface Semigroupoid<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly andThen_: AndThenFn_<F, C>
  readonly andThen: AndThenFn<F, C>
  readonly compose_: ComposeFn_<F, C>
  readonly compose: ComposeFn<F, C>
}

export type SemigroupoidMin<F extends HKT.URIS, C = HKT.Auto> =
  | {
      readonly andThen_: AndThenFn_<F, C>
    }
  | {
      readonly compose_: ComposeFn_<F, C>
    }
  | {
      readonly andThen_: AndThenFn_<F, C>
      readonly compose_: ComposeFn_<F, C>
    }

export function Semigroupoid<F extends HKT.URIS, C = HKT.Auto>(F: SemigroupoidMin<F, C>): Semigroupoid<F, C> {
  let andThen_: AndThenFn_<F, C>
  let compose_: ComposeFn_<F, C>
  if ('andThen_' in F) {
    andThen_ = F.andThen_
    if ('compose_' in F) {
      compose_ = F.compose_
    } else {
      compose_ = (bc, ab) => andThen_(ab, bc)
    }
  } else {
    compose_ = F.compose_
    andThen_ = (ab, bc) => compose_(bc, ab)
  }
  return HKT.instance<Semigroupoid<F, C>>({
    andThen_,
    andThen: (bc) => (ab) => andThen_(ab, bc),
    compose_,
    compose: (ab) => (bc) => compose_(bc, ab)
  })
}

export interface ComposeFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <K, Q, W, X, S, R, E, K1, Q1, W1, X1, S1, R1, E1, A, B, C>(
    bc: HKT.Kind<F, TC, K, Q, W, X, B, S, R, E, C>,
    ab: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      A,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      HKT.Intro<TC, 'E', E, E1>,
      B
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    A,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    C
  >
}

export interface ComposeFn<F extends HKT.URIS, TC = HKT.Auto> {
  <K1, Q1, W1, X1, S1, R1, E1, A, B>(ab: HKT.Kind<F, TC, K1, Q1, W1, X1, A, S1, R1, E1, B>): <K, Q, W, X, S, R, E, C>(
    bc: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      B,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      HKT.Intro<TC, 'E', E1, E>,
      C
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    A,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    C
  >
}

export interface AndThenFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <K, Q, W, X, S, R, E, K1, Q1, W1, X1, S1, R1, E1, A, B, C>(
    ab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>,
    bc: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      B,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      HKT.Intro<TC, 'E', E, E1>,
      C
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    A,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    C
  >
}

export interface AndThenFn<F extends HKT.URIS, TC = HKT.Auto> {
  <B, C, K1, Q1, W1, X1, S1, R1, E1>(bc: HKT.Kind<F, TC, K1, Q1, W1, X1, B, S1, R1, E1, C>): <A, K, Q, W, X, S, R, E>(
    ab: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      A,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      HKT.Intro<TC, 'E', E1, E>,
      B
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    A,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    C
  >
}
