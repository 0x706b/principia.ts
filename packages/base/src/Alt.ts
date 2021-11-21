import type { FunctorMin } from './Functor'

import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Alt<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly alt_: AltFn_<F, C>
  readonly alt: AltFn<F, C>
}

export type AltMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> & {
  readonly alt_: AltFn_<F, C>
}

export function Alt<F extends HKT.HKT, C = HKT.None>(F: AltMin<F, C>): Alt<F, C>
export function Alt<F>(F: AltMin<HKT.F<F>>): Alt<HKT.F<F>> {
  return HKT.instance<Alt<HKT.F<F>>>({
    ...Functor(F),
    alt_: F.alt_,
    alt: (that) => (fa) => F.alt_(fa, that)
  })
}

export interface AltFn<F extends HKT.HKT, C = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, A>(that: () => HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, A>): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K1, K>,
      HKT.Intro<F, 'Q', Q1, Q>,
      HKT.Intro<F, 'W', W1, W>,
      HKT.Intro<F, 'X', X1, X>,
      HKT.Intro<F, 'I', I1, I>,
      HKT.Intro<F, 'S', S1, S>,
      HKT.Intro<F, 'R', R1, R>,
      HKT.Intro<F, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    HKT.Mix<F, 'I', [I1, I]>,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    A
  >
}

export interface AltFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, K1, Q1, W1, X1, I1, S1, R1, E1, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    that: () => HKT.Kind<
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
      A
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
    A
  >
}

export interface AltWFn<F extends HKT.HKT, C = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, B>(that: () => HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K1, K>,
      HKT.Intro<F, 'Q', Q1, Q>,
      HKT.Intro<F, 'W', W1, W>,
      HKT.Intro<F, 'X', X1, X>,
      HKT.Intro<F, 'I', I1, I>,
      HKT.Intro<F, 'S', S1, S>,
      HKT.Intro<F, 'R', R1, R>,
      HKT.Intro<F, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    HKT.Mix<F, 'I', [I1, I]>,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    A | B
  >
}

export interface AltWFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, K1, Q1, W1, X1, I1, S1, R1, E1, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    that: () => HKT.Kind<
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
      B
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K1, K]>,
    HKT.Mix<F, 'Q', [Q1, Q]>,
    HKT.Mix<F, 'W', [W1, W]>,
    HKT.Mix<F, 'X', [X1, X]>,
    HKT.Mix<F, 'I', [I1, I]>,
    HKT.Mix<F, 'S', [S1, S]>,
    HKT.Mix<F, 'R', [R1, R]>,
    HKT.Mix<F, 'E', [E1, E]>,
    A | B
  >
}
