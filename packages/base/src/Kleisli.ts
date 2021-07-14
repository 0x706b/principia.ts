import type * as HKT from './HKT'
import type { KleisliInCategoryURI, KleisliInURI } from './Modules'

import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * *** experimental ***
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Represents a function `A => F<B>`.
 */
export interface Kleisli<F extends HKT.URIS, TC, K, Q, W, X, I, S, R, E, A, B> {
  (a: A): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

/**
 * Represents a function `A => F<B>`.
 */
export function Kleisli<F extends HKT.URIS, TC, K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
): Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B> {
  return run
}

/**
 * @internal
 */
function shift<F extends HKT.URIS, TC>(
  F: P.Semimonoidal<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.URIS, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.URIS, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
function shift<F extends HKT.URIS, TC>(
  F:
    | P.Semimonoidal<F, TC>
    | P.Functor<F, TC>
    | P.SemimonoidalFunctor<F, TC>
    | P.Applicative<F, TC>
    | P.Chain<F, TC>
    | P.Monad<F, TC>
): <K, Q, W, X, I, S, R, E, A, B>(
  run: (a: A) => HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B> {
  return (run) => ('pure' in F && 'chain_' in F ? Kleisli((r) => F.chain_(F.pure(r), run)) : Kleisli(run))
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function liftF<F extends HKT.URIS, C>(
  _: HKT.Base<F, C>
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

export function map_<F extends HKT.URIS, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, C>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (a: B) => C
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, C> {
  return (fa, f) => shift(F)((a) => F.map_(fa(a), f))
}

export function map<F extends HKT.URIS, TC>(
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

export function chain_<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C extends A, D>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    a: B
  ) => Kleisli<
    F,
    TC,
    HKT.Intro<TC, 'K', K, K1>,
    HKT.Intro<TC, 'Q', Q, Q1>,
    HKT.Intro<TC, 'W', W, W1>,
    HKT.Intro<TC, 'X', X, X1>,
    HKT.Intro<TC, 'I', I, I1>,
    HKT.Intro<TC, 'S', S, S1>,
    HKT.Intro<TC, 'R', R, R1>,
    HKT.Intro<TC, 'E', E, E1>,
    C,
    D
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K, K1]>,
  HKT.Mix<TC, 'Q', [Q, Q1]>,
  HKT.Mix<TC, 'W', [W, W1]>,
  HKT.Mix<TC, 'X', [X, X1]>,
  HKT.Mix<TC, 'I', [I, I1]>,
  HKT.Mix<TC, 'S', [S, S1]>,
  HKT.Mix<TC, 'R', [R, R1]>,
  HKT.Mix<TC, 'E', [E, E1]>,
  C,
  D
> {
  return (ma, f) => shift(F)((a) => F.chain_(ma(a), (b) => f(b)(a)))
}

export function chain<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C extends A, D>(
  f: (a: B) => Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>
) => <K, Q, W, X, I, S, R, E>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<TC, 'K', K1, K>,
    HKT.Intro<TC, 'Q', Q1, Q>,
    HKT.Intro<TC, 'W', W1, W>,
    HKT.Intro<TC, 'X', X1, X>,
    HKT.Intro<TC, 'I', I1, I>,
    HKT.Intro<TC, 'S', S1, S>,
    HKT.Intro<TC, 'R', R1, R>,
    HKT.Intro<TC, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K1, K]>,
  HKT.Mix<TC, 'Q', [Q1, Q]>,
  HKT.Mix<TC, 'W', [W1, W]>,
  HKT.Mix<TC, 'X', [X1, X]>,
  HKT.Mix<TC, 'I', [I1, I]>,
  HKT.Mix<TC, 'S', [S1, S]>,
  HKT.Mix<TC, 'R', [R1, R]>,
  HKT.Mix<TC, 'E', [E1, E]>,
  C,
  D
> {
  return (f) => (ma) => chain_(F)(ma, f)
}

export function andThen_<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    a: B
  ) => HKT.Kind<
    F,
    TC,
    HKT.Intro<TC, 'K', K, K1>,
    HKT.Intro<TC, 'Q', Q, Q1>,
    HKT.Intro<TC, 'W', W, W1>,
    HKT.Intro<TC, 'X', X, X1>,
    HKT.Intro<TC, 'I', I, I1>,
    HKT.Intro<TC, 'S', S, S1>,
    HKT.Intro<TC, 'R', R, R1>,
    HKT.Intro<TC, 'E', E, E1>,
    C
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K, K1]>,
  HKT.Mix<TC, 'Q', [Q, Q1]>,
  HKT.Mix<TC, 'W', [W, W1]>,
  HKT.Mix<TC, 'X', [X, X1]>,
  HKT.Mix<TC, 'I', [I, I1]>,
  HKT.Mix<TC, 'S', [S, S1]>,
  HKT.Mix<TC, 'R', [R, R1]>,
  HKT.Mix<TC, 'E', [E, E1]>,
  A,
  C
