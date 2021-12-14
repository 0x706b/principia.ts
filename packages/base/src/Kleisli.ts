import type * as HKT from './HKT'

import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * *** experimental ***
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Represents a function `A => F<B>`.
 */
export interface Kleisli<F extends HKT.HKT, TC, K, Q, W, X, I, S, R, E, A, B> {
  (a: A): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface KleisliFK<F, K, Q, W, X, I, S, R, E, A, B> {
  (a: A): HKT.FK<F, K, Q, W, X, I, S, R, E, B>
}

/**
 * Represents a function `A => F<B>`.
 */
export function Kleisli<F extends HKT.HKT, TC, K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
): Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B> {
  return run
}

/**
 * @internal
 */
function shift<F extends HKT.HKT, TC>(
  F: P.Semimonoidal<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.HKT, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.HKT, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F>(
  F:
    | P.Semimonoidal<HKT.F<F>>
    | P.Functor<HKT.F<F>>
    | P.SemimonoidalFunctor<HKT.F<F>>
    | P.Applicative<HKT.F<F>>
    | P.Chain<HKT.F<F>>
    | P.Monad<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.FK<F, K, Q, W, X, I, S, R, E, B>
) => KleisliFK<F, K, Q, W, X, I, S, R, E, A, B> {
  return (run) => ('pure' in F && 'chain_' in F ? (r) => F.chain_(F.pure(r), run) : run)
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function liftF<F extends HKT.HKT, C>(
  _: HKT.Typeclass<F, C>
): <K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => Kleisli<F, C, K, Q, W, X, I, S, R, E, unknown, A> {
  return (fa) => Kleisli(() => fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<F extends HKT.HKT, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, C>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (a: B) => C
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, C> {
  return (fa, f) => shift(F)((a) => F.map_(fa(a), f))
}

export function map<F extends HKT.HKT, TC>(
  F: P.Functor<F, TC>
): <B, C>(
  f: (a: B) => C
) => <K, Q, W, X, I, S, R, E, A>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, C> {
  return (f) => (fa) => map_(F)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    a: B
  ) => Kleisli<
    F,
    TC,
    HKT.Intro<F, 'K', K, K1>,
    HKT.Intro<F, 'Q', Q, Q1>,
    HKT.Intro<F, 'W', W, W1>,
    HKT.Intro<F, 'X', X, X1>,
    HKT.Intro<F, 'I', I, I1>,
    HKT.Intro<F, 'S', S, S1>,
    HKT.Intro<F, 'R', R, R1>,
    HKT.Intro<F, 'E', E, E1>,
    C,
    D
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K, K1]>,
  HKT.Mix<F, 'Q', [Q, Q1]>,
  HKT.Mix<F, 'W', [W, W1]>,
  HKT.Mix<F, 'X', [X, X1]>,
  HKT.Mix<F, 'I', [I, I1]>,
  HKT.Mix<F, 'S', [S, S1]>,
  HKT.Mix<F, 'R', [R, R1]>,
  HKT.Mix<F, 'E', [E, E1]>,
  A & C,
  D
> {
  return (ma, f) => shift(F)((a) => F.chain_(ma(a), (b) => f(b)(a)))
}

export function chain<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, A1, D>(
  f: (a: B) => Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A1, D>
) => <K, Q, W, X, I, S, R, E, A>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<F, 'K', K1, K>,
    HKT.Intro<F, 'Q', Q1, Q>,
    HKT.Intro<F, 'W', W1, W>,
    HKT.Intro<F, 'X', X1, X>,
    HKT.Intro<F, 'I', I1, I>,
    HKT.Intro<F, 'S', S1, S>,
    HKT.Intro<F, 'R', R1, R>,
    HKT.Intro<F, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K1, K]>,
  HKT.Mix<F, 'Q', [Q1, Q]>,
  HKT.Mix<F, 'W', [W1, W]>,
  HKT.Mix<F, 'X', [X1, X]>,
  HKT.Mix<F, 'I', [I1, I]>,
  HKT.Mix<F, 'S', [S1, S]>,
  HKT.Mix<F, 'R', [R1, R]>,
  HKT.Mix<F, 'E', [E1, E]>,
  A & A1,
  D
>
export function chain<F>(
  F: P.Chain<HKT.F<F>>
): <B, K, Q, W, X, I, S, R, E, A1, D>(
  f: (a: B) => KleisliFK<F, K, Q, W, X, I, S, R, E, A1, D>
) => <A>(ma: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>) => KleisliFK<F, K, Q, W, X, I, S, R, E, A & A1, D> {
  return (f) => (ma) => chain_(F)(ma, f)
}

export function andThen_<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    a: B
  ) => HKT.Kind<
    F,
    TC,
    HKT.Intro<F, 'K', K, K1>,
    HKT.Intro<F, 'Q', Q, Q1>,
    HKT.Intro<F, 'W', W, W1>,
    HKT.Intro<F, 'X', X, X1>,
    HKT.Intro<F, 'I', I, I1>,
    HKT.Intro<F, 'S', S, S1>,
    HKT.Intro<F, 'R', R, R1>,
    HKT.Intro<F, 'E', E, E1>,
    C
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K, K1]>,
  HKT.Mix<F, 'Q', [Q, Q1]>,
  HKT.Mix<F, 'W', [W, W1]>,
  HKT.Mix<F, 'X', [X, X1]>,
  HKT.Mix<F, 'I', [I, I1]>,
  HKT.Mix<F, 'S', [S, S1]>,
  HKT.Mix<F, 'R', [R, R1]>,
  HKT.Mix<F, 'E', [E, E1]>,
  A,
  C
