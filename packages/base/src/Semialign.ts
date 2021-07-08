import type { FunctorMin } from './Functor'
import type { Option } from './internal/Option'
import type { Semigroup } from './Semigroup'
import type { These } from './These'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'
import * as O from './internal/Option'
import * as T from './internal/These'
import { tuple } from './internal/tuple'

export interface Semialign<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
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

export type SemialignMin<F extends HKT.URIS, C = HKT.Auto> = (
  | { readonly alignWith_: AlignWithFn_<F, C> }
  | { readonly align_: AlignFn_<F, C> }
) &
  FunctorMin<F, C>

export function Semialign<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): Semialign<F, C> {
  const alignCombine_ = alignCombineF_(F)
  const padZip_       = padZipF_(F)
  const padZipWith_   = padZipWithF_(F)
  const zipAll_       = zipAllF_(F)
  if ('alignWith_' in F) {
    const align_: Semialign<F, C>['align_'] = (fa, fb) => F.alignWith_(fa, fb, identity)
    return HKT.instance<Semialign<F, C>>({
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
    const alignWith_: Semialign<F, C>['alignWith_'] = (fa, fb, f) => F.map_(F.align_(fa, fb), f)
    return HKT.instance<Semialign<F, C>>({
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

export interface AlignFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      B
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    These<A, B>
  >
}

export interface AlignFn<F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
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
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    These<A, B>
  >
}

export interface AlignWithFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N, N1>,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      HKT.Intro<TC, 'I', I, I1>,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      HKT.Intro<TC, 'E', E, E1>,
      B
    >,
    f: (th: These<A, B>) => C
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    C
  >
}

export interface AlignWithFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (th: These<A, B>) => C
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N1, N>,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      HKT.Intro<TC, 'I', I1, I>,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      HKT.Intro<TC, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N1, N]>,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    HKT.Mix<TC, 'I', [I1, I]>,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    C
  >
}

export function alignWithF_<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): AlignWithFn_<F, C> {
  if ('alignWith_' in F) {
    return F.alignWith_
  } else {
    return (fa, fb, f) => F.map_(F.align_(fa, fb), f)
  }
}

export interface AlignCombineFn_<F extends HKT.URIS, C = HKT.Auto> {
  <A>(S: Semigroup<A>): <N extends string, K, Q, W, X, I, S, R, E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fa1: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fa2: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    A
  >
}

export interface AlignCombineFn<F extends HKT.URIS, C = HKT.Auto> {
  <A>(S: Semigroup<A>): <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A>
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    A
  >
}

export function alignCombineF_<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): AlignCombineFn_<F, C> {
  const alignWith_ = alignWithF_(F)
  return (S) => (fa1, fa2) => alignWith_(fa1, fa2, T.match(identity, identity, S.combine_))
}

export function alignCombineF<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): AlignCombineFn<F, C> {
  return (S) => (fb) => (fa) => alignCombineF_(F)(S)(fa, fb)
}

export interface PadZipFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      B
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    readonly [Option<A>, Option<B>]
  >
}

export interface PadZipFn<F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
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
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    readonly [Option<A>, Option<B>]
  >
}

export function padZipF_<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): PadZipFn_<F, C> {
  const padZipWith_ = padZipWithF_(F)
  return (fa, fb) => padZipWith_(fa, fb, identity)
}

export function padZipF<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): PadZipFn<F, C> {
  return (fb) => (fa) => padZipF_(F)(fa, fb)
}

export interface PadZipWithFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, D>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      B
    >,
    f: (_: readonly [Option<A>, Option<B>]) => D
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    D
  >
}

export interface PadZipWithFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, D>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (_: readonly [Option<A>, Option<B>]) => D
  ): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    D
  >
}

export function padZipWithF_<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): PadZipWithFn_<F, C> {
  const alignWith_ = alignWithF_(F)
  return (fa, fb, f) =>
    alignWith_(
      fa,
      fb,
      T.match(
        (a) => f([O.some(a), O.none()]),
        (b) => f([O.none(), O.some(b)]),
        (a, b) => f([O.some(a), O.some(b)])
      )
    )
}

export function padZipWithF<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): PadZipWithFn<F, C> {
  return (fb, f) => (fa) => padZipWithF_(F)(fa, fb, f)
}

export interface ZipAllFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      B
    >,
    a: A,
    b: B
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    readonly [A, B]
  >
}

export interface ZipAllFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    a: A,
    b: B
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    readonly [A, B]
  >
}

export function zipAllF_<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): ZipAllFn_<F, C> {
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

export function zipAllF<F extends HKT.URIS, C = HKT.Auto>(F: SemialignMin<F, C>): ZipAllFn<F, C> {
  return (fb, a, b) => (fa) => zipAllF_(F)(fa, fb, a, b)
}
