import type { Eval } from './Eval'
import type { Monoid } from './Monoid'

import * as HKT from './HKT'

export interface Foldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly foldl_: FoldLeftFn_<F, C>
  readonly foldl: FoldLeftFn<F, C>
  readonly foldMap_: FoldMapFn_<F, C>
  readonly foldMap: FoldMapFn<F, C>
  readonly foldr_: FoldRightFn_<F, C>
  readonly foldr: FoldRightFn<F, C>
}

export type FoldableMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly foldl_: FoldLeftFn_<F, C>
  readonly foldr_: FoldRightFn_<F, C>
  readonly foldMap_: FoldMapFn_<F, C>
}

export function Foldable<F extends HKT.URIS, C = HKT.Auto>(F: FoldableMin<F, C>): Foldable<F, C> {
  return HKT.instance<Foldable<F, C>>({
    foldl_: F.foldl_,
    foldl: (b, f) => (fa) => F.foldl_(fa, b, f),
    foldr_: F.foldr_,
    foldr: (b, f) => (fa) => F.foldr_(fa, b, f),
    foldMap_: F.foldMap_,
    foldMap: (M) => (f) => (fa) => F.foldMap_(M)(fa, f)
  })
}

export interface FoldableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly foldl_: FoldLeftFnComposition_<F, G, CF, CG>
  readonly foldl: FoldLeftFnComposition<F, G, CF, CG>
  readonly foldMap_: FoldMapFnComposition_<F, G, CF, CG>
  readonly foldMap: FoldMapFnComposition<F, G, CF, CG>
  readonly foldr_: FoldRightFnComposition_<F, G, CF, CG>
  readonly foldr: FoldRightFnComposition<F, G, CF, CG>
}

export function getFoldableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Foldable<F, CF>,
  G: Foldable<G, CG>
): FoldableComposition<F, G, CF, CG>
export function getFoldableComposition<F, G>(
  F: Foldable<HKT.UHKT<F>>,
  G: Foldable<HKT.UHKT<G>>
): FoldableComposition<HKT.UHKT<F>, HKT.UHKT<G>> {
  return Foldable<[...HKT.MapURIS<HKT.UHKT<F>>, ...HKT.MapURIS<HKT.UHKT<G>>]>({
    foldl_: (fga, b, f) => F.foldl_(fga, b, (b, ga) => G.foldl_(ga, b, f)),
    foldr_: (fga, b, f) => F.foldr_(fga, b, (ga, b) => G.foldr_(ga, b, f)),
    foldMap_: (M) => (fga, f) => F.foldMap_(M)(fga, (ga) => G.foldMap_(M)(ga, f))
  })
}

export interface FoldLeftFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(b: B, f: (b: B, a: A) => B): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => B
}

export interface FoldLeftFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (b: B, a: A) => B
  ): B
}

export interface FoldLeftFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(b: B, f: (b: B, a: A) => B): <
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
    EG
  >(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (b: B, a: A) => B
  ): B
}

export interface FoldRightFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(b: Eval<B>, f: (a: A, b: Eval<B>) => Eval<B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Eval<B>
}

export interface FoldRightFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldRightFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(b: Eval<B>, f: (a: A, b: Eval<B>) => Eval<B>): <
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
    GE
  >(
    fa: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>
  ) => Eval<B>
}

export interface FoldRightFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE, GN extends string, GK, GQ, GW, GX, GI, GS, GR, GE, A, B>(
    fa: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <A>(
    f: (a: A) => M
  ) => <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => M
  ) => M
}

export interface FoldMapFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <A>(
    f: (a: A) => M
  ) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <
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
    A
  >(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => M
  ) => M
}
