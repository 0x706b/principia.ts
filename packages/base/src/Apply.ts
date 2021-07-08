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
export interface Apply<F extends HKT.URIS, C = HKT.Auto> extends SemimonoidalFunctor<F, C> {
  readonly ap_: ApFn_<F, C>
  readonly ap: ApFn<F, C>
  readonly crossFirst_: crossFirstFn_<F, C>
  readonly crossFirst: crossFirstFn<F, C>
  readonly crossSecond_: crossSecondFn_<F, C>
  readonly crossSecond: crossSecondFn<F, C>
}

export type ApplyMin<F extends HKT.URIS, C = HKT.Auto> =
  | SemimonoidalFunctorMin<F, C>
  | ({ readonly ap_: ApFn_<F, C> } & FunctorMin<F, C>)
  | ({ readonly ap_: ApFn_<F, C> } & SemimonoidalFunctorMin<F, C>)

export function Apply<F extends HKT.URIS, C = HKT.Auto>(F: ApplyMin<F, C>): Apply<F, C> {
  let ap_: ApFn_<F, C>
  let SF: SemimonoidalFunctor<F, C>
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
  return HKT.instance<Apply<F, C>>({
    ...SF,
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa),
    crossFirst_: crossFirstF_(F),
    crossFirst: crossFirstF(F),
    crossSecond_: crossSecondF_(F),
    crossSecond: crossSecondF(F)
  })
}

export interface Apply2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends SemimonoidalFunctor2<F, G, CF, CG> {
  readonly ap_: ApFn2_<F, G, CF, CG>
  readonly ap: ApFn2<F, G, CF, CG>
}

export function getApplyComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Apply<F, CF>,
  G: Apply<G, CG>
): Apply2<F, G, CF, CG>
export function getApplyComposition<F, G>(
  F: Apply<HKT.UHKT<F>>,
  G: Apply<HKT.UHKT<G>>
): Apply2<HKT.UHKT<F>, HKT.UHKT<G>> {
  const crossWith_: Apply2<HKT.UHKT<F>, HKT.UHKT<G>>['crossWith_'] = (fga, fgb, f) =>
    F.crossWith_(fga, fgb, (ga, gb) => G.crossWith_(ga, gb, f))

  const ap_: Apply2<HKT.UHKT<F>, HKT.UHKT<G>>['ap_'] = <A, B>(
    fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>,
    fga: HKT.HKT<F, HKT.HKT<G, A>>
  ): HKT.HKT<F, HKT.HKT<G, B>> =>
    pipe(
      fgab,
      F.map((gab) => (ga: HKT.HKT<G, A>) => G.ap_(gab, ga)),
      F.ap(fga)
    )
  return HKT.instance<Apply2<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getFunctorComposition(F, G),
    ap_,
    ap: (fga) => (fgab) => ap_(fgab, fga),
    crossWith_,
    crossWith: (fgb, f) => (fga) => crossWith_(fga, fgb, f)
  })
}

export interface ApFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>): <
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    B
  >(
    fab: HKT.Kind<
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
      (a: A) => B
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
    B
  >
}

export interface ApFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, (a: A) => B>,
    fa: HKT.Kind<
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
      A
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

export interface ApFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ): <
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
    B
  >(
    fgab: HKT.Kind<
      F,
      CF,
      HKT.Intro<CF, 'N', NF, NF1>,
      HKT.Intro<CF, 'K', KF, KF1>,
      HKT.Intro<CF, 'Q', QF, QF1>,
      HKT.Intro<CF, 'W', WF, WF1>,
      HKT.Intro<CF, 'X', XF, XF1>,
      HKT.Intro<CF, 'I', IF, IF1>,
      HKT.Intro<CF, 'S', SF, SF1>,
      HKT.Intro<CF, 'R', RF, RF1>,
      HKT.Intro<CF, 'E', EF, EF1>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<CG, 'N', NG, NG1>,
        HKT.Intro<CG, 'K', KG, KG1>,
        HKT.Intro<CG, 'Q', QG, QG1>,
        HKT.Intro<CG, 'W', WG, WG1>,
        HKT.Intro<CG, 'X', XG, XG1>,
        HKT.Intro<CG, 'I', IG, IG1>,
        HKT.Intro<CG, 'S', SG, SG1>,
        HKT.Intro<CG, 'R', RG, RG1>,
        HKT.Intro<CG, 'E', EG, EG1>,
        (a: A) => B
      >
    >
  ) => HKT.Kind<
    F,
    CF,
    HKT.Mix<CF, 'N', [NF, NF1]>,
    HKT.Mix<CF, 'K', [KF, KF1]>,
    HKT.Mix<CF, 'Q', [QF, QF1]>,
    HKT.Mix<CF, 'W', [WF, WF1]>,
    HKT.Mix<CF, 'X', [XF, XF1]>,
    HKT.Mix<CF, 'I', [IF, IF1]>,
    HKT.Mix<CF, 'S', [SF, SF1]>,
    HKT.Mix<CF, 'R', [RF, RF1]>,
    HKT.Mix<CF, 'E', [EF, EF1]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<CG, 'N', [NG, NG1]>,
      HKT.Mix<CG, 'K', [KG, KG1]>,
      HKT.Mix<CG, 'Q', [QG, QG1]>,
      HKT.Mix<CG, 'W', [WG, WG1]>,
      HKT.Mix<CG, 'X', [XG, XG1]>,
      HKT.Mix<CG, 'I', [IG, IG1]>,
      HKT.Mix<CG, 'S', [SG, SG1]>,
      HKT.Mix<CG, 'R', [RG, RG1]>,
      HKT.Mix<CG, 'E', [EG, EG1]>,
      B
    >
  >
}

