import * as HKT from './HKT'

export interface Semigroupoid<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly andThen_: AndThenFn_<F, C>
  readonly andThen: AndThenFn<F, C>
  readonly compose_: ComposeFn_<F, C>
  readonly compose: ComposeFn<F, C>
}

export type SemigroupoidMin<F extends HKT.HKT, C = HKT.None> =
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

export function Semigroupoid<F extends HKT.HKT, C = HKT.None>(F: SemigroupoidMin<F, C>): Semigroupoid<F, C>
export function Semigroupoid<F>(F: SemigroupoidMin<HKT.F<F>>): Semigroupoid<HKT.F<F>> {
  let andThen_: AndThenFn_<HKT.F<F>>
  let compose_: ComposeFn_<HKT.F<F>>
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
  return HKT.instance<Semigroupoid<HKT.F<F>>>({
    andThen_,
    andThen: (bc) => (ab) => andThen_(ab, bc),
    compose_,
    compose: (ab) => (bc) => compose_(bc, ab)
  })
}

export interface ComposeFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, S, R, E, K1, Q1, W1, X1, S1, R1, E1, A, B, C>(
    bc: HKT.Kind<F, TC, K, Q, W, X, B, S, R, E, C>,
    ab: HKT.Kind<
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
      B
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
    C
  >
}

export interface ComposeFn<F extends HKT.HKT, TC = HKT.None> {
  <K1, Q1, W1, X1, S1, R1, E1, A, B>(ab: HKT.Kind<F, TC, K1, Q1, W1, X1, A, S1, R1, E1, B>): <K, Q, W, X, S, R, E, C>(
    bc: HKT.Kind<
      F,
      TC,
      HKT.Intro<F, 'K', K1, K>,
      HKT.Intro<F, 'Q', Q1, Q>,
      HKT.Intro<F, 'W', W1, W>,
      HKT.Intro<F, 'X', X1, X>,
      B,
      HKT.Intro<F, 'S', S1, S>,
      HKT.Intro<F, 'R', R1, R>,
      HKT.Intro<F, 'E', E1, E>,
      C
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    A,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    C
  >
}

export interface AndThenFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, S, R, E, K1, Q1, W1, X1, S1, R1, E1, A, B, C>(
    ab: HKT.Kind<F, TC, K, Q, W, X, A, S, R, E, B>,
    bc: HKT.Kind<
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
    A,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    C
  >
}

export interface AndThenFn<F extends HKT.HKT, TC = HKT.None> {
  <B, C, K1, Q1, W1, X1, S1, R1, E1>(bc: HKT.Kind<F, TC, K1, Q1, W1, X1, B, S1, R1, E1, C>): <A, K, Q, W, X, S, R, E>(
    ab: HKT.Kind<
      F,
      TC,
      HKT.Intro<F, 'K', K1, K>,
      HKT.Intro<F, 'Q', Q1, Q>,
      HKT.Intro<F, 'W', W1, W>,
      HKT.Intro<F, 'X', X1, X>,
      A,
      HKT.Intro<F, 'S', S1, S>,
      HKT.Intro<F, 'R', R1, R>,
      HKT.Intro<F, 'E', E1, E>,
      B
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    A,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    C
  >
}
