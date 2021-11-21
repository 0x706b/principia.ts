import type { FunctorMin } from './Functor'
import type { Maybe } from './internal/Maybe'
import type { Semigroup } from './Semigroup'
import type { These } from './These'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'
import * as M from './internal/Maybe'
import * as T from './internal/These'
import { tuple } from './internal/tuple'

export interface Semialign<F extends HKT.HKT, C = HKT.None> extends Functor<F, C> {
  readonly alignWith_: AlignWithFn_<F, C>
  readonly alignWith: AlignWithFn<F, C>
  readonly align_: AlignFn_<F, C>
  readonly align: AlignFn<F, C>
  readonly alignCombine_: AlignCombineFn_<F, C>
  readonly alignCombine: AlignCombineFn<F, C>
  readonly padZip_: PadZipFn_<F, C>
  readonly padZip: PadZipFn<F, C>
  readonly padZipWith_: PadZipWithFn_<F, C>
  readonly padZipWith: PadZipWithFn<F, C>
  readonly zipAll_: ZipAllFn_<F, C>
  readonly zipAll: ZipAllFn<F, C>
}

export type SemialignMin<F extends HKT.HKT, C = HKT.None> = (
  | { readonly alignWith_: AlignWithFn_<F, C> }
  | { readonly align_: AlignFn_<F, C> }
) &
  FunctorMin<F, C>

export function Semialign<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): Semialign<F, C>
export function Semialign<F>(F: SemialignMin<HKT.F<F>>): Semialign<HKT.F<F>> {
  const alignCombine_ = alignCombineF_(F)
  const padZip_       = padZipF_(F)
  const padZipWith_   = padZipWithF_(F)
  const zipAll_       = zipAllF_(F)
  if ('alignWith_' in F) {
    const align_: Semialign<HKT.F<F>>['align_'] = (fa, fb) => F.alignWith_(fa, fb, identity)
    return HKT.instance<Semialign<HKT.F<F>>>({
      ...Functor(F),
      alignWith_: F.alignWith_,
      alignWith: (fb, f) => (fa) => F.alignWith_(fa, fb, f),
      align_,
      align: (fb) => (fa) => align_(fa, fb),
      alignCombine_,
      alignCombine: (S) => (fb) => (fa) => alignCombine_(S)(fa, fb),
      padZip_,
      padZip: (fb) => (fa) => padZip_(fa, fb),
      padZipWith_,
      padZipWith: (fb, f) => (fa) => padZipWith_(fa, fb, f),
      zipAll_,
      zipAll: (fb, a, b) => (fa) => zipAll_(fa, fb, a, b)
    })
  } else {
    const alignWith_: Semialign<HKT.F<F>>['alignWith_'] = (fa, fb, f) => F.map_(F.align_(fa, fb), f)
    return HKT.instance<Semialign<HKT.F<F>>>({
      ...Functor(F),
      alignWith_,
      alignWith: (fb, f) => (fa) => alignWith_(fa, fb, f),
      align_: F.align_,
      align: (fb) => (fa) => F.align_(fa, fb),
      alignCombine_,
      alignCombine: (S) => (fb) => (fa) => alignCombine_(S)(fa, fb),
      padZip_,
      padZip: (fb) => (fa) => padZip_(fa, fb),
      padZipWith_,
      padZipWith: (fb, f) => (fa) => padZipWith_(fa, fb, f),
      zipAll_,
      zipAll: (fb, a, b) => (fa) => zipAll_(fa, fb, a, b)
    })
  }
}

export interface AlignFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    HKT.Mix<F, 'I', [I, I1]>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    These<A, B>
  >
}

export interface AlignFn<F extends HKT.HKT, C = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
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
    These<A, B>
  >
}

export interface AlignWithFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
      B
    >,
    f: (th: These<A, B>) => C
  ): HKT.Kind<
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
    C
  >
}

export interface AlignWithFn<F extends HKT.HKT, TC = HKT.None> {
  <A, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (th: These<A, B>) => C
  ): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
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
      A
    >
  ) => HKT.Kind<
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
    C
  >
}

export function alignWithF_<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): AlignWithFn_<F, C> {
  if ('alignWith_' in F) {
    return F.alignWith_
  } else {
    return (fa, fb, f) => F.map_(F.align_(fa, fb), f)
  }
}