> {
  return (ma, f) => shift(F)((a) => F.chain_(ma(a), f))
}

export function andThen<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, C>(
  f: (a: B) => HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, C>
) => <K, Q, W, X, I, S, R, E, A>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<TC, 'K', K1, K>,
    HKT.Intro<TC, 'Q', Q1, Q>,
    HKT.Intro<TC, 'W', W1, W>,
    HKT.Intro<TC, 'X', X1, X>,
    HKT.Intro<TC, 'I', I1, I>,
    HKT.Intro<TC, 'S', S1, S>,
    HKT.Intro<TC, 'R', R1, R>,
    HKT.Intro<TC, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K1, K]>,
  HKT.Mix<TC, 'Q', [Q1, Q]>,
  HKT.Mix<TC, 'W', [W1, W]>,
  HKT.Mix<TC, 'X', [X1, X]>,
  HKT.Mix<TC, 'I', [I1, I]>,
  HKT.Mix<TC, 'S', [S1, S]>,
  HKT.Mix<TC, 'R', [R1, R]>,
  HKT.Mix<TC, 'E', [E1, E]>,
  A,
  C
> {
  return (f) => (ma) => andThen_(F)(ma, f)
}

export function compose_<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, Z>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (
    _: Z
  ) => HKT.Kind<
    F,
    TC,
    HKT.Intro<TC, 'K', K, K1>,
    HKT.Intro<TC, 'Q', Q, Q1>,
    HKT.Intro<TC, 'W', W, W1>,
    HKT.Intro<TC, 'X', X, X1>,
    HKT.Intro<TC, 'I', I, I1>,
    HKT.Intro<TC, 'S', S, S1>,
    HKT.Intro<TC, 'R', R, R1>,
    HKT.Intro<TC, 'E', E, E1>,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K, K1]>,
  HKT.Mix<TC, 'Q', [Q, Q1]>,
  HKT.Mix<TC, 'W', [W, W1]>,
  HKT.Mix<TC, 'X', [X, X1]>,
  HKT.Mix<TC, 'I', [I, I1]>,
  HKT.Mix<TC, 'S', [S, S1]>,
  HKT.Mix<TC, 'R', [R, R1]>,
  HKT.Mix<TC, 'E', [E, E1]>,
  Z,
  B
> {
  return (ma, f) => shift(F)((z) => F.chain_(f(z), ma))
}

export function compose<F extends HKT.URIS, TC>(
  F: P.Chain<F, TC>
): <B, K1, Q1, W1, X1, I1, S1, R1, E1, Z>(
  f: (_: Z) => HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, B>
) => <K, Q, W, X, I, S, R, E, A>(
  ma: Kleisli<
    F,
    TC,
    HKT.Intro<TC, 'K', K1, K>,
    HKT.Intro<TC, 'Q', Q1, Q>,
    HKT.Intro<TC, 'W', W1, W>,
    HKT.Intro<TC, 'X', X1, X>,
    HKT.Intro<TC, 'I', I1, I>,
    HKT.Intro<TC, 'S', S1, S>,
    HKT.Intro<TC, 'R', R1, R>,
    HKT.Intro<TC, 'E', E1, E>,
    A,
    B
  >
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K1, K]>,
  HKT.Mix<TC, 'Q', [Q1, Q]>,
  HKT.Mix<TC, 'W', [W1, W]>,
  HKT.Mix<TC, 'X', [X1, X]>,
  HKT.Mix<TC, 'I', [I1, I]>,
  HKT.Mix<TC, 'S', [S1, S]>,
  HKT.Mix<TC, 'R', [R1, R]>,
  HKT.Mix<TC, 'E', [E1, E]>,
  Z,
  B
