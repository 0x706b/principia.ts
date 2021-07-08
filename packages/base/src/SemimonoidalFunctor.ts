import type { ApFn, ApFn_ } from './Apply'
import type { Functor2, FunctorMin } from './Functor'
import type { CrossFn_, Semimonoidal, SemimonoidalMin } from './Semimonoidal'
import type { EnforceNonEmptyRecord } from './util/types'

import { Functor, getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import { tuple } from './internal/tuple'
import * as Z from './util/Zipped'

export interface SemimonoidalFunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Semimonoidal<F, C> {
  readonly crossWith_: CrossWithFn_<F, C>
  readonly crossWith: CrossWithFn<F, C>
}

export type SemimonoidalFunctorMin<F extends HKT.URIS, C = HKT.Auto> =
  | (SemimonoidalMin<F, C> & FunctorMin<F, C>)
  | ({ readonly crossWith_: CrossWithFn_<F, C> } & FunctorMin<F, C>)
  | ({ readonly crossWith_: CrossWithFn_<F, C> } & SemimonoidalMin<F, C> & FunctorMin<F, C>)

export function SemimonoidalFunctor<F extends HKT.URIS, C = HKT.Auto>(
  F: SemimonoidalFunctorMin<F, C>
): SemimonoidalFunctor<F, C> {
  let cross_: CrossFn_<F, C>
  let crossWith_: CrossWithFn_<F, C>
  if ('crossWith_' in F) {
    if ('cross_' in F) {
      cross_     = F.cross_
      crossWith_ = F.crossWith_
    } else {
      crossWith_ = F.crossWith_
      cross_     = (fa, fb) => crossWith_(fa, fb, (a, b) => [a, b])
    }
  } else {
    cross_     = F.cross_
    crossWith_ = (fa, fb, f) => F.map_(cross_(fa, fb), (ab) => f(ab[0], ab[1]))
  }
  return HKT.instance<SemimonoidalFunctor<F, C>>({
    ...Functor(F),
    cross_,
    cross: (fb) => (fa) => cross_(fa, fb),
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f)
  })
}

export interface SemimonoidalFunctor2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends Functor2<F, G, CF, CG> {
  readonly crossWith_: CrossWithFn2_<F, G, CF, CG>
  readonly crossWith: CrossWithFn2<F, G, CF, CG>
}

export function getSemimonoidalFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: SemimonoidalFunctor<F, CF>,
  G: SemimonoidalFunctor<G, CG>
): SemimonoidalFunctor2<F, G, CF, CG> {
  const crossWith_: SemimonoidalFunctor2<F, G, CF, CG>['crossWith_'] = (fga, fgb, f) =>
    F.crossWith_(fga, fgb, (ga, gb) => G.crossWith_(ga, gb, f))
  return HKT.instance({
    ...getFunctorComposition(F, G),
    crossWith_,
    crossWith: (fgb, f) => (fga) => crossWith_(fga, fgb, f)
  })
}

export interface CrossWithFn_<F extends HKT.URIS, TC = HKT.Auto> {
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
    f: (a: A, b: B) => C
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

export interface CrossWithFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (a: A, b: B) => C
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

export interface CrossWithFn2_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  <
    NF extends string,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    NG extends string,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    NF1 extends string,
    KF1,
    QF1,
    WF1,
    XF1,
    IF1,
    SF1,
    RF1,
    EF1,
    NG1 extends string,
    KG1,
    QG1,
    WG1,
    XG1,
    IG1,
    SG1,
    RG1,
    EG1,
    A,
    B,
    C
  >(
    fga: HKT.Kind<F, TCF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    fgb: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, 'N', NF, NF1>,
      HKT.Intro<TCF, 'K', KF, KF1>,
      HKT.Intro<TCF, 'Q', QF, QF1>,
      HKT.Intro<TCF, 'W', WF, WF1>,
      HKT.Intro<TCF, 'X', XF, XF1>,
      HKT.Intro<TCF, 'I', IF, IF1>,
      HKT.Intro<TCF, 'S', SF, SF1>,
      HKT.Intro<TCF, 'R', RF, RF1>,
      HKT.Intro<TCF, 'E', EF, EF1>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, 'N', NG, NG1>,
        HKT.Intro<TCG, 'K', KG, KG1>,
        HKT.Intro<TCG, 'Q', QG, QG1>,
        HKT.Intro<TCG, 'W', WG, WG1>,
        HKT.Intro<TCG, 'X', XG, XG1>,
        HKT.Intro<TCG, 'I', IG, IG1>,
        HKT.Intro<TCG, 'S', SG, SG1>,
        HKT.Intro<TCG, 'R', RG, RG1>,
        HKT.Intro<TCG, 'E', EG, EG1>,
        B
      >
    >,
    f: (a: A, b: B) => C
  ): HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, 'N', [NF, NF1]>,
    HKT.Mix<TCF, 'K', [KF, KF1]>,
    HKT.Mix<TCF, 'Q', [QF, QF1]>,
    HKT.Mix<TCF, 'W', [WF, WF1]>,
    HKT.Mix<TCF, 'X', [XF, XF1]>,
    HKT.Mix<TCF, 'I', [IF, IF1]>,
    HKT.Mix<TCF, 'S', [SF, SF1]>,
    HKT.Mix<TCF, 'R', [RF, RF1]>,
    HKT.Mix<TCF, 'E', [EF, EF1]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, 'N', [NG, NG1]>,
      HKT.Mix<TCG, 'K', [KG, KG1]>,
      HKT.Mix<TCG, 'Q', [QG, QG1]>,
      HKT.Mix<TCG, 'W', [WG, WG1]>,
      HKT.Mix<TCG, 'X', [XG, XG1]>,
      HKT.Mix<TCG, 'I', [IG, IG1]>,
      HKT.Mix<TCG, 'S', [SG, SG1]>,
      HKT.Mix<TCG, 'R', [RG, RG1]>,
      HKT.Mix<TCG, 'E', [EG, EG1]>,
      C
    >
  >
}

