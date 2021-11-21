import type { Applicative } from './Applicative'
import type { FoldableWithIndexMin } from './FoldableWithIndex'
import type { FunctorWithIndexMin } from './FunctorWithIndex'
import type { Monad } from './Monad'

import { FoldableWithIndex } from './FoldableWithIndex'
import { FunctorWithIndex } from './FunctorWithIndex'
import * as HKT from './HKT'

export interface TraversableWithIndex<F extends HKT.HKT, C = HKT.None>
  extends FunctorWithIndex<F, C>,
    FoldableWithIndex<F, C> {
  readonly itraverse_: TraverseIndexFn_<F, C>
  readonly itraverse: MapWithIndexAFn<F, C>
}

export type TraversableWithIndexMin<F extends HKT.HKT, C = HKT.None> = FunctorWithIndexMin<F, C> &
  FoldableWithIndexMin<F, C> & {
    readonly itraverse_: TraverseIndexFn_<F, C>
  }

export function TraversableWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: TraversableWithIndexMin<F, C>
): TraversableWithIndex<F, C> {
  return HKT.instance<TraversableWithIndex<F, C>>({
    ...FunctorWithIndex(F),
    ...FoldableWithIndex(F),
    itraverse_: F.itraverse_,
    itraverse: (AG) => {
      const itraverseG_ = F.itraverse_(AG)
      return (f) => (ta) => itraverseG_(ta, f)
    }
  })
}

export interface MapWithIndexAFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <KG, QG, WG, XG, IG, SG, RG, EG, KF, A, B>(
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    ta: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface TraverseIndexFn_<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
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
    ta: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface TraverseWithIndexFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <H extends HKT.HKT, CH = HKT.None>(A: Applicative<H, CH>): <FK, GK, HK, HQ, HW, HX, HI, HS, HR, HE, A, B>(
    f: (
      a: A,
      i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', FK>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', GK>>]
    ) => HKT.Kind<H, CH, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => <FQ, FW, FX, FI, FS, FR, FE, GQ, GW, GX, GI, GS, GR, GE>(
    fga: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, A>>
  ) => HKT.Kind<
    H,
    CH,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export interface TraverseWithIndexFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <H extends HKT.HKT, CH = HKT.None>(A: Applicative<H, CH>): <
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
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
    fga: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, A>>,
    f: (
      a: A,
      i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', FK>>, HKT.IndexFor<G, HKT.OrFix<CF, 'K', GK>>]
    ) => HKT.Kind<H, CH, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => HKT.Kind<
    H,
    CH,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export function implementTraverseWithIndex<F extends HKT.HKT, C = HKT.None>(): (
  i: <K, Q, W, X, I, S, R, E, A, B, G, K1, Q1, W1, X1, I1, S1, R1, E1>(_: {
    A: A
    B: B
    G: G
    K: K
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    A: Applicative<HKT.F<G>>
  ) => (
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ) => (
    ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>>
) => MapWithIndexAFn<F, C>
export function implementTraverseWithIndex() {
  return (i: any) => i()
}

export function implementTraverseWithIndex_<F extends HKT.HKT, C = HKT.None>(): (
  i: <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, G>(_: {
    A: A
    B: B
    G: G
    K: HKT.OrFix<C, 'K', K>
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: HKT.OrFix<C, 'E', E>
    K1: K1
    Q1: Q1
    W1: W1
    X1: X1
    I1: I1
    S1: S1
    R1: R1
    E1: E1
  }) => (
    G: Applicative<HKT.F<G>>
  ) => (
    ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>>
) => TraverseIndexFn_<F, C>
export function implementTraverseWithIndex_() {
  return (i: any) => i()
}

export interface MapAccumWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(M: Monad<G, CG>): <KG, QG, WG, XG, IG, SG, RG, EG, KF, A, B, C>(
    s: C,
    f: (
      s: C,
      a: A,
      i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>
    ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [B, C]>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    ta: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, B>, C]>
}

export interface MapAccumWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(M: Monad<G, CG>): <
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
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
    ta: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    s: C,
    f: (
      s: C,
      a: A,
      i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>
    ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [B, C]>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, B>, C]>
}

export function implementMapAccumMWithIndex_<F extends HKT.HKT, TC = HKT.None>(): (
  i: <K, Q, W, X, I, S, R, E, G, K1, Q1, W1, X1, I1, S1, R1, E1, A, B, C>(_: {
    A: A
    B: B
    G: G
    K: HKT.OrFix<C, 'K', K>
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: HKT.OrFix<C, 'E', E>
    K1: K1
    Q1: Q1
    W1: W1
    X1: X1
    I1: I1
    S1: S1
    R1: R1
    E1: E1
    C: C
  }) => (
    G: Monad<HKT.F<G>>
  ) => (
    ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    s: C,
    f: (
      s: C,
      a: A,
      i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>
    ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, readonly [B, C]>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>, C]>
) => MapAccumWithIndexMFn_<F, TC>
export function implementMapAccumMWithIndex_() {
  return (i: any) => i()
}