export interface ApFn2_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    fgab: HKT.Kind<
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, (a: A) => B>
    >,
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
      B
    >
  >
}

export function crossWithF_<F extends HKT.URIS, C = HKT.Auto>(F: ApplyMin<F, C>): CrossWithFn_<F, C>
export function crossWithF_<F>(F: ApplyMin<HKT.UHKT<F>>): CrossWithFn_<HKT.UHKT<F>> {
  if ('crossWith_' in F) {
    return F.crossWith_
  } else if ('cross_' in F) {
    return (fa, fb, f) => F.map_(F.cross_(fa, fb), (ab) => f(ab[0], ab[1]))
  } else {
    return <A, B, C>(fa: HKT.HKT<F, A>, fb: HKT.HKT<F, B>, f: (a: A, b: B) => C) =>
      F.ap_(
        F.map_(fa, (a) => (b: B) => f(a, b)),
        fb
      )
  }
}

export function crossF_<F extends HKT.URIS, C = HKT.Auto>(F: ApplyMin<F, C>): CrossFn_<F, C>
export function crossF_<F>(F: ApplyMin<HKT.UHKT<F>>): CrossFn_<HKT.UHKT<F>> {
  if ('cross_' in F) {
    return F.cross_
  } else if ('crossWith_' in F) {
    return (fa, fb) => F.crossWith_(fa, fb, (a, b) => [a, b])
  } else {
    return <A, B>(fa: HKT.HKT<F, A>, fb: HKT.HKT<F, B>) =>
      F.ap_(
        F.map_(fa, (a) => (b: B) => [a, b]),
        fb
      )
  }
}

export interface crossFirstFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
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
    A
  >
}

export interface crossFirstFn_<F extends HKT.URIS, TC = HKT.Auto> {
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
    HKT.Mix<TC, 'N', [N1, N]>,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    HKT.Mix<TC, 'I', [I1, I]>,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    A
  >
}

export function crossFirstF_<F extends HKT.URIS, C = HKT.Auto>(A: ApplyMin<F, C>): crossFirstFn_<F, C> {
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

export function crossFirstF<F extends HKT.URIS, C = HKT.Auto>(A: ApplyMin<F, C>): crossFirstFn<F, C> {
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

export interface crossFirstFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
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
        B
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
      A
    >
  >
}

export interface crossSecondFn<F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
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
    B
  >
}

export interface crossSecondFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
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
      B
    >
  ): HKT.Kind<
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
    B
  >
}

export function crossSecondF_<F extends HKT.URIS, C = HKT.Auto>(A: ApplyMin<F, C>): crossSecondFn_<F, C>
export function crossSecondF_<F>(A: ApplyMin<HKT.UHKT<F>>): crossSecondFn_<HKT.UHKT<F>> {
  if ('ap_' in A) {
    return (left, right) =>
      A.ap_(
        A.map_(left, (_) => (b: HKT.Infer<HKT.UHKT<F>, {}, 'A', typeof right>) => b),
        right
      )
  } else if ('crossWith_' in A) {
    return (left, right) => A.crossWith_(left, right, (_, b) => b)
  } else {
    return (left, right) => A.map_(A.cross_(left, right), ([, b]) => b)
  }
}

export function crossSecondF<F extends HKT.URIS, C = HKT.Auto>(A: ApplyMin<F, C>): crossSecondFn<F, C>
export function crossSecondF<F>(A: ApplyMin<HKT.UHKT<F>>): crossSecondFn<HKT.UHKT<F>> {
  if ('ap_' in A) {
    return (right) => (left) =>
      A.ap_(
        A.map_(left, () => (b: HKT.Infer<HKT.UHKT<F>, {}, 'A', typeof right>) => b),
        right
      )
  } else if ('crossWith_' in A) {
    return (right) => (left) => A.crossWith_(left, right, (_, b) => b)
  } else {
    return (right) => (left) => A.map_(A.cross_(left, right), ([, b]) => b)
  }
}

export interface crossSecondFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
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
    fgb: HKT.Kind<
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
    fga: HKT.Kind<
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
        B
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
      B
    >
  >
}

export interface ApSFn<F extends HKT.URIS, C = HKT.Auto> {
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

export function apSF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): ApSFn<F, C> {
  return (name, fb) =>
    flow(
      F.map((a) => (b: HKT.Infer<F, C, 'A', typeof fb>) => Object.assign({}, a, { [name]: b })),
      F.ap(fb)
    )
}

export interface ApTFn<F extends HKT.URIS, C = HKT.Auto> {
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

export function apTF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): ApTFn<F, C> {
  return (fb) =>
    flow(
      F.map((a) => (b: HKT.Infer<F, C, 'A', typeof fb>) => [...a, b]),
      F.ap(fb)
    )
}