export interface CrossWithFn2<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  <
    A,
    NF1 extends string,
    KF1,
    QF1,
    WF1,
    XF1,
    IF1,
    SF1,
    RF1,
    EF1,
    NG1 extends string,
    KG1,
    QG1,
    WG1,
    XG1,
    IG1,
    SG1,
    RG1,
    EG1,
    B,
    C
  >(
    fgb: HKT.Kind<
      F,
      TCF,
      NF1,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
    >,
    f: (a: A, b: B) => C
  ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, 'N', NF1, NF>,
      HKT.Intro<TCF, 'K', KF1, KF>,
      HKT.Intro<TCF, 'Q', QF1, QF>,
      HKT.Intro<TCF, 'W', WF1, WF>,
      HKT.Intro<TCF, 'X', XF1, XF>,
      HKT.Intro<TCF, 'I', IF1, IF>,
      HKT.Intro<TCF, 'S', SF1, SF>,
      HKT.Intro<TCF, 'R', RF1, RF>,
      HKT.Intro<TCF, 'E', EF1, EF>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, 'N', NG1, NG>,
        HKT.Intro<TCG, 'K', KG1, KG>,
        HKT.Intro<TCG, 'Q', QG1, QG>,
        HKT.Intro<TCG, 'W', WG1, WG>,
        HKT.Intro<TCG, 'X', XG1, XG>,
        HKT.Intro<TCG, 'I', IG1, IG>,
        HKT.Intro<TCG, 'S', SG1, SG>,
        HKT.Intro<TCG, 'R', RG1, RG>,
        HKT.Intro<TCG, 'E', EG1, EG>,
        A
      >
    >
  ) => HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, 'N', [NF1, NF]>,
    HKT.Mix<TCF, 'K', [KF1, KF]>,
    HKT.Mix<TCF, 'Q', [QF1, QF]>,
    HKT.Mix<TCF, 'W', [WF1, WF]>,
    HKT.Mix<TCF, 'X', [XF1, XF]>,
    HKT.Mix<TCF, 'I', [IF1, IF]>,
    HKT.Mix<TCF, 'S', [SF1, SF]>,
    HKT.Mix<TCF, 'R', [RF1, RF]>,
    HKT.Mix<TCF, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, 'N', [NG1, NG]>,
      HKT.Mix<TCG, 'K', [KG1, KG]>,
      HKT.Mix<TCG, 'Q', [QG1, QG]>,
      HKT.Mix<TCG, 'W', [WG1, WG]>,
      HKT.Mix<TCG, 'X', [XG1, XG]>,
      HKT.Mix<TCG, 'I', [IG1, IG]>,
      HKT.Mix<TCG, 'S', [SG1, SG]>,
      HKT.Mix<TCG, 'R', [RG1, RG]>,
      HKT.Mix<TCG, 'E', [EG1, EG]>,
      C
    >
  >
}

/*
 * -------------------------------------------------------------------------------------------------
 * Derivatives
 * -------------------------------------------------------------------------------------------------
 */

export function apF_<F extends HKT.URIS, C = HKT.Auto>(A: SemimonoidalFunctor<F, C>): ApFn_<F, C> {
  return (fab, fa) => A.crossWith_(fab, fa, (f, a) => f(a))
}

