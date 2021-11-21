import type { FunctorMin } from './Functor'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Chain<F extends HKT.HKT, TC = HKT.None> extends Functor<F, TC> {
  readonly chain_: ChainFn_<F, TC>
  readonly chain: ChainFn<F, TC>
  readonly flatten: FlattenFn<F, TC>
  readonly tap_: TapFn_<F, TC>
  readonly tap: TapFn<F, TC>
}

export type ChainMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> &
  ({ readonly chain_: ChainFn_<F, C> } | { readonly flatten: FlattenFn<F, C> })

export function Chain<F extends HKT.HKT, C = HKT.None>(F: ChainMin<F, C>): Chain<F, C>
export function Chain<F>(F: ChainMin<HKT.F<F>>): Chain<HKT.F<F>> {
  const FunctorF = Functor(F)
  let chain_: ChainFn_<HKT.F<F>>
  let flatten: FlattenFn<HKT.F<F>>

  if ('chain_' in F) {
    chain_  = F.chain_
    flatten = (mma) => F.chain_(mma, identity)
  } else {
    chain_  = (ma, f) => F.flatten(F.map_(ma, f))
    flatten = F.flatten
  }

  const tap_: TapFn_<HKT.F<F>> = (ma, f) => chain_(ma, (a) => F.map_(f(a), () => a))

  return HKT.instance<Chain<HKT.F<F>>>({
    ...FunctorF,
    chain_,
    chain: (f) => (ma) => chain_(ma, f),
    flatten,
    tap_,
    tap: (f) => (ma) => tap_(ma, f)
  })
}

export interface ChainFn<F extends HKT.HKT, TC = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, B, A>(f: (a: A) => HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    ma: HKT.Kind<
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
    B
  >
}

export interface ChainFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    ma: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>,
    f: (
      a: A
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
      B
    >
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
    B
  >
}

export function chainF_<F extends HKT.HKT, C = HKT.None>(F: ChainMin<F, C>): ChainFn_<F, C> {
  if ('chain_' in F) {
    return F.chain_
  } else {
    return (ma, f) => F.flatten(F.map_(ma, f))
  }
}

export interface BindFnComposition<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
  <KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A, B>(
    f: (
      a: A
    ) => HKT.Kind<
      F,
      TCF,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, TCG, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
    >
  ): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<
      F,
      TCF,
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
        TCG,
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
    TCF,
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
      TCG,
      HKT.Mix<G, 'K', [KG1, KG]>,
      HKT.Mix<G, 'Q', [QG1, QG]>,
      HKT.Mix<G, 'W', [WG1, WG]>,
      HKT.Mix<G, 'X', [XG1, XG]>,
      HKT.Mix<G, 'I', [IG1, IG]>,
      HKT.Mix<G, 'S', [SG1, SG]>,
      HKT.Mix<G, 'R', [RG1, RG]>,
      HKT.Mix<G, 'E', [EG1, EG]>,
      B
    >
  >
}

export interface BindFnComposition_<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
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
    fga: HKT.Kind<F, TCF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, TCG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (
      a: A
    ) => HKT.Kind<
      F,
      TCF,
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
        TCG,
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
    TCF,
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
      TCG,
      HKT.Mix<G, 'K', [KG1, KG]>,
      HKT.Mix<G, 'Q', [QG1, QG]>,
      HKT.Mix<G, 'W', [WG1, WG]>,
      HKT.Mix<G, 'X', [XG1, XG]>,
      HKT.Mix<G, 'I', [IG1, IG]>,
      HKT.Mix<G, 'S', [SG1, SG]>,
      HKT.Mix<G, 'R', [RG1, RG]>,
      HKT.Mix<G, 'E', [EG1, EG]>,
      B
    >
  >
}

export interface TapFn<F extends HKT.HKT, C = HKT.None> {
  <A, K2, Q2, W2, X2, I2, S2, R2, E2, B>(f: (a: A) => HKT.Kind<F, C, K2, Q2, W2, X2, I2, S2, R2, E2, B>): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K2, K>,
      HKT.Intro<F, 'Q', Q2, Q>,
      HKT.Intro<F, 'W', W2, W>,
      HKT.Intro<F, 'X', X2, X>,
      HKT.Intro<F, 'I', I2, I>,
      HKT.Intro<F, 'S', S2, S>,
      HKT.Intro<F, 'R', R2, R>,
      HKT.Intro<F, 'E', E2, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K2, K]>,
    HKT.Mix<F, 'Q', [Q2, Q]>,
    HKT.Mix<F, 'W', [W2, W]>,
    HKT.Mix<F, 'X', [X2, X]>,
    HKT.Mix<F, 'I', [I2, I]>,
    HKT.Mix<F, 'S', [S2, S]>,
    HKT.Mix<F, 'R', [R2, R]>,
    HKT.Mix<F, 'E', [E2, E]>,
    A
  >
}