> {
  return (f) => (ma) => compose_(F)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<F extends HKT.URIS, C>(
  F: P.Applicative<F, C>
): <
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
) => Kleisli<F, C, K, Q, W, X, I, S, R, E, unknown, A> {
  return (a) => Kleisli(() => F.pure(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<F extends HKT.URIS, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A, C>,
  f: (a: B, b: C) => D
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K, K1]>,
  HKT.Mix<TC, 'Q', [Q, Q1]>,
  HKT.Mix<TC, 'W', [W, W1]>,
  HKT.Mix<TC, 'X', [X, X1]>,
  HKT.Mix<TC, 'I', [I, I1]>,
  HKT.Mix<TC, 'S', [S, S1]>,
  HKT.Mix<TC, 'R', [R, R1]>,
  HKT.Mix<TC, 'E', [E, E1]>,
  A,
  D
> {
  return (fa, fb, f) => shift(F)((a) => F.crossWith_(fa(a), fb(a), f))
}

export function crossWith<F extends HKT.URIS, TC>(
  F: P.SemimonoidalFunctor<F, TC>
): <A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>(
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A, C>,
  f: (a: B, b: C) => D
) => <K, Q, W, X, I, S, R, E>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K1, K]>,
  HKT.Mix<TC, 'Q', [Q1, Q]>,
  HKT.Mix<TC, 'W', [W1, W]>,
  HKT.Mix<TC, 'X', [X1, X]>,
  HKT.Mix<TC, 'I', [I1, I]>,
  HKT.Mix<TC, 'S', [S1, S]>,
  HKT.Mix<TC, 'R', [R1, R]>,
  HKT.Mix<TC, 'E', [E1, E]>,
  A,
  D
> {
  return (fb, f) => (fa) => crossWith_(F)(fa, fb, f)
}

export function cross_<F extends HKT.URIS, TC>(
  F: P.Semimonoidal<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A, C>
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K, K1]>,
  HKT.Mix<TC, 'Q', [Q, Q1]>,
  HKT.Mix<TC, 'W', [W, W1]>,
  HKT.Mix<TC, 'X', [X, X1]>,
  HKT.Mix<TC, 'I', [I, I1]>,
  HKT.Mix<TC, 'S', [S, S1]>,
  HKT.Mix<TC, 'R', [R, R1]>,
  HKT.Mix<TC, 'E', [E, E1]>,
  A,
  readonly [B, C]
> {
  return (fa, fb) => shift(F)((a) => F.cross_(fa(a), fb(a)))
}

export function cross<F extends HKT.URIS, TC>(
  F: P.Semimonoidal<F, TC>
): <A, B, K1, Q1, W1, X1, I1, S1, R1, E1, C, D>(
  fb: Kleisli<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, A, C>,
  f: (a: B, b: C) => D
) => <K, Q, W, X, I, S, R, E>(
  fa: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<
  F,
  TC,
  HKT.Mix<TC, 'K', [K1, K]>,
  HKT.Mix<TC, 'Q', [Q1, Q]>,
  HKT.Mix<TC, 'W', [W1, W]>,
  HKT.Mix<TC, 'X', [X1, X]>,
  HKT.Mix<TC, 'I', [I1, I]>,
  HKT.Mix<TC, 'S', [S1, S]>,
  HKT.Mix<TC, 'R', [R1, R]>,
  HKT.Mix<TC, 'E', [E1, E]>,
  A,
  D
> {
  // @ts-expect-error
  return (fb, f) => (fa) => crossWith_(F)(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function ask<F extends HKT.URIS, C>(
  F: P.Applicative<F, C>
): <
  Input,
  K = HKT.Initial<C, 'K'>,
  Q = HKT.Initial<C, 'Q'>,
  W = HKT.Initial<C, 'W'>,
  X = HKT.Initial<C, 'X'>,
  I = HKT.Initial<C, 'I'>,
  S = HKT.Initial<C, 'S'>,
  R = HKT.Initial<C, 'R'>,
  E = HKT.Initial<C, 'E'>
>() => Kleisli<F, C, K, Q, W, X, I, S, R, E, Input, Input> {
  return () => Kleisli((a) => F.pure(a))
}

export function gives_<F extends HKT.URIS, C>(
  _: HKT.Base<F, C>
): <K, Q, W, X, I, S, R, E, Input0, Input, Output>(
  ma: Kleisli<F, C, K, Q, W, X, I, S, R, E, Input, Output>,
  f: (_: Input0) => Input
) => Kleisli<F, C, K, Q, W, X, I, S, R, E, Input0, Output> {
  return (ma, f) => Kleisli((i0) => ma(f(i0)))
}

export function gives<F extends HKT.URIS, TC>(
  _: HKT.Base<F, TC>
): <A0, A>(
  f: (_: A0) => A
) => <K, Q, W, X, I, S, R, E, B>(
  ma: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A0, B> {
  return (f) => (ma) => gives_(_)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function dimap_<F extends HKT.URIS, TC>(
  F: P.Functor<F, TC>
): <K, Q, W, X, I, S, R, E, A, B, A0, C>(
  ka: Kleisli<F, TC, K, Q, W, X, I, S, R, E, A, B>,
  f: (_: A0) => A,
  g: (a: B) => C
) => Kleisli<F, TC, K, Q, W, X, I, S, R, E, A0, C> {
  return (ka, f, g) => Kleisli((a0) => F.map_(ka(f(a0)), g))
}

export function dimap<F extends HKT.URIS, TC>(
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

export function mapF_<F extends HKT.URIS, CF, G extends HKT.URIS, CG>(
  _F: HKT.Base<F, CF>,
  _G: HKT.Base<G, CG>
): <K, Q, W, X, I, S, R, E, A, B, C>(
  ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>,
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C>
) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, C> {
  return (ma, f) => Kleisli((a) => f(ma(a)))
}

export function mapF<F extends HKT.URIS, CF, G extends HKT.URIS, CG>(
  _F: HKT.Base<F, CF>,
  _G: HKT.Base<G, CG>
): <K, Q, W, X, I, S, R, E, B, C>(
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C>
) => <A>(ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, C> {
  return (f) => (ma) => mapF_(_F, _G)(ma, f)
}

export function mapK_<F extends HKT.URIS, CF, G extends HKT.URIS, CG>(
  _F: HKT.Base<F, CF>,
  _G: HKT.Base<G, CG>
): <K, Q, W, X, I, S, R, E, A, B>(
  ma: Kleisli<F, CF, K, Q, W, X, I, S, R, E, A, B>,
  f: (F: HKT.Kind<F, CF, K, Q, W, X, I, S, R, E, B>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => Kleisli<G, CG, K, Q, W, X, I, S, R, E, A, B> {
  return (ma, f) => Kleisli((a) => f(ma(a)))
}

export function mapK<F extends HKT.URIS, CF, G extends HKT.URIS, CG>(
  _F: HKT.Base<F, CF>,
  _G: HKT.Base<G, CG>
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

type URI<F extends HKT.URIS> = [HKT.URI<KleisliInURI>, ...F]

type CategoryURI<F extends HKT.URIS> = [HKT.URI<KleisliInCategoryURI>, ...F]

export interface KleisliInput<A> {
  readonly _KleisliInput: (_: A) => void
}

export function Functor<F extends HKT.URIS, C>(F: P.Functor<F, C>): P.Functor<URI<F>, C>
export function Functor<F>(F: P.Functor<HKT.UHKT<F>>): P.Functor<URI<HKT.UHKT<F>>> {
  return P.Functor({
    map_: map_(F)
  })
}

export function SemimonoidalFunctor<F extends HKT.URIS, C>(
  F: P.SemimonoidalFunctor<F, C>
): P.SemimonoidalFunctor<URI<F>, C>
export function SemimonoidalFunctor<F>(F: P.SemimonoidalFunctor<HKT.UHKT<F>>): P.SemimonoidalFunctor<URI<HKT.UHKT<F>>> {
  return P.SemimonoidalFunctor({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F)
  })
}

export function Apply<F extends HKT.URIS, C>(F: P.Apply<F, C>): P.Apply<URI<F>, C>
export function Apply<F>(F: P.Apply<HKT.UHKT<F>>): P.Apply<URI<HKT.UHKT<F>>> {
  return P.Apply({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F)
  })
}

export function Applicative<F extends HKT.URIS, C>(F: P.Applicative<F, C>): P.Applicative<URI<F>, C>
export function Applicative<F>(F: P.Applicative<HKT.UHKT<F>>): P.Applicative<URI<HKT.UHKT<F>>> {
  return P.Applicative({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F),
    pure: pure(F)
  })
}

export function Monad<F extends HKT.URIS, C>(F: P.Monad<F, C>): P.Monad<URI<F>, C>
export function Monad<F>(F: P.Monad<HKT.UHKT<F>>): P.Monad<URI<HKT.UHKT<F>>> {
  return P.Monad({
    map_: map_(F),
    cross_: cross_(F),
    crossWith_: crossWith_(F),
    pure: pure(F),
    chain_: chain_(F)
  })
}

export function Category<F extends HKT.URIS, C>(F: P.Monad<F, C>): P.Category<CategoryURI<F>, C>
export function Category<F>(F: P.Monad<HKT.UHKT<F>>): P.Category<CategoryURI<HKT.UHKT<F>>> {
  return P.Category({
    id: ask(F),
    andThen_: andThen_(F)
  })
}
