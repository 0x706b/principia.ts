import type { ApFn, ApFn_ } from './Apply'
import type { Functor2, FunctorMin } from './Functor'
import type { CrossFn_, Semimonoidal, SemimonoidalMin } from './Semimonoidal'
import type { EnforceNonEmptyRecord } from './util/types'

import { unsafeCoerce } from './function'
import { Functor, getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import { tuple } from './internal/tuple'

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

export interface CrossSFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, BN extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    name: Exclude<BN, keyof A>,
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
      A1
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
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function crossSF_<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): CrossSFn_<F, C> {
  return (fa, name, fb) => F.crossWith_(fa, fb, (a, b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
}

export interface CrossSFn<F extends HKT.HKT, C = HKT.None> {
  <BN extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
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
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function crossSF<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): CrossSFn<F, C>
export function crossSF<F>(F: SemimonoidalFunctor<HKT.F<F>>): CrossSFn<HKT.F<F>> {
  return (name, fb) => (fa) => F.crossWith_(fa, fb, (a, b) => unsafeCoerce(Object.assign({}, a, { [name]: b })))
}

export interface CrossTFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A extends ReadonlyArray<unknown>>(
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
      A1
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
    readonly [...A, A1]
  >
}

export function crossTF_<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): CrossTFn_<F, C> {
  return (fas, fb) => F.crossWith_(fas, fb, (as, b) => [...as, b])
}

export interface CrossTFn<F extends HKT.HKT, C = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, A1>(fb: HKT.Kind<F, C, K1, Q1, W1, X1, I1, S1, R1, E1, A1>): <
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
    readonly [...A, A1]
  >
}

export function crossTF<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): CrossTFn<F, C>
export function crossTF<F>(F: SemimonoidalFunctor<HKT.F<F>>): CrossTFn<HKT.F<F>> {
  return (fb) => (fas) => F.crossWith_(fas, fb, (a, b) => [...a, b])
}

export interface LiftA2Fn<F extends HKT.HKT, TC = HKT.None> {
  <A, B, D>(f: (a: A) => (b: B) => D): <K, Q, W, X, I, S, R, E, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
  ) => (
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
    >
  ) => HKT.Kind<
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
    D
  >
}

export function liftA2F<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): LiftA2Fn<F, C>
export function liftA2F<F>(F: SemimonoidalFunctor<HKT.F<F>>): LiftA2Fn<HKT.F<F>> {
  return (f) => (fa) => (fb) => F.crossWith_(fa, fb, (a, b) => f(a)(b))
}

export interface MapNFn<F extends HKT.HKT, TC = HKT.None> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<F, 'K', K, any>,
        HKT.Intro<F, 'Q', Q, any>,
        HKT.Intro<F, 'W', W, any>,
        HKT.Intro<F, 'X', X, any>,
        HKT.Intro<F, 'I', I, any>,
        HKT.Intro<F, 'S', S, any>,
        HKT.Intro<F, 'R', R, any>,
        HKT.Intro<F, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<F, 'K', K, any>,
          HKT.Intro<F, 'Q', Q, any>,
          HKT.Intro<F, 'W', W, any>,
          HKT.Intro<F, 'X', X, any>,
          HKT.Intro<F, 'I', I, any>,
          HKT.Intro<F, 'S', S, any>,
          HKT.Intro<F, 'R', R, any>,
          HKT.Intro<F, 'E', E, any>,
          unknown
        >
      >
    ],
    B,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ): (
    ...t: KT
  ) => HKT.Kind<
    F,
    TC,
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

