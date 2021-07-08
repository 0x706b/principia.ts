import type { Applicative } from './Applicative'
import type { FoldableWithIndexMin } from './FoldableWithIndex'
import type { FunctorWithIndexMin } from './FunctorWithIndex'
import type { Monad } from './Monad'

import { FoldableWithIndex } from './FoldableWithIndex'
import { FunctorWithIndex } from './FunctorWithIndex'
import * as HKT from './HKT'

export interface TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FunctorWithIndex<F, C>,
    FoldableWithIndex<F, C> {
  readonly imapA_: MapWithIndexAFn_<F, C>
  readonly imapA: MapWithIndexAFn<F, C>
}

export type TraversableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = FunctorWithIndexMin<F, C> &
  FoldableWithIndexMin<F, C> & {
    readonly imapA_: MapWithIndexAFn_<F, C>
  }

export function TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: TraversableWithIndexMin<F, C>
): TraversableWithIndex<F, C> {
  return HKT.instance({
    ...FunctorWithIndex(F),
    ...FoldableWithIndex(F),
    imapA_: F.imapA_,
    imapA: (AG) => {
      const imapAG_ = F.imapA_(AG)
      return (f) => (ta) => imapAG_(ta, f)
    }
  })
}

export interface MapWithIndexAFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
    NG extends string,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    NF extends string,
    KF,
    A,
    B
  >(
    f: (
      i: HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
      a: A
    ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface MapWithIndexAFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
    NG extends string,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    NF extends string,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    A,
    B
  >(
    ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (
      i: HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
      a: A
    ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>
  ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface MapWithIndexAFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
    FN extends string,
    FK,
    GN extends string,
    GK,
    HN extends string,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    f: (
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, FN>, HKT.OrFix<'K', CF, FK>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, GN>, HKT.OrFix<'K', CG, GK>>
      ],
      a: A
    ) => HKT.Kind<H, CH, HN, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => <FQ, FW, FX, FI, FS, FR, FE, GQ, GW, GX, GI, GS, GR, GE>(
    fga: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>
  ) => HKT.Kind<
    H,
    CH,
    HN,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export interface MapWithIndexAFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
    FN extends string,
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    HN extends string,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    fga: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>,
    f: (
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, FN>, HKT.OrFix<'K', CF, FK>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, GN>, HKT.OrFix<'K', CG, GK>>
      ],
      a: A
    ) => HKT.Kind<H, CH, HN, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => HKT.Kind<
    H,
    CH,
    HN,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export function implementMapWithIndexA<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
    N: N
    K: K
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    A: Applicative<HKT.UHKT<G>>
  ) => (
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => HKT.HKT<G, B>
  ) => (ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => MapWithIndexAFn<F, C>
export function implementMapWithIndexA() {
  return (i: any) => i()
}

export function implementMapWithIndexA_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
    N: N
    K: HKT.OrFix<'K', C, K>
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: HKT.OrFix<'E', C, E>
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => HKT.HKT<G, B>
  ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => MapWithIndexAFn_<F, C>
export function implementMapWithIndexA_() {
  return (i: any) => i()
}

export interface MapAccumWithIndexMFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(M: Monad<G, CG>): <
    NG extends string,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    NF extends string,
    KF,
    A,
    B,
    C
  >(
    s: C,
    f: (
      s: C,
      i: HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
      a: A
    ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [B, C]>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<
    G,
    CG,
    NG,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>, C]
  >
}

export interface MapAccumWithIndexMFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(M: Monad<G, CG>): <
    NG extends string,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    NF extends string,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    A,
    B,
    C
  >(
    ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    s: C,
    f: (
      s: C,
      i: HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
      a: A
    ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [B, C]>
  ) => HKT.Kind<
    G,
    CG,
    NG,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>, C]
  >
}
