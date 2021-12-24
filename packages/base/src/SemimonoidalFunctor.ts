import type { ApFn, ApFn_ } from './Apply'
import type { Functor2, FunctorMin } from './Functor'
import type { CrossFn_, Semimonoidal, SemimonoidalMin } from './Semimonoidal'

import { Functor, getFunctorComposition } from './Functor'
import * as HKT from './HKT'

export interface SemimonoidalFunctor<F extends HKT.HKT, C = HKT.None> extends Functor<F, C>, Semimonoidal<F, C> {
  readonly crossWith_: CrossWithFn_<F, C>
  readonly crossWith: CrossWithFn<F, C>
}

export type SemimonoidalFunctorMin<F extends HKT.HKT, C = HKT.None> =
  | (SemimonoidalMin<F, C> & FunctorMin<F, C>)
  | ({ readonly crossWith_: CrossWithFn_<F, C> } & FunctorMin<F, C>)
  | ({ readonly crossWith_: CrossWithFn_<F, C> } & SemimonoidalMin<F, C> & FunctorMin<F, C>)

export function SemimonoidalFunctor<F extends HKT.HKT, C = HKT.None>(
  F: SemimonoidalFunctorMin<F, C>
): SemimonoidalFunctor<F, C>
export function SemimonoidalFunctor<F>(F: SemimonoidalFunctorMin<HKT.F<F>>): SemimonoidalFunctor<HKT.F<F>> {
  let cross_: CrossFn_<HKT.F<F>>
  let crossWith_: CrossWithFn_<HKT.F<F>>
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
  return HKT.instance<SemimonoidalFunctor<HKT.F<F>>>({
    ...Functor(F),
    cross_,
    cross: (fb) => (fa) => cross_(fa, fb),
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f)
  })
}

export interface SemimonoidalFunctor2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends Functor2<F, G, CF, CG> {
  readonly crossWith_: CrossWithFn2_<F, G, CF, CG>
  readonly crossWith: CrossWithFn2<F, G, CF, CG>
}

export function getSemimonoidalFunctorComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: SemimonoidalFunctor<F, CF>,
  G: SemimonoidalFunctor<G, CG>
): SemimonoidalFunctor2<F, G, CF, CG>
export function getSemimonoidalFunctorComposition<F, G>(
  F: SemimonoidalFunctor<HKT.F<F>>,
  G: SemimonoidalFunctor<HKT.F<G>>
): SemimonoidalFunctor2<HKT.F<F>, HKT.F<G>> {
  const crossWith_: SemimonoidalFunctor2<HKT.F<F>, HKT.F<G>>['crossWith_'] = (fga, fgb, f) =>
    F.crossWith_(fga, fgb, (ga, gb) => G.crossWith_(ga, gb, f))
  return HKT.instance<SemimonoidalFunctor2<HKT.F<F>, HKT.F<G>>>({
    ...getFunctorComposition(F, G),
    crossWith_,
    crossWith: (fgb, f) => (fga) => crossWith_(fga, fgb, f)
  })
}

export interface CrossWithFn_<F extends HKT.HKT, TC = HKT.None> {
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
    f: (a: A, b: B) => C
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

export interface CrossWithFn<F extends HKT.HKT, TC = HKT.None> {
  <A, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (a: A, b: B) => C
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

export interface CrossWithFn2_<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
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
    B,
    C
  >(
    fga: HKT.Kind<F, TCF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, TCG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    fgb: HKT.Kind<
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
    >,
    f: (a: A, b: B) => C
  ): HKT.Kind<
    F,
    TCF,
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
      TCG,
      HKT.Mix<G, 'K', [KG, KG1]>,
      HKT.Mix<G, 'Q', [QG, QG1]>,
      HKT.Mix<G, 'W', [WG, WG1]>,
      HKT.Mix<G, 'X', [XG, XG1]>,
      HKT.Mix<G, 'I', [IG, IG1]>,
      HKT.Mix<G, 'S', [SG, SG1]>,
      HKT.Mix<G, 'R', [RG, RG1]>,
      HKT.Mix<G, 'E', [EG, EG1]>,
      C
    >
  >
}

export interface CrossWithFn2<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
  <A, KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B, C>(
    fgb: HKT.Kind<
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
    >,
    f: (a: A, b: B) => C
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
      C
    >
  >
}

/*
 * -------------------------------------------------------------------------------------------------
 * Derivatives
 * -------------------------------------------------------------------------------------------------
 */

export function apF_<F extends HKT.HKT, C = HKT.None>(A: SemimonoidalFunctor<F, C>): ApFn_<F, C> {
  return (fab, fa) => A.crossWith_(fab, fa, (f, a) => f(a))
}

export function apF<F extends HKT.HKT, C = HKT.None>(A: SemimonoidalFunctor<F, C>): ApFn<F, C>
export function apF<F>(A: SemimonoidalFunctor<HKT.F<F>>): ApFn<HKT.F<F>> {
  return (fa) => (fab) => A.crossWith_(fab, fa, (f, a) => f(a))
}
