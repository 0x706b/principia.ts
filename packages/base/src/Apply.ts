import type { FunctorMin } from './Functor'
import type { CrossFn_ } from './Semimonoidal'
import type { CrossWithFn_, SemimonoidalFunctor2, SemimonoidalFunctorMin } from './SemimonoidalFunctor'
import type { EnforceNonEmptyRecord } from './util/types'

import { pipe } from './function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import { tuple } from './internal/tuple'
import { apF_, SemimonoidalFunctor } from './SemimonoidalFunctor'

/**
 * A lax semimonoidal endofunctor
 *
 * `Apply` is isomorphic to `SemimonoidalFunctor`
 */
export interface Apply<F extends HKT.HKT, C = HKT.None> extends SemimonoidalFunctor<F, C> {
  readonly ap_: ApFn_<F, C>
  readonly ap: ApFn<F, C>
  readonly apFirst_: ApFirstFn_<F, C>
  readonly apFirst: ApFirstFn<F, C>
  readonly apSecond_: ApSecondFn_<F, C>
  readonly apSecond: ApSecondFn<F, C>
}

export type ApplyMin<F extends HKT.HKT, C = HKT.None> =
  | SemimonoidalFunctorMin<F, C>
  | ({ readonly ap_: ApFn_<F, C> } & FunctorMin<F, C>)
  | ({ readonly ap_: ApFn_<F, C> } & SemimonoidalFunctorMin<F, C>)

export function Apply<F extends HKT.HKT, C = HKT.None>(F: ApplyMin<F, C>): Apply<F, C>
export function Apply<F>(F: ApplyMin<HKT.F<F>>): Apply<HKT.F<F>> {
  let ap_: ApFn_<HKT.F<F>>
  let SF: SemimonoidalFunctor<HKT.F<F>>
  if ('ap_' in F) {
    if ('cross_' in F || 'crossWith_' in F) {
      SF  = SemimonoidalFunctor(F)
      ap_ = F.ap_
    } else {
      SF  = SemimonoidalFunctor({ map_: F.map_, crossWith_: crossWithF_(F), cross_: crossF_(F) })
      ap_ = F.ap_
    }
  } else {
    SF  = SemimonoidalFunctor(F)
    ap_ = apF_(SF)
  }
  return HKT.instance<Apply<HKT.F<F>>>({
    ...SF,
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa),
    apFirst_: apFirstF_(F),
    apFirst: apFirstF(F),
    apSecond_: apSecondF_(F),
    apSecond: apSecondF(F)
  })
}

export interface Apply2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends SemimonoidalFunctor2<F, G, CF, CG> {
  readonly ap_: ApFn2_<F, G, CF, CG>
  readonly ap: ApFn2<F, G, CF, CG>
}

export function getApplyComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: Apply<F, CF>,
  G: Apply<G, CG>
): Apply2<F, G, CF, CG>
export function getApplyComposition<F, G>(F: Apply<HKT.F<F>>, G: Apply<HKT.F<G>>): Apply2<HKT.F<F>, HKT.F<G>> {
  const crossWith_: Apply2<HKT.F<F>, HKT.F<G>>['crossWith_'] = (fga, fgb, f) =>
    F.crossWith_(fga, fgb, (ga, gb) => G.crossWith_(ga, gb, f))

  const ap_: Apply2<HKT.F<F>, HKT.F<G>>['ap_'] = <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fgab: HKT.FK<F, KF, QF, WF, XF, IF, SF, RF, EF, HKT.FK<G, KG, QG, WG, XG, IG, SG, RG, EG, (a: A) => B>>,
    fga: HKT.FK<F, KF, QF, WF, XF, IF, SF, RF, EF, HKT.FK<G, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ): HKT.FK<F, KF, QF, WF, XF, IF, SF, RF, EF, HKT.FK<G, KG, QG, WG, XG, IG, SG, RG, EG, B>> =>
    pipe(
      fgab,
      F.map((gab) => (ga: HKT.FK<G, KG, QG, WG, XG, IG, SG, RG, EG, A>) => G.ap_(gab, ga)),
      F.ap(fga)
    )
  return HKT.instance<Apply2<HKT.F<F>, HKT.F<G>>>({
    ...getFunctorComposition(F, G),
    ap_,
    ap: (fga) => (fgab) => ap_(fgab, fga),
    crossWith_,
    crossWith: (fgb, f) => (fga) => crossWith_(fga, fgb, f)
  })
}