> {
  return (ma, f) => shift(F)((a) => F.chain_(ma(a), f))
}

export function andThen<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, C>(
  f: (a: B) => HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, C>
) => <K, Q, W, X, I, S, R, E, A>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<F, 'K', K1, K>,
    HKT.Intro<F, 'Q', Q1, Q>,
    HKT.Intro<F, 'W', W1, W>,
    HKT.Intro<F, 'X', X1, X>,
    HKT.Intro<F, 'I', I1, I>,
    HKT.Intro<F, 'S', S1, S>,
    HKT.Intro<F, 'R', R1, R>,
    HKT.Intro<F, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K1, K]>,
  HKT.Mix<F, 'Q', [Q1, Q]>,
  HKT.Mix<F, 'W', [W1, W]>,
  HKT.Mix<F, 'X', [X1, X]>,
  HKT.Mix<F, 'I', [I1, I]>,
  HKT.Mix<F, 'S', [S1, S]>,
  HKT.Mix<F, 'R', [R1, R]>,
  HKT.Mix<F, 'E', [E1, E]>,
  A,
  C
>
export function andThen<F>(
  F: P.Chain<HKT.F<F>>
): <B, K, Q, W, X, I, S, R, E, C>(
  f: (a: B) => HKT.FK<F, K, Q, W, X, I, S, R, E, C>
) => <A>(ma: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>) => KleisliFK<F, K, Q, W, X, I, S, R, E, A, C> {
  return (f) => (ma) => andThen_(F)(ma, f)
}

export function compose_<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, Z>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    _: Z
  ) => HKT.Kind<
    F,
    TC,
    HKT.Intro<F, 'K', K, K1>,
    HKT.Intro<F, 'Q', Q, Q1>,
    HKT.Intro<F, 'W', W, W1>,
    HKT.Intro<F, 'X', X, X1>,
    HKT.Intro<F, 'I', I, I1>,
    HKT.Intro<F, 'S', S, S1>,
    HKT.Intro<F, 'R', R, R1>,
    HKT.Intro<F, 'E', E, E1>,
    A
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K, K1]>,
  HKT.Mix<F, 'Q', [Q, Q1]>,
  HKT.Mix<F, 'W', [W, W1]>,
  HKT.Mix<F, 'X', [X, X1]>,
  HKT.Mix<F, 'I', [I, I1]>,
  HKT.Mix<F, 'S', [S, S1]>,
  HKT.Mix<F, 'R', [R, R1]>,
  HKT.Mix<F, 'E', [E, E1]>,
  Z,
  B
>
export function compose_<F>(
  F: P.Chain<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A, B, Z>(
  ma: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>,
  f: (_: Z) => HKT.FK<F, K, Q, W, X, I, S, R, E, A>
) => KleisliFK<F, K, Q, W, X, I, S, R, E, Z, B> {
  return (ma, f) => shift(F)((z) => F.chain_(f(z), ma))
}

export function compose<F extends HKT.HKT, TC>(
  F: P.Chain<F, TC>
): <A, K1, Q1, W1, X1, I1, S1, R1, E1, Z>(
  f: (_: Z) => HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A>
) => <K, Q, W, X, I, S, R, E, A, B>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<F, 'K', K1, K>,
    HKT.Intro<F, 'Q', Q1, Q>,
    HKT.Intro<F, 'W', W1, W>,
    HKT.Intro<F, 'X', X1, X>,
    HKT.Intro<F, 'I', I1, I>,
    HKT.Intro<F, 'S', S1, S>,
    HKT.Intro<F, 'R', R1, R>,
    HKT.Intro<F, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K1, K]>,
  HKT.Mix<F, 'Q', [Q1, Q]>,
  HKT.Mix<F, 'W', [W1, W]>,
  HKT.Mix<F, 'X', [X1, X]>,
  HKT.Mix<F, 'I', [I1, I]>,
  HKT.Mix<F, 'S', [S1, S]>,
  HKT.Mix<F, 'R', [R1, R]>,
  HKT.Mix<F, 'E', [E1, E]>,
  Z,
  B