export interface MapNFn_<F extends HKT.HKT, TC = HKT.None> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<F, 'K', K, any>,
        HKT.Intro<F, 'Q', Q, any>,
        HKT.Intro<F, 'W', W, any>,
        HKT.Intro<F, 'X', X, any>,
        HKT.Intro<F, 'I', I, any>,
        HKT.Intro<F, 'S', S, any>,
        HKT.Intro<F, 'R', R, any>,
        HKT.Intro<F, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<F, 'K', K, any>,
          HKT.Intro<F, 'Q', Q, any>,
          HKT.Intro<F, 'W', W, any>,
          HKT.Intro<F, 'X', X, any>,
          HKT.Intro<F, 'I', I, any>,
          HKT.Intro<F, 'S', S, any>,
          HKT.Intro<F, 'R', R, any>,
          HKT.Intro<F, 'E', E, any>,
          unknown
        >
      >
    ],
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    ...t: KT
  ): <B>(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ) => HKT.Kind<
    F,
    TC,
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
export function mapNF<F extends HKT.HKT, C = HKT.None>(A: SemimonoidalFunctor<F, C>): MapNFn<F, C>
export function mapNF<F>(F: SemimonoidalFunctor<HKT.F<F>>): MapNFn<HKT.F<F>> {
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
export function mapNF_<F extends HKT.HKT, C = HKT.None>(A: SemimonoidalFunctor<F, C>): MapNFn_<F, C>
export function mapNF_<F>(F: SemimonoidalFunctor<HKT.F<F>>): MapNFn_<HKT.F<F>> {
  return (...t) =>
    (f) =>
      F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

export interface SequenceSFn<F extends HKT.HKT, TC = HKT.None> {
  <
    KS extends Readonly<
      Record<
        string,
        HKT.Kind<
          F,
          TC,
          HKT.Intro<F, 'K', K, any>,
          HKT.Intro<F, 'Q', Q, any>,
          HKT.Intro<F, 'W', W, any>,
          HKT.Intro<F, 'X', X, any>,
          HKT.Intro<F, 'I', I, any>,
          HKT.Intro<F, 'S', S, any>,
          HKT.Intro<F, 'R', R, any>,
          HKT.Intro<F, 'E', E, any>,
          unknown
        >
      >
    >,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    r: EnforceNonEmptyRecord<KS> &
      Readonly<
        Record<
          string,
          HKT.Kind<
            F,
            TC,
            HKT.Intro<F, 'K', K, any>,
            HKT.Intro<F, 'Q', Q, any>,
            HKT.Intro<F, 'W', W, any>,
            HKT.Intro<F, 'X', X, any>,
            HKT.Intro<F, 'I', I, any>,
            HKT.Intro<F, 'S', S, any>,
            HKT.Intro<F, 'R', R, any>,
            HKT.Intro<F, 'E', E, any>,
            unknown
          >
        >
      >
  ): HKT.Kind<
    F,
    TC,
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

export function sequenceSF<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): SequenceSFn<F, C>
export function sequenceSF<F>(F: SemimonoidalFunctor<HKT.F<F>>): SequenceSFn<HKT.F<F>> {
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

export interface SequenceTFn<F extends HKT.HKT, TC = HKT.None> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<F, 'K', K, any>,
        HKT.Intro<F, 'Q', Q, any>,
        HKT.Intro<F, 'W', W, any>,
        HKT.Intro<F, 'X', X, any>,
        HKT.Intro<F, 'I', I, any>,
        HKT.Intro<F, 'S', S, any>,
        HKT.Intro<F, 'R', R, any>,
        HKT.Intro<F, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<F, 'K', K, any>,
          HKT.Intro<F, 'Q', Q, any>,
          HKT.Intro<F, 'W', W, any>,
          HKT.Intro<F, 'X', X, any>,
          HKT.Intro<F, 'I', I, any>,
          HKT.Intro<F, 'S', S, any>,
          HKT.Intro<F, 'R', R, any>,
          HKT.Intro<F, 'E', E, any>,
          unknown
        >
      >
    ],
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    ...t: KT
  ): HKT.Kind<
    F,
    TC,
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

export function sequenceTF<F extends HKT.HKT, C = HKT.None>(F: SemimonoidalFunctor<F, C>): SequenceTFn<F, C>
export function sequenceTF<F>(F: SemimonoidalFunctor<HKT.F<F>>): SequenceTFn<HKT.F<F>> {
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
    const combined = Array(acc.length + 1)
    for (let i = 0; i < acc.length; i++) {
      combined[i] = acc[i]
    }
    combined[acc.length] = x
    /* eslint-disable-next-line prefer-spread */
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}
/**
 * @internal
 */
const tupleConstructors: Record<number, (a: unknown) => any> = {
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
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]
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
          const r: Record<string, unknown> = {}
          for (let i = 0; i < len; i++) {
            r[keys[i]] = args[i]
          }
          return r
        },
        len - 1,
        []
      )
  }
}

/**
 * @internal
 */
type InferMixStruct<F extends HKT.HKT, C, P extends HKT.ParamName, T, KS> = HKT.MixStruct<
  F,
  P,
  T,
  { [K in keyof KS]: HKT.Infer<F, C, P, KS[K]> }
>

/**
 * @internal
 */
type InferMixTuple<F extends HKT.HKT, C, P extends HKT.ParamName, T, KT> = HKT.MixStruct<
  F,
  P,
  T,
  { [K in keyof KT & number]: HKT.Infer<F, C, P, KT[K]> }
>