export interface ApFn<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>): <K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fab: HKT.Kind<
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
      (a: A) => B
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
    B
  >
}

export interface ApFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fab: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, (a: A) => B>,
    fa: HKT.Kind<
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
      A
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

export interface ApFn2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ): <KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>(
    fgab: HKT.Kind<
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
        (a: A) => B
      >
    >
  ) => HKT.Kind<
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
      B
    >
  >
}

export interface ApFn2_<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
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
    fgab: HKT.Kind<
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
      HKT.Kind<G, TCG, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, (a: A) => B>
    >,
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

export function crossWithF_<F extends HKT.HKT, C = HKT.None>(F: ApplyMin<F, C>): CrossWithFn_<F, C>
export function crossWithF_<F>(F: ApplyMin<HKT.F<F>>): CrossWithFn_<HKT.F<F>> {
  if ('crossWith_' in F) {
    return F.crossWith_
  } else if ('cross_' in F) {
    return (fa, fb, f) => F.map_(F.cross_(fa, fb), (ab) => f(ab[0], ab[1]))
  } else {
    return <K, Q, W, X, I, S, R, E, A, B, C>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      fb: HKT.FK<F, K, Q, W, X, I, S, R, E, B>,
      f: (a: A, b: B) => C
    ) =>
      F.ap_(
        F.map_(fa, (a) => (b: B) => f(a, b)),
        fb
      )
  }
}

export function crossF_<F extends HKT.HKT, C = HKT.None>(F: ApplyMin<F, C>): CrossFn_<F, C>
export function crossF_<F>(F: ApplyMin<HKT.F<F>>): CrossFn_<HKT.F<F>> {
  if ('cross_' in F) {
    return F.cross_
  } else if ('crossWith_' in F) {
    return (fa, fb) => F.crossWith_(fa, fb, (a, b) => [a, b])
  } else {
    return <K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
      fb: HKT.FK<F, K, Q, W, X, I, S, R, E, B>
    ) =>
      F.ap_(
        F.map_(fa, (a) => (b: B) => [a, b]),
        fb
      )
  }
}

export interface ApFirstFn<F extends HKT.HKT, TC = HKT.None> {
  <K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, TC, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
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
    A
  >
}

export interface ApFirstFn_<F extends HKT.HKT, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
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
    A
  >
}

export function apFirstF_<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): ApFirstFn_<F, C>
export function apFirstF_<F>(A: ApplyMin<HKT.F<F>>): ApFirstFn_<HKT.F<F>> {
  if ('ap_' in A) {
    return (left, right) =>
      A.ap_(
        A.map_(left, (a) => () => a),
        right
      )
  } else if ('crossWith_' in A) {
    return (left, right) => A.crossWith_(left, right, (a, _) => a)
  } else {
    return (left, right) => A.map_(A.cross_(left, right), ([a, _]) => a)
  }
}

export function apFirstF<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): ApFirstFn<F, C>
export function apFirstF<F>(A: ApplyMin<HKT.F<F>>): ApFirstFn<HKT.F<F>> {
  if ('ap_' in A) {
    return (right) => (left) =>
      A.ap_(
        A.map_(left, (a) => () => a),
        right
      )
  } else if ('crossWith_' in A) {
    return (right) => (left) => A.crossWith_(left, right, (a, _) => a)
  } else {
    return (right) => (left) => A.map_(A.cross_(left, right), ([a, _]) => a)
  }
}

export interface ApFirstFnComposition<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
  <KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A, B>(
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
      HKT.Kind<G, TCG, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
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
        B
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
      A
    >
  >
}

export interface ApSecondFn<F extends HKT.HKT, C = HKT.None> {
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
    B
  >
}

export interface ApSecondFn_<F extends HKT.HKT, C = HKT.None> {
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
    B
  >
}