>
export function compose<F>(
  F: P.Chain<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A, Z>(
  f: (_: Z) => HKT.FK<F, K, Q, W, X, I, S, R, E, A>
) => <B>(ma: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>) => KleisliFK<F, K, Q, W, X, I, S, R, E, Z, B> {
  return (f) => (ma) => compose_(F)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<F extends HKT.HKT, C>(
  F: P.Applicative<F, C>
): <
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
) => Kleisli<F, C, K, Q, W, X, I, S, R, E, unknown, A> {
  return (a) => Kleisli(() => F.pure(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<F extends HKT.HKT, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C, D>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  fb: Kleisli<
    F,
    TC,
    HKT.Intro<F, 'K', K, K1>,
    HKT.Intro<F, 'Q', Q, K1>,
    HKT.Intro<F, 'W', W, K1>,
    HKT.Intro<F, 'X', X, K1>,
    HKT.Intro<F, 'I', I, K1>,
    HKT.Intro<F, 'S', S, K1>,
    HKT.Intro<F, 'R', R, K1>,
    HKT.Intro<F, 'E', E, K1>,
    A1,
    C
  >,
  f: (a: B, b: C) => D
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K, K1]>,
  HKT.Mix<F, 'Q', [Q, Q1]>,
  HKT.Mix<F, 'W', [W, W1]>,
  HKT.Mix<F, 'X', [X, X1]>,
  HKT.Mix<F, 'I', [I, I1]>,
  HKT.Mix<F, 'S', [S, S1]>,
  HKT.Mix<F, 'R', [R, R1]>,
  HKT.Mix<F, 'E', [E, E1]>,
  A & A1,
  D
>
export function crossWith_<F>(
  F: P.SemimonoidalFunctor<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A, A1, B, C, D>(
  fa: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>,
  fb: KleisliFK<F, K, Q, W, X, I, S, R, E, A1, C>,
  f: (a: B, b: C) => D
) => KleisliFK<F, K, Q, W, X, I, S, R, E, A & A1, D> {
  return (fa, fb, f) => shift(F)((a) => F.crossWith_(fa(a), fb(a), f))
}

export function crossWith<F extends HKT.HKT, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C, D>(
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C>,
  f: (a: B, b: C) => D
) => <K, Q, W, X, I, S, R, E, A>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K1, K]>,
  HKT.Mix<F, 'Q', [Q1, Q]>,
  HKT.Mix<F, 'W', [W1, W]>,
  HKT.Mix<F, 'X', [X1, X]>,
  HKT.Mix<F, 'I', [I1, I]>,
  HKT.Mix<F, 'S', [S1, S]>,
  HKT.Mix<F, 'R', [R1, R]>,
  HKT.Mix<F, 'E', [E1, E]>,
  A & A1,
  D
>
export function crossWith<F>(
  F: P.SemimonoidalFunctor<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A1, B, C, D>(
  fb: KleisliFK<F, K, Q, W, X, I, S, R, E, A1, C>,
  f: (a: B, b: C) => D
) => <A>(fa: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>) => KleisliFK<F, K, Q, W, X, I, S, R, E, A & A1, D> {
  return (fb, f) => (fa) => crossWith_(F)(fa, fb, f)
}

export function cross_<F extends HKT.HKT, TC>(
  F: P.Semimonoidal<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C, D>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C>
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K, K1]>,
  HKT.Mix<F, 'Q', [Q, Q1]>,
  HKT.Mix<F, 'W', [W, W1]>,
  HKT.Mix<F, 'X', [X, X1]>,
  HKT.Mix<F, 'I', [I, I1]>,
  HKT.Mix<F, 'S', [S, S1]>,
  HKT.Mix<F, 'R', [R, R1]>,
  HKT.Mix<F, 'E', [E, E1]>,
  A & A1,
  readonly [B, C]
>
export function cross_<F>(
  F: P.Semimonoidal<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A, A1, B, C>(
  fa: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>,
  fb: KleisliFK<F, K, Q, W, X, I, S, R, E, A1, C>
) => KleisliFK<F, K, Q, W, X, I, S, R, E, A & A1, readonly [B, C]> {
  return (fa, fb) => shift(F)((a) => F.cross_(fa(a), fb(a)))
}

export function cross<F extends HKT.HKT, TC>(
  F: P.Semimonoidal<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C>(
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A1, C>
) => <K, Q, W, X, I, S, R, E, A>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<
  F,
  TC,
  HKT.Mix<F, 'K', [K1, K]>,
  HKT.Mix<F, 'Q', [Q1, Q]>,
  HKT.Mix<F, 'W', [W1, W]>,
  HKT.Mix<F, 'X', [X1, X]>,
  HKT.Mix<F, 'I', [I1, I]>,
  HKT.Mix<F, 'S', [S1, S]>,
  HKT.Mix<F, 'R', [R1, R]>,
  HKT.Mix<F, 'E', [E1, E]>,
  A & A1,
  readonly [B, C]
>
export function cross<F>(
  F: P.Semimonoidal<HKT.F<F>>
): <K, Q, W, X, I, S, R, E, A1, B, C>(
  fb: KleisliFK<F, K, Q, W, X, I, S, R, E, A1, C>
) => <A>(
  fa: KleisliFK<F, K, Q, W, X, I, S, R, E, A, B>
) => KleisliFK<F, K, Q, W, X, I, S, R, E, A & A1, readonly [B, C]> {
  return (fb) => (fa) => shift(F)((a) => F.cross_(fa(a), fb(a)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function environment<F extends HKT.HKT, C>(
  F: P.Applicative<F, C>
): <
  Input,
  K = HKT.Low<F, 'K'>,
  Q = HKT.Low<F, 'Q'>,
  W = HKT.Low<F, 'W'>,
  X = HKT.Low<F, 'X'>,
  I = HKT.Low<F, 'I'>,
  S = HKT.Low<F, 'S'>,
  R = HKT.Low<F, 'R'>,
  E = HKT.Low<F, 'E'>
>() => Kleisli<F, C, K, Q, W, X, I, S, R, E, Input, Input> {
  return () => Kleisli((a) => F.pure(a))
}

export function local_<F extends HKT.HKT, C>(
  _: HKT.Typeclass<F, C>
): <K, Q, W, X, I, S, R, E, Input0, Input, Output>(
  ma: Kleisli<F, C, K, Q, W, X, I, S, R, E, Input, Output>,
  f: (_: Input0) => Input
) => Kleisli<F, C, K, Q, W, X, I, S, R, E, Input0, Output> {
  return (ma, f) => Kleisli((i0) => ma(f(i0)))
}

export function local<F extends HKT.HKT, TC>(
  _: HKT.Typeclass<F, TC>
): <A0, A>(
  f: (_: A0) => A
) => <K, Q, W, X, I, S, R, E, B>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A0, B> {
  return (f) => (ma) => local_(_)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function dimap_<F extends HKT.HKT, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, A0, C>(
  ka: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (_: A0) => A,
  g: (a: B) => C
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A0, C> {
  return (ka, f, g) => Kleisli((a0) => F.map_(ka(f(a0)), g))
}

export function dimap<F extends HKT.HKT, TC>(
  F: P.Functor<F, TC>
): <A, B, A0, C>(
  f: (_: A0) => A,
  g: (a: B) => C
) => <K, Q, W, X, I, S, R, E>(
  ka: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A0, C> {
  return (f, g) => (ka) => dimap_(F)(ka, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function mapF_<F extends HKT.HKT, CF, G extends HKT.HKT, CG>(
  _F: HKT.Typeclass<F, CF>,
  _G: HKT.Typeclass<G, CG>
): <K, Q, W, X, I, S, R, E, A, B, C>(
  ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>,
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C>
) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, C> {
  return (ma, f) => Kleisli((a) => f(ma(a)))
}

export function mapF<F extends HKT.HKT, CF, G extends HKT.HKT, CG>(
  _F: HKT.Typeclass<F, CF>,
  _G: HKT.Typeclass<G, CG>
): <K, Q, W, X, I, S, R, E, B, C>(
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C>
) => <A>(ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, C> {
  return (f) => (ma) => mapF_(_F, _G)(ma, f)
}

export function mapK_<F extends HKT.HKT, CF, G extends HKT.HKT, CG>(
  _F: HKT.Typeclass<F, CF>,
  _G: HKT.Typeclass<G, CG>
): <K, Q, W, X, I, S, R, E, A, B>(
  ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>,
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, B> {
  return (ma, f) => Kleisli((a) => f(ma(a)))
}

export function mapK<F extends HKT.HKT, CF, G extends HKT.HKT, CG>(
  _F: HKT.Typeclass<F, CF>,
  _G: HKT.Typeclass<G, CG>
): <K, Q, W, X, I, S, R, E, B>(
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => <A>(ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, B> {
  return (f) => (ma) => mapK_(_F, _G)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

interface KleisliF<F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  type: (
    r: this['R']
  ) => HKT.Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    HKT.Low<F, 'R'>,
    this['E'],
    this['A']
  >
  variance: {
    K: F['variance']['K']
    Q: F['variance']['Q']
    W: F['variance']['W']
    X: F['variance']['X']
    I: F['variance']['I']
    S: F['variance']['S']
    R: '-'
    E: F['variance']['E']
  }
}

interface KleisliF_<F> extends HKT.HKT {
  type: (
    r: this['R']
  ) => HKT.FK<
    F,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    this['I'],
    this['S'],
    HKT.Low<HKT.F<F>, 'R'>,
    this['E'],
    this['A']
  >
  variance: {
    K: '_'
    Q: '_'
    W: '_'
    X: '_'
    I: '_'
    S: '_'
    R: '-'
    E: '_'
  }
}

interface KleisliCategoryF<F extends HKT.HKT, C = HKT.None> extends HKT.HKT {
  type: (
    r: this['I']
  ) => HKT.Kind<
    F,
    C,
    this['K'],
    this['Q'],
    this['W'],
    this['X'],
    HKT.Low<F, 'R'>,
    this['S'],
    this['E'],
    this['R'],
    this['A']
  >
  variance: {
    K: F['variance']['K']
    Q: F['variance']['Q']
    W: F['variance']['W']
    X: F['variance']['X']
    I: '_'
    S: F['variance']['S']
    R: F['variance']['R']
    E: F['variance']['E']
  }
}

export interface KleisliInput<A> {
  readonly _KleisliInput: (_: A) => void
}

export function Functor<F extends HKT.HKT, C>(F: P.Functor<F, C>): P.Functor<KleisliF<F>, C>
export function Functor<F>(F: P.Functor<HKT.F<F>>): P.Functor<KleisliF<HKT.F<F>>> {
  return P.Functor({
    map_: map_(F)
  })
}

export function SemimonoidalFunctor<F extends HKT.HKT, C = HKT.None>(
  F: P.SemimonoidalFunctor<F, C>
): P.SemimonoidalFunctor<KleisliF<F>, C>
export function SemimonoidalFunctor<F>(
  F: P.SemimonoidalFunctor<HKT.F<F>, HKT.None>
): P.SemimonoidalFunctor<KleisliF_<F>, HKT.None> {
  return P.SemimonoidalFunctor<KleisliF_<F>, HKT.None>({
    map_: (fa, f) => map_(F)(fa, f),
    crossWith_: (fa, fb, f) => crossWith_(F)(fa, fb, f),
    cross_: (fa, fb) => cross_(F)(fa, fb)
  })
}

export function Apply<F extends HKT.HKT, C>(F: P.Apply<F, C>): P.Apply<KleisliF<F>, C>
export function Apply<F>(F: P.Apply<HKT.F<F>>): P.Apply<KleisliF<HKT.F<F>>> {
  return P.Apply({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F)
  })
}

export function Applicative<F extends HKT.HKT, C>(F: P.Applicative<F, C>): P.Applicative<KleisliF<F>, C>
export function Applicative<F>(F: P.Applicative<HKT.F<F>>): P.Applicative<KleisliF<HKT.F<F>>> {
  return P.Applicative({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F),
    pure: pure(F)
  })
}

export function Monad<F extends HKT.HKT, C>(F: P.Monad<F, C>): P.Monad<KleisliF<F>, C>
export function Monad<F>(F: P.Monad<HKT.F<F>>): P.Monad<KleisliF<HKT.F<F>>> {
  return P.Monad({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F),
    pure: pure(F),
    chain_: chain_(F)
  })
}

export function Category<F extends HKT.HKT, C>(F: P.Monad<F, C>): P.Category<KleisliCategoryF<F>, C>
export function Category<F>(F: P.Monad<HKT.F<F>>): P.Category<KleisliCategoryF<HKT.F<F>>> {
  return P.Category({
    id: environment(F),
    andThen_: andThen_(F)
  })
}