export function apF<F extends HKT.URIS, C = HKT.Auto>(A: SemimonoidalFunctor<F, C>): ApFn<F, C> {
  return (fa) => (fab) => A.crossWith_(fab, fa, (f, a) => f(a))
}

export interface CrossSFn_<F extends HKT.URIS, C = HKT.Auto> {
  <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    BN extends string,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    A
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
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
    HKT.Mix<C, 'E', [E, E1]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function crossSF_<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): CrossSFn_<F, C> {
  return (fa, name, fb) => F.crossWith_(fa, fb, (a, b) => Object.assign({}, a, { [name]: b }))
}

export interface CrossSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
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
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function crossSF<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): CrossSFn<F, C> {
  return (name, fb) => (fa) => F.crossWith_(fa, fb, (a, b) => Object.assign({}, a, { [name]: b }))
}

export interface CrossTFn_<F extends HKT.URIS, C = HKT.Auto> {
  <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    A extends ReadonlyArray<unknown>
  >(
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
    HKT.Mix<C, 'E', [E, E1]>,
    readonly [...A, A1]
  >
}

export function crossTF_<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): CrossTFn_<F, C> {
  return (fas, fb) => F.crossWith_(fas, fb, (as, b) => [...as, b])
}

export interface CrossTFn<F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A extends ReadonlyArray<unknown>
  >(
    fas: HKT.Kind<
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
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    readonly [...A, A1]
  >
}

export function crossTF<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): CrossTFn<F, C> {
  return (fb) => (fas) => F.crossWith_(fas, fb, (a, b) => [...a, b])
}

export interface LiftA2Fn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, B, D>(f: (a: A) => (b: B) => D): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1
  >(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => (
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
    >
  ) => HKT.Kind<
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
    D
  >
}

export function liftA2F<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): LiftA2Fn<F, C> {
  return (f) => (fa) => (fb) => F.crossWith_(fa, fb, f)
}

export interface MapNFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    B,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ): (
    ...t: KT
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

export interface MapNFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): <B>(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

/**
 * ```haskell
 * mapNF :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF<F extends HKT.URIS, C = HKT.Auto>(A: SemimonoidalFunctor<F, C>): MapNFn<F, C>
export function mapNF<F>(F: SemimonoidalFunctor<HKT.UHKT<F>>): MapNFn<HKT.UHKT<F>> {
  return (f) =>
    (...t) =>
      F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

/**
 * ```haskell
 * mapNF_ :: Apply f => (fa, fb, ...) -> ([a, b, ...] -> c) -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF_<F extends HKT.URIS, C = HKT.Auto>(A: SemimonoidalFunctor<F, C>): MapNFn_<F, C>
export function mapNF_<F>(F: SemimonoidalFunctor<HKT.UHKT<F>>): MapNFn_<HKT.UHKT<F>> {
  return (...t) =>
    (f) =>
      F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

export interface SequenceSFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KS extends Readonly<
      Record<
        string,
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    >,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    r: EnforceNonEmptyRecord<KS> &
      Readonly<
        Record<
          string,
          HKT.Kind<
            F,
            TC,
            HKT.Intro<TC, 'N', N, any>,
            HKT.Intro<TC, 'K', K, any>,
            HKT.Intro<TC, 'Q', Q, any>,
            HKT.Intro<TC, 'W', W, any>,
            HKT.Intro<TC, 'X', X, any>,
            HKT.Intro<TC, 'I', I, any>,
            HKT.Intro<TC, 'S', S, any>,
            HKT.Intro<TC, 'R', R, any>,
            HKT.Intro<TC, 'E', E, any>,
            unknown
          >
        >
      >
  ): HKT.Kind<
    F,
    TC,
    InferMixStruct<F, TC, 'N', N, KS>,
    InferMixStruct<F, TC, 'K', K, KS>,
    InferMixStruct<F, TC, 'Q', Q, KS>,
    InferMixStruct<F, TC, 'W', W, KS>,
    InferMixStruct<F, TC, 'X', X, KS>,
    InferMixStruct<F, TC, 'I', I, KS>,
    InferMixStruct<F, TC, 'S', S, KS>,
    InferMixStruct<F, TC, 'R', R, KS>,
    InferMixStruct<F, TC, 'E', E, KS>,
    {
      [K in keyof KS]: HKT.Infer<F, TC, 'A', KS[K]>
    }
  >
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): SequenceSFn<F, C>
export function sequenceSF<F>(F: SemimonoidalFunctor<HKT.UHKT<F>>): SequenceSFn<HKT.UHKT<F>> {
  const ap_ = apF_(F)
  return (r) => {
    const keys = Object.keys(r)
    const len  = keys.length
    const f    = getRecordConstructor(keys)
    let fr     = F.map_(r[keys[0]], f)
    for (let i = 1; i < len; i++) {
      fr = ap_(fr, r[keys[i]]) as any
    }
    return fr
  }
}

export interface SequenceTFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    {
      [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]>
    }
  >
}

export function sequenceTF<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctor<F, C>): SequenceTFn<F, C>
export function sequenceTF<F>(F: SemimonoidalFunctor<HKT.UHKT<F>>): SequenceTFn<HKT.UHKT<F>> {
  const ap_ = apF_(F)
  return (...t) => {
    const len = t.length
    const f   = getTupleConstructor(len)
    let fas   = F.map_(t[0], f)
    for (let i = 1; i < len; i++) {
      fas = ap_(fas, t[i]) as any
    }
    return fas as any
  }
}

export interface CrossFlatFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
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
    >
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
    Z.Zip<A, B>
  >
}

export function crossFlatF_<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctorMin<F, C>): CrossFlatFn_<F, C> {
  if ('crossWith_' in F) {
    return (fa, fb) => F.crossWith_(fa, fb, Z.zip)
  } else {
    return (fa, fb) => F.map_(F.cross_(fa, fb), ([a, b]) => Z.zip(a, b))
  }
}

export interface CrossFlatFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>
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
    Z.Zip<A, B>
  >
}

export function crossFlatF<F extends HKT.URIS, C = HKT.Auto>(F: SemimonoidalFunctorMin<F, C>): CrossFlatFn<F, C> {
  if ('crossWith_' in F) {
    return (fb) => (fa) => F.crossWith_(fa, fb, Z.zip)
  } else {
    return (fb) => (fa) => F.map_(F.cross_(fa, fb), ([a, b]) => Z.zip(a, b))
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @internal
 */
function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const mut_combined = Array(acc.length + 1)
    for (let i = 0; i < acc.length; i++) {
      mut_combined[i] = acc[i]
    }
    mut_combined[acc.length] = x
    /* eslint-disable-next-line prefer-spread */
    return n === 0 ? f.apply(null, mut_combined) : curried(f, n - 1, mut_combined)
  }
}
/**
 * @internal
 */
