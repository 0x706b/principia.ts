import type { ApplicativeMin } from './Applicative'
import type { Fail, FailMin } from './Fail'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'

import { Applicative, pureF } from './Applicative'
import { flow } from './function'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Option'

export interface ApplicativeExcept<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Fail<F, C> {
  readonly catchAll_: CatchAllFn_<F, C>
  readonly catchAll: CatchAllFn<F, C>
  readonly catchSome_: CatchSomeFn_<F, C>
  readonly catchSome: CatchSomeFn<F, C>
  readonly either: EitherFn<F, C>
}

export type ApplicativeExceptMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> &
  FailMin<F, C> & {
    readonly catchAll_: CatchAllFn_<F, C>
  }

export function ApplicativeExcept<F extends HKT.URIS, C = HKT.Auto>(
  F: ApplicativeExceptMin<F, C>
): ApplicativeExcept<F, C> {
  const ApplicativeF = Applicative(F)
  const catchSome_   = getCatchSome_(F)
  return HKT.instance<ApplicativeExcept<F, C>>({
    ...ApplicativeF,
    catchAll_: F.catchAll_,
    catchAll: (f) => (fa) => F.catchAll_(fa, f),
    catchSome_,
    catchSome: (f) => (fa) => catchSome_(fa, f),
    either: getEither(F),
    fail: F.fail
  })
}

export interface CatchAllFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (
      e: HKT.OrFix<'E', C, E>
    ) => HKT.Kind<
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
      A1
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
    E1,
    A | A1
  >
}

export interface CatchAllFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    f: (e: HKT.OrFix<'E', C, E>) => HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
  ): <N extends string, K, Q, W, X, I, S, R, A>(
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
    E1,
    A | A1
  >
}

export interface CatchSomeFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (
      e: HKT.OrFix<'E', C, E>
    ) => Option<
      HKT.Kind<
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
        A1
      >
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
    A | A1
  >
}

export function getCatchSome_<F extends HKT.URIS, C = HKT.Auto>(F: ApplicativeExceptMin<F, C>): CatchSomeFn_<F, C> {
  return (fa, f) =>
    F.catchAll_(
      fa,
      flow(
        f,
        O.getOrElse(() => fa)
      )
    )
}

export interface CatchSomeFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    f: (e: HKT.OrFix<'E', C, E>) => Option<HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>>
  ): <N extends string, K, Q, W, X, I, S, R, A>(
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
    A | A1
  >
}

export function getCatchSome<F extends HKT.URIS, C = HKT.Auto>(F: ApplicativeExceptMin<F, C>): CatchSomeFn<F, C> {
  return (f) => (fa) =>
    F.catchAll_(
      fa,
      flow(
        f,
        O.getOrElse(() => fa)
      )
    )
}

export interface EitherFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    never,
    Either<HKT.OrFix<'E', C, E>, A>
  >
}

export function getEither<F extends HKT.URIS, C = HKT.Auto>(F: ApplicativeExceptMin<F, C>): EitherFn<F, C> {
  const pure = pureF(F)
  return (fa) => F.catchAll_(F.map_(fa, E.right), (e) => pure(E.left(e)))
}
