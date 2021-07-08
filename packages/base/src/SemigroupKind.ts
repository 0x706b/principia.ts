import type { Semigroup } from './Semigroup'
import type { SemimonoidalFunctor } from './SemimonoidalFunctor'

import * as HKT from './HKT'

export interface SemigroupKind<A, F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly combine_: CombineKindFn_<A, F, C>
  readonly combine: CombineKindFn<A, F, C>
}

export interface SemigroupKindComposition<A, F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  readonly combine_: CombineKindFnComposition_<A, F, G, CF, CG>
  readonly combine: CombineKindFnComposition<A, F, G, CF, CG>
}

export interface CombineKindFn_<A, F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(
    x: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    y: HKT.Kind<
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
    A
  >
}

export interface CombineKindFn<A, F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(y: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    x: HKT.Kind<
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

export interface CombineKindFnComposition_<A, F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    EG1
  >(
    x: HKT.Kind<
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >,
    y: HKT.Kind<
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
      A
    >
  >
}

export interface CombineKindFnComposition<A, F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <
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
    EG1
  >(
    y: HKT.Kind<
      F,
      CF,
      NF1,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, CG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >
  ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
    x: HKT.Kind<
      F,
      CF,
      HKT.Intro<CF, 'N', NF1, NF>,
      HKT.Intro<CF, 'K', KF1, KF>,
      HKT.Intro<CF, 'Q', QF1, QF>,
      HKT.Intro<CF, 'W', WF1, WF>,
      HKT.Intro<CF, 'X', XF1, XF>,
      HKT.Intro<CF, 'I', IF1, IF>,
      HKT.Intro<CF, 'S', SF1, SF>,
      HKT.Intro<CF, 'R', RF1, RF>,
      HKT.Intro<CF, 'E', EF1, EF>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<CG, 'N', NG1, NG>,
        HKT.Intro<CG, 'K', KG1, KG>,
        HKT.Intro<CG, 'Q', QG1, QG>,
        HKT.Intro<CG, 'W', WG1, WG>,
        HKT.Intro<CG, 'X', XG1, XG>,
        HKT.Intro<CG, 'I', IG1, IG>,
        HKT.Intro<CG, 'S', SG1, SG>,
        HKT.Intro<CG, 'R', RG1, RG>,
        HKT.Intro<CG, 'E', EG1, EG>,
        A
      >
    >
  ) => HKT.Kind<
    F,
    CF,
    HKT.Mix<CF, 'N', [NF1, NF]>,
    HKT.Mix<CF, 'K', [KF1, KF]>,
    HKT.Mix<CF, 'Q', [QF1, QF]>,
    HKT.Mix<CF, 'W', [WF1, WF]>,
    HKT.Mix<CF, 'X', [XF1, XF]>,
    HKT.Mix<CF, 'I', [IF1, IF]>,
    HKT.Mix<CF, 'S', [SF1, SF]>,
    HKT.Mix<CF, 'R', [RF1, RF]>,
    HKT.Mix<CF, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<CG, 'N', [NG1, NG]>,
      HKT.Mix<CG, 'K', [KG1, KG]>,
      HKT.Mix<CG, 'Q', [QG1, QG]>,
      HKT.Mix<CG, 'W', [WG1, WG]>,
      HKT.Mix<CG, 'X', [XG1, XG]>,
      HKT.Mix<CG, 'I', [IG1, IG]>,
      HKT.Mix<CG, 'S', [SG1, SG]>,
      HKT.Mix<CG, 'R', [RG1, RG]>,
      HKT.Mix<CG, 'E', [EG1, EG]>,
      A
    >
  >
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export function liftSemigroup<F extends HKT.URIS, C = HKT.Auto>(
  F: SemimonoidalFunctor<F, C>
): <A>(S: Semigroup<A>) => SemigroupKind<A, F, C> {
  return <A>(S: Semigroup<A>) => {
    const combine_: SemigroupKind<A, F, C>['combine_'] = (fx, fy) => F.crossWith_(fx, fy, S.combine_)
    return HKT.instance<SemigroupKind<A, F, C>>({
      combine_,
      combine: (fy) => (fx) => combine_(fx, fy)
    })
  }
}