const mut_tupleConstructors: Record<number, (a: unknown) => any> = {
  1: (a) => [a],
  2: (a) => (b: any) => [a, b],
  3: (a) => (b: any) => (c: any) => [a, b, c],
  4: (a) => (b: any) => (c: any) => (d: any) => [a, b, c, d],
  5: (a) => (b: any) => (c: any) => (d: any) => (e: any) => [a, b, c, d, e]
}

/**
 * @internal
 */
function getTupleConstructor(len: number): (a: unknown) => any {
  /* eslint-disable-next-line no-prototype-builtins */
  if (!mut_tupleConstructors.hasOwnProperty(len)) {
    mut_tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return mut_tupleConstructors[len]
}

/**
 * @internal
 */
function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  switch (len) {
    case 1:
      return (a: any) => ({ [keys[0]]: a })
    case 2:
      return (a: any) => (b: any) => ({ [keys[0]]: a, [keys[1]]: b })
    case 3:
      return (a: any) => (b: any) => (c: any) => ({ [keys[0]]: a, [keys[1]]: b, [keys[2]]: c })
    case 4:
      return (a: any) => (b: any) => (c: any) => (d: any) => ({
        [keys[0]]: a,
        [keys[1]]: b,
        [keys[2]]: c,
        [keys[3]]: d
      })
    case 5:
      return (a: any) => (b: any) => (c: any) => (d: any) => (e: any) => ({
        [keys[0]]: a,
        [keys[1]]: b,
        [keys[2]]: c,
        [keys[3]]: d,
        [keys[4]]: e
      })
    default:
      return curried(
        (...args: ReadonlyArray<unknown>) => {
          const mut_r: Record<string, unknown> = {}
          for (let i = 0; i < len; i++) {
            mut_r[keys[i]] = args[i]
          }
          return mut_r
        },
        len - 1,
        []
      )
  }
}

/**
 * @internal
 */
type InferMixStruct<F extends HKT.URIS, TC, P extends HKT.Param, T, KS> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KS]: HKT.Infer<F, TC, P, KS[K]> }
>

/**
 * @internal
 */
type InferMixTuple<F extends HKT.URIS, TC, P extends HKT.Param, T, KT> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KT & number]: HKT.Infer<F, TC, P, KT[K]> }
>
