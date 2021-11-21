import type * as HKT from './HKT'

export interface Semimonoidal<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly cross_: CrossFn_<F, C>
  readonly cross: CrossFn<F, C>
}

export type SemimonoidalMin<F extends HKT.HKT, C = HKT.None> = {
  readonly cross_: CrossFn_<F, C>
}

export interface Semimonoidal2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends HKT.Typeclass2<F, G, CF, CG> {
  readonly cross_: CrossFn2_<F, G, CF, CG>
  readonly cross: CrossFn2<F, G, CF, CG>
}

export interface CrossFn<F extends HKT.HKT, C = HKT.None> {
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
    readonly [A, B]
  >
}

export interface CrossFn_<F extends HKT.HKT, C = HKT.None> {
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
    readonly [A, B]
  >
}

export interface CrossFn2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>(
    fgb: HKT.Kind<
      F,
      CF,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, CG, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
    >
  ): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<
      F,
      CF,
      HKT.Intro<F, 'K', KF1, KF>,
      HKT.Intro<F, 'Q', QF1, QF>,
      HKT.Intro<F, 'W', WF1, WF>,
      HKT.Intro<F, 'X', XF1, XF>,
      HKT.Intro<F, 'I', IF1, IF>,
      HKT.Intro<F, 'S', SF1, SF>,
      HKT.Intro<F, 'R', RF1, RF>,
      HKT.Intro<F, 'E', EF1, EF>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<G, 'K', KG1, KG>,
        HKT.Intro<G, 'Q', QG1, QG>,
        HKT.Intro<G, 'W', WG1, WG>,
        HKT.Intro<G, 'X', XG1, XG>,
        HKT.Intro<G, 'I', IG1, IG>,
        HKT.Intro<G, 'S', SG1, SG>,
        HKT.Intro<G, 'R', RG1, RG>,
        HKT.Intro<G, 'E', EG1, EG>,
        A
      >
    >
  ) => HKT.Kind<
    F,
    CF,
    HKT.Mix<F, 'K', [KF1, KF]>,
    HKT.Mix<F, 'Q', [QF1, QF]>,
    HKT.Mix<F, 'W', [WF1, WF]>,
    HKT.Mix<F, 'X', [XF1, XF]>,
    HKT.Mix<F, 'I', [IF1, IF]>,
    HKT.Mix<F, 'S', [SF1, SF]>,
    HKT.Mix<F, 'R', [RF1, RF]>,
    HKT.Mix<F, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<G, 'K', [KG1, KG]>,
      HKT.Mix<G, 'Q', [QG1, QG]>,
      HKT.Mix<G, 'W', [WG1, WG]>,
      HKT.Mix<G, 'X', [XG1, XG]>,
      HKT.Mix<G, 'I', [IG1, IG]>,
      HKT.Mix<G, 'S', [SG1, SG]>,
      HKT.Mix<G, 'R', [RG1, RG]>,
      HKT.Mix<G, 'E', [EG1, EG]>,
      readonly [A, B]
    >
  >
}

export interface CrossFn2_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    KF1,
    QF1,
    WF1,
    XF1,
    IF1,
    SF1,
    RF1,
    EF1,
    KG1,
    QG1,
    WG1,
    XG1,
    IG1,
    SG1,
    RG1,
    EG1,
    A,
    B
  >(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    fgb: HKT.Kind<
      F,
      CF,
      HKT.Intro<F, 'K', KF, KF1>,
      HKT.Intro<F, 'Q', QF, QF1>,
      HKT.Intro<F, 'W', WF, WF1>,
      HKT.Intro<F, 'X', XF, XF1>,
      HKT.Intro<F, 'I', IF, IF1>,
      HKT.Intro<F, 'S', SF, SF1>,
      HKT.Intro<F, 'R', RF, RF1>,
      HKT.Intro<F, 'E', EF, EF1>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<G, 'K', KG, KG1>,
        HKT.Intro<G, 'Q', QG, QG1>,
        HKT.Intro<G, 'W', WG, WG1>,
        HKT.Intro<G, 'X', XG, XG1>,
        HKT.Intro<G, 'I', IG, IG1>,
        HKT.Intro<G, 'S', SG, SG1>,
        HKT.Intro<G, 'R', RG, RG1>,
        HKT.Intro<G, 'E', EG, EG1>,
        B
      >
    >
  ): HKT.Kind<
    F,
    CF,
    HKT.Mix<F, 'K', [KF, KF1]>,
    HKT.Mix<F, 'Q', [QF, QF1]>,
    HKT.Mix<F, 'W', [WF, WF1]>,
    HKT.Mix<F, 'X', [XF, XF1]>,
    HKT.Mix<F, 'I', [IF, IF1]>,
    HKT.Mix<F, 'S', [SF, SF1]>,
    HKT.Mix<F, 'R', [RF, RF1]>,
    HKT.Mix<F, 'E', [EF, EF1]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<G, 'K', [KG, KG1]>,
      HKT.Mix<G, 'Q', [QG, QG1]>,
      HKT.Mix<G, 'W', [WG, WG1]>,
      HKT.Mix<G, 'X', [XG, XG1]>,
      HKT.Mix<G, 'I', [IG, IG1]>,
      HKT.Mix<G, 'S', [SG, SG1]>,
      HKT.Mix<G, 'R', [RG, RG1]>,
      HKT.Mix<G, 'E', [EG, EG1]>,
      readonly [A, B]
    >
  >
}
