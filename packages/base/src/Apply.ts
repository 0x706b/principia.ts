import type { FunctorMin } from './Functor'
import type { CrossFn_ } from './Semimonoidal'
import type { CrossWithFn_, SemimonoidalFunctor2, SemimonoidalFunctorMin } from './SemimonoidalFunctor'

import { flow, pipe } from './function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import { apF_, SemimonoidalFunctor } from './SemimonoidalFunctor'

/**
 * A lax semimonoidal endofunctor
 *
 * `Apply` is isomorphic to `SemimonoidalFunctor`
 */
export interface Apply<F extends HKT.HKT, C = HKT.None> extends SemimonoidalFunctor<F, C> {
  readonly ap_: ApFn_<F, C>
  readonly ap: ApFn<F, C>
  readonly crossFirst_: CrossFirstFn_<F, C>
  readonly crossFirst: CrossFirstFn<F, C>
  readonly crossSecond_: CrossSecondFn_<F, C>
  readonly crossSecond: CrossSecondFn<F, C>
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
    crossFirst_: crossFirstF_(F),
    crossFirst: crossFirstF(F),
    crossSecond_: crossSecondF_(F),
    crossSecond: crossSecondF(F)
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

export interface CrossFirstFn<F extends HKT.HKT, TC = HKT.None> {
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

export interface CrossFirstFn_<F extends HKT.HKT, TC = HKT.None> {
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

export function crossFirstF_<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): CrossFirstFn_<F, C>
export function crossFirstF_<F>(A: ApplyMin<HKT.F<F>>): CrossFirstFn_<HKT.F<F>> {
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

export function crossFirstF<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): CrossFirstFn<F, C>
export function crossFirstF<F>(A: ApplyMin<HKT.F<F>>): CrossFirstFn<HKT.F<F>> {
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

export interface crossFirstFnComposition<F extends HKT.HKT, G extends HKT.HKT, TCF = HKT.None, TCG = HKT.None> {
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

export interface CrossSecondFn<F extends HKT.HKT, C = HKT.None> {
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

export interface CrossSecondFn_<F extends HKT.HKT, C = HKT.None> {
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

export function crossSecondF_<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): CrossSecondFn_<F, C>
export function crossSecondF_<F>(A: ApplyMin<HKT.F<F>>): CrossSecondFn_<HKT.F<F>> {
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

export function crossSecondF<F extends HKT.HKT, C = HKT.None>(A: ApplyMin<F, C>): CrossSecondFn<F, C>
export function crossSecondF<F>(A: ApplyMin<HKT.F<F>>): CrossSecondFn<HKT.F<F>> {
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

export interface crossSecondFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
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
  // @ts-expect-error
  return <K, Q, W, X, I, S, R, E, B, BN extends string>(name: BN, fb: HKT.FK<F, K, Q, W, X, I, S, R, E, B>) =>
    <A>(fa: HKT.FK<F, K, Q, W, X, I, S, R, E, A>) =>
      pipe(
        fa,
        F.map((a) => (b: HKT.Infer<HKT.F<F>, HKT.None, 'A', typeof fb>) => Object.assign({}, a, { [name]: b })),
        F.ap(fb)
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
  return (fb) =>
    flow(
      F.map((a) => (b: HKT.Infer<HKT.F<F>, HKT.None, 'A', typeof fb>) => [...a, b] as const),
      F.ap(fb)
    )
}
