import type { Eval } from './Eval'
import type { Monoid } from './Monoid'

import * as HKT from './HKT'

export interface FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly ifoldl_: FoldLeftWithIndexFn_<F, C>
  readonly ifoldl: FoldLeftWithIndexFn<F, C>
  readonly ifoldMap_: FoldMapWithIndexFn_<F, C>
  readonly ifoldMap: FoldMapWithIndexFn<F, C>
  readonly ifoldr_: FoldRightWithIndexFn_<F, C>
  readonly ifoldr: FoldRightWithIndexFn<F, C>
}

export type FoldableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly ifoldl_: FoldLeftWithIndexFn_<F, C>
  readonly ifoldr_: FoldRightWithIndexFn_<F, C>
  readonly ifoldMap_: FoldMapWithIndexFn_<F, C>
}

export function FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: FoldableWithIndexMin<F, C>
): FoldableWithIndex<F, C> {
  return HKT.instance<FoldableWithIndex<F, C>>({
    ifoldl_: F.ifoldl_,
    ifoldl: (b, f) => (fa) => F.ifoldl_(fa, b, f),
    ifoldr_: F.ifoldr_,
    ifoldr: (b, f) => (fa) => F.ifoldr_(fa, b, f),
    ifoldMap_: F.ifoldMap_,
    ifoldMap: (M) => (f) => (fa) => F.ifoldMap_(M)(fa, f)
  })
}

export interface FoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly ifoldl_: FoldLeftWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldl: FoldLeftWithIndexFnComposition<F, G, CF, CG>
  readonly ifoldMap_: FoldMapWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldMap: FoldMapWithIndexFnComposition<F, G, CF, CG>
  readonly ifoldr_: FoldRightWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldr: FoldRightWithIndexFnComposition<F, G, CF, CG>
}

export function getFoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: FoldableWithIndex<F, CF>,
  G: FoldableWithIndex<G, CG>
): FoldableWithIndexComposition<F, G, CF, CG>
export function getFoldableWithIndexComposition<F, G>(
  F: FoldableWithIndex<HKT.UHKT<F>>,
  G: FoldableWithIndex<HKT.UHKT<G>>
) {
  const ifoldl_: FoldLeftWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: B,
    f: (b: B, k: [KF, KG], a: A) => B
  ) =>
    F.ifoldl_(fga, b, (b: B, fi: KF, ga: HKT.HKT<G, A>) => G.ifoldl_(ga, b, (b: B, gi: KG, a: A) => f(b, [fi, gi], a)))

  const ifoldMap_: FoldMapWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> =
    <M>(M: Monoid<M>) =>
    <KF, KG, A>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (k: [KF, KG], a: A) => M) =>
      F.ifoldMap_(M)(fga, (kf: KF, ga) => G.ifoldMap_(M)(ga, (kg: KG, a) => f([kf, kg], a)))

  const ifoldr_: FoldRightWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: Eval<B>,
    f: (a: A, k: [KF, KG], b: Eval<B>) => Eval<B>
  ) => F.ifoldr_(fga, b, (ga: HKT.HKT<G, A>, fi: KF, b) => G.ifoldr_(ga, b, (a: A, gi: KG, b) => f(a, [fi, gi], b)))
  return HKT.instance<FoldableWithIndexComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ifoldl_,
    ifoldMap_,
    ifoldr_,
    ifoldl: (b, f) => (fga) => ifoldl_(fga, b, f),
    ifoldMap: (M) => (f) => (fga) => ifoldMap_(M)(fga, f),
    ifoldr: (b, f) => (fga) => ifoldr_(fga, b, f)
  })
}

export interface FoldLeftWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (b: B, i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => B
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
}

export interface FoldLeftWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (b: B, i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => B
  ): B
}

export interface FoldLeftWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, NG extends string, KF, KG, A, B>(
    b: B,
    f: (
      b: B,
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (
      b: B,
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => B
  ): B
}

export interface FoldRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: Eval<B>,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, b: Eval<B>) => Eval<B>
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => Eval<B>
}

export interface FoldRightWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: Eval<B>,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldRightWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, NG extends string, KF, KG, A, B>(
    b: Eval<B>,
    f: (
      a: A,
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      b: Eval<B>
    ) => Eval<B>
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => Eval<B>
}

export interface FoldRightWithIndexFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: Eval<B>,
    f: (
      a: A,
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      b: Eval<B>
    ) => Eval<B>
  ): Eval<B>
}

export interface FoldMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, A>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => M
  ) => M
}

export interface FoldMapWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <NF extends string, NG extends string, KF, KG, A>(
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => M
  ) => <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
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
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => M
  ) => M
}
