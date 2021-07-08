import type { FunctorMin } from './Functor'

import { identity } from './function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Chain<F extends HKT.URIS, TC = HKT.Auto> extends Functor<F, TC> {
  readonly chain_: ChainFn_<F, TC>
  readonly chain: ChainFn<F, TC>
  readonly flatten: FlattenFn<F, TC>
  readonly tap_: TapFn_<F, TC>
  readonly tap: TapFn<F, TC>
}

export type ChainMin<F extends HKT.URIS, C = HKT.Auto> = FunctorMin<F, C> &
  ({ readonly chain_: ChainFn_<F, C> } | { readonly flatten: FlattenFn<F, C> })

export function Chain<F extends HKT.URIS, C = HKT.Auto>(F: ChainMin<F, C>): Chain<F, C> {
  const FunctorF = Functor(F)
  let chain_: ChainFn_<F, C>
  let flatten: FlattenFn<F, C>

  if ('chain_' in F) {
    chain_  = F.chain_
    flatten = (mma) => F.chain_(mma, identity)
  } else {
    chain_  = (ma, f) => F.flatten(F.map_(ma, f))
    flatten = F.flatten
  }

  const tap_: TapFn_<F, C> = (ma, f) => chain_(ma, (a) => F.map_(f(a), () => a))

  return HKT.instance<Chain<F, C>>({
    ...FunctorF,
    chain_,
    chain: (f) => (ma) => chain_(ma, f),
    flatten,
    tap_,
    tap: (f) => (ma) => tap_(ma, f)
  })
}

export interface ChainFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, A>(
    f: (a: A) => HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    ma: HKT.Kind<
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
    B
  >
}

export interface ChainFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    f: (
      a: A
    ) => HKT.Kind<
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
    B
  >
}

export function chainF_<F extends HKT.URIS, C = HKT.Auto>(F: ChainMin<F, C>): ChainFn_<F, C> {
  if ('chain_' in F) {
    return F.chain_
  } else {
    return (ma, f) => F.flatten(F.map_(ma, f))
  }
}

export interface BindFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    EG1,
    A,
    B
  >(
    f: (
      a: A
    ) => HKT.Kind<
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
    >
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
      B
    >
  >
}

export interface BindFnComposition_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    B
  >(
    fga: HKT.Kind<F, TCF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (
      a: A
    ) => HKT.Kind<
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
    >
  ): HKT.Kind<
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
      B
    >
  >
}

export interface TapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, B>(
    f: (a: A) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N2, N>,
      HKT.Intro<C, 'K', K2, K>,
      HKT.Intro<C, 'Q', Q2, Q>,
      HKT.Intro<C, 'W', W2, W>,
      HKT.Intro<C, 'X', X2, X>,
      HKT.Intro<C, 'I', I2, I>,
      HKT.Intro<C, 'S', S2, S>,
      HKT.Intro<C, 'R', R2, R>,
      HKT.Intro<C, 'E', E2, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N2, N]>,
    HKT.Mix<C, 'K', [K2, K]>,
    HKT.Mix<C, 'Q', [Q2, Q]>,
    HKT.Mix<C, 'W', [W2, W]>,
    HKT.Mix<C, 'X', [X2, X]>,
    HKT.Mix<C, 'I', [I2, I]>,
    HKT.Mix<C, 'S', [S2, S]>,
    HKT.Mix<C, 'R', [R2, R]>,
    HKT.Mix<C, 'E', [E2, E]>,
    A
  >
}

export interface TapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, B>(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N2, N>,
      HKT.Intro<C, 'K', K2, K>,
      HKT.Intro<C, 'Q', Q2, Q>,
      HKT.Intro<C, 'W', W2, W>,
      HKT.Intro<C, 'X', X2, X>,
      HKT.Intro<C, 'I', I2, I>,
      HKT.Intro<C, 'S', S2, S>,
      HKT.Intro<C, 'R', R2, R>,
      HKT.Intro<C, 'E', E2, E>,
      A
    >,
    f: (a: A) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N2, N]>,
    HKT.Mix<C, 'K', [K2, K]>,
    HKT.Mix<C, 'Q', [Q2, Q]>,
    HKT.Mix<C, 'W', [W2, W]>,
    HKT.Mix<C, 'X', [X2, X]>,
    HKT.Mix<C, 'I', [I2, I]>,
    HKT.Mix<C, 'S', [S2, S]>,
    HKT.Mix<C, 'R', [R2, R]>,
    HKT.Mix<C, 'E', [E2, E]>,
    A
  >
}

export function tapF<F extends HKT.URIS, TC = HKT.Auto>(F: ChainMin<F, TC>): TapFn<F, TC> {
  const chain_ = chainF_(F)
  return (f) => (ma) => chain_(ma, (a) => F.map_(f(a), () => a))
}

export function tapF_<F extends HKT.URIS, TC = HKT.Auto>(F: ChainMin<F, TC>): TapFn_<F, TC> {
  const chain_ = chainF_(F)
  return (ma, f) => chain_(ma, (a) => F.map_(f(a), () => a))
}

export interface FlattenFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2>(
    mma: HKT.Kind<
      F,
      TC,
      N2,
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
        HKT.Intro<TC, 'N', N2, N>,
        HKT.Intro<TC, 'K', K2, K>,
        HKT.Intro<TC, 'Q', Q2, Q>,
        HKT.Intro<TC, 'W', W2, W>,
        HKT.Intro<TC, 'X', X2, X>,
        HKT.Intro<TC, 'I', I2, I>,
        HKT.Intro<TC, 'S', S2, S>,
        HKT.Intro<TC, 'R', R2, R>,
        HKT.Intro<TC, 'E', E2, E>,
        A
      >
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N2, N]>,
    HKT.Mix<TC, 'K', [K2, K]>,
    HKT.Mix<TC, 'Q', [Q2, Q]>,
    HKT.Mix<TC, 'W', [W2, W]>,
    HKT.Mix<TC, 'X', [X2, X]>,
    HKT.Mix<TC, 'I', [I2, I]>,
    HKT.Mix<TC, 'S', [S2, S]>,
    HKT.Mix<TC, 'R', [R2, R]>,
    HKT.Mix<TC, 'E', [E2, E]>,
    A
  >
}

export interface FlattenFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    A
  >(
    fgfga: HKT.Kind<
      F,
      TCF,
      NF,
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
        NG,
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
            A
          >
        >
      >
    >
  ): HKT.Kind<
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
      A
    >
  >
}

export function flattenF<F extends HKT.URIS, C = HKT.Auto>(M: ChainMin<F, C>): FlattenFn<F, C> {
  if ('flatten' in M) {
    return M.flatten
  } else {
    return (mma) => M.chain_(mma, identity)
  }
}