export interface TapFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K2, Q2, W2, X2, I2, S2, R2, E2, B>(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K2, K>,
      HKT.Intro<F, 'Q', Q2, Q>,
      HKT.Intro<F, 'W', W2, W>,
      HKT.Intro<F, 'X', X2, X>,
      HKT.Intro<F, 'I', I2, I>,
      HKT.Intro<F, 'S', S2, S>,
      HKT.Intro<F, 'R', R2, R>,
      HKT.Intro<F, 'E', E2, E>,
      A
    >,
    f: (a: A) => HKT.Kind<F, C, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K2, K]>,
    HKT.Mix<F, 'Q', [Q2, Q]>,
    HKT.Mix<F, 'W', [W2, W]>,
    HKT.Mix<F, 'X', [X2, X]>,
    HKT.Mix<F, 'I', [I2, I]>,
    HKT.Mix<F, 'S', [S2, S]>,
    HKT.Mix<F, 'R', [R2, R]>,
    HKT.Mix<F, 'E', [E2, E]>,
    A
  >
}

export function tapF<F extends HKT.HKT, TC = HKT.None>(F: ChainMin<F, TC>): TapFn<F, TC>
export function tapF<F>(F: ChainMin<HKT.F<F>>): TapFn<HKT.F<F>> {
  const chain_ = chainF_(F)
  return (f) => (ma) => chain_(ma, (a) => F.map_(f(a), () => a))
}

export function tapF_<F extends HKT.HKT, TC = HKT.None>(F: ChainMin<F, TC>): TapFn_<F, TC>
export function tapF_<F>(F: ChainMin<HKT.F<F>>): TapFn_<HKT.F<F>> {
  const chain_ = chainF_(F)
  return (ma, f) => chain_(ma, (a) => F.map_(f(a), () => a))
}

export interface FlattenFn<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K2, Q2, W2, X2, I2, S2, R2, E2>(
    mma: HKT.Kind<
      F,
      TC,
      K2,
      Q2,
      W2,
      X2,
      I2,
      S2,
      R2,
      E2,
      HKT.Kind<
        F,
        TC,
        HKT.Intro<F, 'K', K2, K>,
        HKT.Intro<F, 'Q', Q2, Q>,
        HKT.Intro<F, 'W', W2, W>,
        HKT.Intro<F, 'X', X2, X>,
        HKT.Intro<F, 'I', I2, I>,
        HKT.Intro<F, 'S', S2, S>,
        HKT.Intro<F, 'R', R2, R>,
        HKT.Intro<F, 'E', E2, E>,
        A
      >
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<F, 'K', [K2, K]>,
    HKT.Mix<F, 'Q', [Q2, Q]>,
    HKT.Mix<F, 'W', [W2, W]>,
    HKT.Mix<F, 'X', [X2, X]>,
    HKT.Mix<F, 'I', [I2, I]>,
    HKT.Mix<F, 'S', [S2, S]>,
    HKT.Mix<F, 'R', [R2, R]>,
    HKT.Mix<F, 'E', [E2, E]>,
    A
  >
}

export interface FlattenFnComposition<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
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
    A
  >(
    fgfga: HKT.Kind<
      F,
      TCF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<
        G,
        TCG,
        KG,
        QG,
        WG,
        XG,
        IG,
        SG,
        RG,
        EG,
        HKT.Kind<
          F,
          TCF,
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
            TCG,
            HKT.Intro<G, 'K', KG, KG1>,
            HKT.Intro<G, 'Q', QG, QG1>,
            HKT.Intro<G, 'W', WG, WG1>,
            HKT.Intro<G, 'X', XG, XG1>,
            HKT.Intro<G, 'I', IG, IG1>,
            HKT.Intro<G, 'S', SG, SG1>,
            HKT.Intro<G, 'R', RG, RG1>,
            HKT.Intro<G, 'E', EG, EG1>,
            A
          >
        >
      >
    >
  ): HKT.Kind<
    F,
    TCF,
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
      TCG,
      HKT.Mix<G, 'K', [KG1, KG]>,
      HKT.Mix<G, 'Q', [QG1, QG]>,
      HKT.Mix<G, 'W', [WG1, WG]>,
      HKT.Mix<G, 'X', [XG1, XG]>,
      HKT.Mix<G, 'I', [IG1, IG]>,
      HKT.Mix<G, 'S', [SG1, SG]>,
      HKT.Mix<G, 'R', [RG1, RG]>,
      HKT.Mix<G, 'E', [EG1, EG]>,
      A
    >
  >
}

export function flattenF<F extends HKT.HKT, C = HKT.None>(M: ChainMin<F, C>): FlattenFn<F, C> {
  if ('flatten' in M) {
    return M.flatten
  } else {
    return (mma) => M.chain_(mma, identity)
  }
}