export function apSecondF_<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): ApSecondFn_<F, C>
export function apSecondF_<F>(A: ApplyMin<HKT.F<F>>): ApSecondFn_<HKT.F<F>> {
  if ('ap_' in A) {
    return (left, right) =>
      A.ap_(
        A.map_(left, (_) => (b: HKT.Infer<HKT.F<F>, {}, 'A', typeof right>) => b),
        right
      )
  } else if ('crossWith_' in A) {
    return (left, right) => A.crossWith_(left, right, (_, b) => b)
  } else {
    return (left, right) => A.map_(A.cross_(left, right), ([, b]) => b)
  }
}

export function apSecondF<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): ApSecondFn<F, C>
export function apSecondF<F>(A: ApplyMin<HKT.F<F>>): ApSecondFn<HKT.F<F>> {
  if ('ap_' in A) {
    return (right) => (left) =>
      A.ap_(
        A.map_(left, () => (b: HKT.Infer<HKT.F<F>, {}, 'A', typeof right>) => b),
        right
      )
  } else if ('crossWith_' in A) {
    return (right) => (left) => A.crossWith_(left, right, (_, b) => b)
  } else {
    return (right) => (left) => A.map_(A.cross_(left, right), ([, b]) => b)
  }
}

export interface ApSecondFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF1, QF1, WF1, XF1, IF1, SF1, RF1, EF1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A, B>(
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
      HKT.Kind<G, CG, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >
  ): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
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
        B
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
      B
    >
  >
}

export interface ApSFn<F extends HKT.HKT, C = HKT.None> {
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

export function apSF<F extends HKT.HKT, C = HKT.None>(F: Apply<F, C>): ApSFn<F, C>
export function apSF<F>(F: Apply<HKT.F<F>>): ApSFn<HKT.F<F>> {
  return <BN extends string, K, Q, W, X, I, S, R, E, A, A1>(
      name: Exclude<BN, keyof A>,
      fb: HKT.FK<F, K, Q, W, X, I, S, R, E, A1>
    ) =>
    (fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
      F.crossWith_(fa, fb, (a, b) =>
        Object.assign({}, a, { [name]: b } as { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 })
      )
}

export interface ApTFn<F extends HKT.HKT, C = HKT.None> {
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

export function apTF<F extends HKT.HKT, C = HKT.None>(F: Apply<F, C>): ApTFn<F, C>
export function apTF<F>(F: Apply<HKT.F<F>>): ApTFn<HKT.F<F>> {
  return <K, Q, W, X, I, S, R, E, B>(fb: HKT.FK<F, K, Q, W, X, I, S, R, E, B>) =>
    <A extends ReadonlyArray<unknown>>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
      F.crossWith_(fa, fb, (a, b) => {
        const ab = a.slice()
        ab.push(b)
        return ab as unknown as readonly [...A, B]
      })
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

export function liftA2F<F extends HKT.HKT, C = HKT.None>(F: Apply<F, C>): LiftA2Fn<F, C>
export function liftA2F<F>(F: Apply<HKT.F<F>>): LiftA2Fn<HKT.F<F>> {
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
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF<F extends HKT.HKT, C = HKT.None>(A: Apply<F, C>): MapNFn<F, C>
export function mapNF<F>(F: Apply<HKT.F<F>>): MapNFn<HKT.F<F>> {
  return (f) =>
    (...t) =>
      F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

/**
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF_<F extends HKT.HKT, C = HKT.None>(A: Apply<F, C>): MapNFn_<F, C>
export function mapNF_<F>(F: Apply<HKT.F<F>>): MapNFn_<HKT.F<F>> {
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

export function sequenceSF<F extends HKT.HKT, C = HKT.None>(F: Apply<F, C>): SequenceSFn<F, C>
export function sequenceSF<F>(F: Apply<HKT.F<F>>): SequenceSFn<HKT.F<F>> {
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

export function sequenceTF<F extends HKT.HKT, C = HKT.None>(F: Apply<F, C>): SequenceTFn<F, C>
export function sequenceTF<F>(F: Apply<HKT.F<F>>): SequenceTFn<HKT.F<F>> {
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