export interface AlignCombineFn_<F extends HKT.HKT, C = HKT.None> {
  <A>(S: Semigroup<A>): <K, Q, W, X, I, S, R, E, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fa1: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    fa2: HKT.Kind<
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
  ) => HKT.Kind<
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

export interface AlignCombineFn<F extends HKT.HKT, C = HKT.None> {
  <A>(S: Semigroup<A>): <K1, Q1, W1, X1, I1, S1, R1, E1>(
    fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, A>
  ) => <K, Q, W, X, I, S, R, E>(
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

export function alignCombineF_<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): AlignCombineFn_<F, C> {
  const alignWith_ = alignWithF_(F)
  return (S) => (fa1, fa2) => alignWith_(fa1, fa2, T.match(identity, identity, S.combine_))
}

export function alignCombineF<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): AlignCombineFn<F, C>
export function alignCombineF<F>(F: SemialignMin<HKT.F<F>>): AlignCombineFn<HKT.F<F>> {
  return (S) => (fb) => (fa) => alignCombineF_(F)(S)(fa, fb)
}

export interface PadZipFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    HKT.Mix<F, 'I', [I, I1]>,
    HKT.Mix<F, 'S', [S, S1]>,
    HKT.Mix<F, 'R', [R, R1]>,
    HKT.Mix<F, 'E', [E, E1]>,
    readonly [Maybe<A>, Maybe<B>]
  >
}

export interface PadZipFn<F extends HKT.HKT, C = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
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
    readonly [Maybe<A>, Maybe<B>]
  >
}

export function padZipF_<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): PadZipFn_<F, C> {
  const padZipWith_ = padZipWithF_(F)
  return (fa, fb) => padZipWith_(fa, fb, identity)
}

export function padZipF<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): PadZipFn<F, C>
export function padZipF<F>(F: SemialignMin<HKT.F<F>>): PadZipFn<HKT.F<F>> {
  return (fb) => (fa) => padZipF_(F)(fa, fb)
}

export interface PadZipWithFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B, D>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
    >,
    f: (_: readonly [Maybe<A>, Maybe<B>]) => D
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
    D
  >
}

export interface PadZipWithFn<F extends HKT.HKT, C = HKT.None> {
  <A, K1, Q1, W1, X1, I1, S1, R1, E1, B, D>(
    fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (_: readonly [Maybe<A>, Maybe<B>]) => D
  ): <K, Q, W, X, I, S, R, E>(
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
    D
  >
}

export function padZipWithF_<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): PadZipWithFn_<F, C> {
  const alignWith_ = alignWithF_(F)
  return (fa, fb, f) =>
    alignWith_(
      fa,
      fb,
      T.match(
        (a) => f([M.just(a), M.nothing()]),
        (b) => f([M.nothing(), M.just(b)]),
        (a, b) => f([M.just(a), M.just(b)])
      )
    )
}

export function padZipWithF<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): PadZipWithFn<F, C>
export function padZipWithF<F>(F: SemialignMin<HKT.F<F>>): PadZipWithFn<HKT.F<F>> {
  return (fb, f) => (fa) => padZipWithF_(F)(fa, fb, f)
}

export interface ZipAllFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
    >,
    a: A,
    b: B
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
    readonly [A, B]
  >
}

export interface ZipAllFn<F extends HKT.HKT, C = HKT.None> {
  <A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, B>, a: A, b: B): <
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
    readonly [A, B]
  >
}

export function zipAllF_<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): ZipAllFn_<F, C> {
  const alignWith_ = alignWithF_(F)
  return (fa, fb, a, b) =>
    alignWith_(
      fa,
      fb,
      T.match(
        (x) => [x, b],
        (x) => [a, x],
        tuple
      )
    )
}

export function zipAllF<F extends HKT.HKT, C = HKT.None>(F: SemialignMin<F, C>): ZipAllFn<F, C>
export function zipAllF<F>(F: SemialignMin<HKT.F<F>>): ZipAllFn<HKT.F<F>> {
  return (fb, a, b) => (fa) => zipAllF_(F)(fa, fb, a, b)
}
