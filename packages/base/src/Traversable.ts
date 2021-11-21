import type { Applicative } from './Applicative'
import type { FoldableMin } from './Foldable'
import type { Functor2, FunctorMin } from './Functor'
import type { Monad } from './Monad'

import { Foldable } from './Foldable'
import { flow, identity, pipe } from './function'
import { Functor, getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import * as F from './SafeFunction'
import { getStateT } from './StateT'

export interface Traversable<F extends HKT.HKT, C = HKT.None> extends Functor<F, C>, Foldable<F, C> {
  readonly traverse_: TraverseFn_<F, C>
  readonly traverse: TraverseFn<F, C>
  readonly sequence: SequenceFn<F, C>
}

export type TraversableMin<F extends HKT.HKT, C = HKT.None> = FunctorMin<F, C> &
  FoldableMin<F, C> & {
    readonly traverse_: TraverseFn_<F, C>
  }

export function Traversable<F extends HKT.HKT, C = HKT.None>(F: TraversableMin<F, C>): Traversable<F, C> {
  const sequence: SequenceFn<F, C> = (A) => {
    const traverse_ = F.traverse_(A)
    return (ta) => traverse_(ta, identity)
  }
  return HKT.instance<Traversable<F, C>>({
    ...Functor(F),
    ...Foldable(F),
    traverse_: F.traverse_,
    traverse: (A) => {
      const traverseA_ = F.traverse_(A)
      return (f) => (ta) => traverseA_(ta, f)
    },
    sequence
  })
}

export interface TraversableComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends Functor2<F, G, CF, CG> {
  readonly traverse_: TraverseFnComposition_<F, G, CF, CG>
  readonly traverse: TraverseFnComposition<F, G, CF, CG>
  readonly sequence: SequenceFnComposition<F, G, CF, CG>
}

export function getTraversableComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: Traversable<F, CF>,
  G: Traversable<G, CG>
): TraversableComposition<F, G, CF, CG> {
  const traverse_: TraversableComposition<F, G, CF, CG>['traverse_'] = (H) => (tfga, f) =>
    F.traverse_(H)(tfga, (tga) => G.traverse_(H)(tga, f))
  return HKT.instance<TraversableComposition<F, G, CF, CG>>({
    ...getFunctorComposition(F, G),
    traverse_,
    traverse: (H) => (f) => (tfga) =>
      pipe(
        tfga,
        F.traverse(H)((tga) => G.traverse_(H)(tga, f))
      ),
    sequence: (H) => flow(F.map(G.sequence(H)), F.sequence(H))
  })
}

export interface TraverseFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <GK, GQ, GW, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => <FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
}

export interface TraverseFn_<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <
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
    A,
    B
  >(
    ta: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
}

export interface TraverseFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <H extends HKT.HKT, CH = HKT.None>(A: Applicative<H, CH>): <HK, HQ, HW, HX, HI, HS, HR, HE, A, B>(
    f: (a: A) => HKT.Kind<H, CH, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => <FK, FQ, FW, FX, FI, FS, FR, FE, GK, GQ, GW, GX, GI, GS, GR, GE>(
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

export interface TraverseFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
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
    f: (a: A) => HKT.Kind<H, CH, HK, HQ, HW, HX, HI, HS, HR, HE, B>
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

export function implementTraverse_<F extends HKT.HKT, C = HKT.None>(): (
  i: <K, Q, W, X, I, S, R, E, A, K1, Q1, W1, X1, I1, S1, R1, E1, B, G>(_: {
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
    f: (a: A) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>>
) => TraverseFn_<F, C>
export function implementTraverse_() {
  return (i: any) => i()
}

export function implementTraverse<F extends HKT.HKT, C = HKT.None>(): (
  i: <K1, Q1, W1, X1, I1, S1, R1, E1, K, Q, W, X, I, S, R, E, A, B, G>(_: {
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
    G: Applicative<HKT.F<G>>
  ) => (
    f: (a: A) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ) => (
    ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>>
) => TraverseFn<F, C>
export function implementTraverse() {
  return (i: any) => i()
}

export interface SequenceFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <
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
    A
  >(
    ta: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, A>>
}

export interface SequenceFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <H extends HKT.HKT, CH = HKT.None>(A: Applicative<H, CH>): <
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
    KH,
    QH,
    WH,
    XH,
    IH,
    SH,
    RH,
    EH,
    A
  >(
    fgha: HKT.Kind<
      F,
      CF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<H, CH, KH, QH, WH, XH, IH, SH, RH, EH, A>>
    >
  ) => HKT.Kind<
    H,
    CH,
    KH,
    QH,
    WH,
    XH,
    IH,
    SH,
    RH,
    EH,
    HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  >
}

export function implementSequence<F extends HKT.HKT, C = HKT.None>(): (
  i: <K, Q, W, X, I, S, R, E, A, B, K1, Q1, W1, X1, I1, S1, R1, E1, G>(_: {
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
    G: Applicative<HKT.F<G>>
  ) => (
    ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, A>>
  ) => HKT.FK<G, K1, Q1, W1, X1, I1, S1, R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>>
) => SequenceFn<F, C>
export function implementSequence() {
  return (i: any) => i()
}

export interface MapAccumMFn_<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(M: Monad<G, CG>): <
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
    A,
    B,
    C
  >(
    ta: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    s: C,
    f: (s: C, a: A) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
  ) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, B>, C]>
  <G>(M: Monad<HKT.F<G>>): <FK, FQ, FW, FX, FI, FS, FR, FE, GK, GQ, GW, GX, GI, GS, GR, GE, A, B, C>(
    ta: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    s: C,
    f: (s: C, a: A) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
  ) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, B>, C]>
}

export function getMapAccumM_<F extends HKT.HKT, C = HKT.None>(T: Traversable<F, C>): MapAccumMFn_<F, C>
export function getMapAccumM_<F>(T: Traversable<HKT.F<F>>): MapAccumMFn_<HKT.F<F>> {
  return <G>(M: Monad<HKT.F<G>>) => {
    const StateM          = getStateT(M)
    const traverseStateM_ = T.traverse_(StateM)
    return <FK, FQ, FW, FX, FI, FS, FR, FE, GK, GQ, GW, GX, GI, GS, GR, GE, A, B, C>(
      ta: HKT.FK<F, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
      s0: C,
      f: (s: C, a: A) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
    ) => traverseStateM_(ta, (a) => F.single((s: C) => f(s, a)))(s0)
  }
}

export interface MapAccumMFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(M: Monad<G, CG>): <GK, GQ, GW, GX, GI, GS, GR, GE, A, B, C>(
    s: C,
    f: (s: C, a: A) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
  ) => <FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, B>, C]>
}

export function getMapAccumM<F extends HKT.HKT, C = HKT.None>(T: Traversable<F, C>): MapAccumMFn<F, C> {
  return (M) => {
    const mapAccumM_ = getMapAccumM_(T)(M)
    return (s, f) => (ta) => mapAccumM_(ta, s, f)
  }
}
