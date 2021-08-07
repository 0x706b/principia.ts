import type { Eval } from './Eval'
import type { Option } from './internal/Option'
import type { Monad } from './Monad'
import type { Monoid } from './Monoid'
import type { TailRec } from './TailRec'

import * as Ev from './Eval/core'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Option'

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
    f: (b: B, a: A, k: [KF, KG]) => B
  ) =>
    F.ifoldl_(fga, b, (b: B, ga: HKT.HKT<G, A>, fi: KF) => G.ifoldl_(ga, b, (b: B, a: A, gi: KG) => f(b, a, [fi, gi])))

  const ifoldMap_: FoldMapWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> =
    <M>(M: Monoid<M>) =>
    <KF, KG, A>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (a: A, k: [KF, KG]) => M) =>
      F.ifoldMap_(M)(fga, (ga, kf: KF) => G.ifoldMap_(M)(ga, (a, kg: KG) => f(a, [kf, kg])))

  const ifoldr_: FoldRightWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>, k: [KF, KG]) => Eval<B>
  ) => F.ifoldr_(fga, b, (ga: HKT.HKT<G, A>, b, fi: KF) => G.ifoldr_(ga, b, (a: A, b, gi: KG) => f(a, b, [fi, gi])))
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
  <K, A, B>(b: B, f: (b: B, a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => B): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => B
}

export interface FoldLeftWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (b: B, a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => B
  ): B
}

export interface FoldLeftWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <KF, KG, A, B>(
    b: B,
    f: (b: B, a: A, i: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (b: B, a: A, i: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]) => B
  ): B
}

export interface FoldRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, A, B>(b: Eval<B>, f: (a: A, b: Eval<B>, k: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => Eval<B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Eval<B>
}

export interface FoldRightWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>, k: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => Eval<B>
  ): Eval<B>
}

export interface FoldRightWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <KF, KG, A, B>(
    b: Eval<B>,
    f: (
      a: A,
      b: Eval<B>,
      k: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]
    ) => Eval<B>
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => Eval<B>
}

export interface FoldRightWithIndexFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: Eval<B>,
    f: (
      a: A,
      b: Eval<B>,
      k: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]
    ) => Eval<B>
  ): Eval<B>
}

export interface FoldMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <K, A>(
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, K>>) => M
  ) => M
}

export interface FoldMapWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <KF, KG, A>(
    f: (a: A, k: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]) => M
  ) => <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A, k: [HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>, HKT.IndexFor<G, HKT.OrFix<'K', CG, KG>>]) => M
  ) => M
}

export interface FoldLeftMWithIndexFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM>): <
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    AF,
    B,
    KM,
    QM,
    WM,
    XM,
    IM,
    SM,
    RM,
    EM
  >(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    b: B,
    f: (b: B, a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export interface FoldLeftMWithIndexFn<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM>): <KF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (b: B, a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldlMWithIndex_<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldLeftMWithIndexFn_<F, CF> {
  return (M) => (fa, b, f) => F.ifoldl_(fa, M.pure(b), (mb, a, i) => M.chain_(mb, (b) => f(b, a, i)))
}

export function getFoldlMWithIndex<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldLeftMWithIndexFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldlMWithIndex_(F)(M)(fa, b, f)
}

export interface FoldRightMWithIndexFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>): <
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    AF,
    B,
    KM,
    QM,
    WM,
    XM,
    IM,
    SM,
    RM,
    EM
  >(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    b: B,
    f: (a: AF, b: B, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export interface FoldRightMWithIndexFn<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>): <KF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (a: AF, b: B, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldrMWithIndex_<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldRightMWithIndexFn_<F, CF> {
  return <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>) =>
    <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
      fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
      b: B,
      f: (a: AF, b: B, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
    ) => {
      const source = fromFoldable(F)(fa)
      return M.chainRec_([b, source] as const, ([z, src]) =>
        O.match_(
          src,
          () => M.pure(E.right(z)),
          ([a, i, src]) => M.map_(f(a, z, i), (b) => E.left([b, src.value]))
        )
      )
    }
}

export function getFoldrMWithIndex<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldRightMWithIndexFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldrMWithIndex_(F)(M)(fa, b, f)
}

export interface FoldMapMWithIndexFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <B, M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>, B: Monoid<B>): <
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    AF,
    KM,
    QM,
    WM,
    XM,
    IM,
    SM,
    RM,
    EM
  >(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    f: (a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapWithIndexM_<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldMapMWithIndexFn_<F, CF> {
  const ifoldrM_ = getFoldrMWithIndex_(F)
  return (M, B) => (fa, f) => ifoldrM_(M)(fa, B.nat, (a, b, i) => M.map_(f(a, i), (b1) => B.combine_(b, b1)))
}

export interface FoldMapMWithIndexFn<F extends HKT.URIS, CF = HKT.Auto> {
  <B, M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>, B: Monoid<B>): <
    KF,
    AF,
    KM,
    QM,
    WM,
    XM,
    IM,
    SM,
    RM,
    EM
  >(
    f: (a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapWithIndexM<F extends HKT.URIS, CF = HKT.Auto>(
  F: FoldableWithIndex<F, CF>
): FoldMapMWithIndexFn<F, CF> {
  return (M, B) => (f) => (fa) => getFoldMapWithIndexM_(F)(M, B)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

type Source<F extends HKT.URIS, C, K, A> = Option<
  readonly [A, HKT.IndexFor<F, HKT.OrFix<'K', C, K>>, Eval<Source<F, C, K, A>>]
>

function fromFoldable<F extends HKT.URIS, C>(F: FoldableWithIndex<F, C>) {
  return <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): Source<F, C, K, A> =>
    F.ifoldr_(fa, Ev.now<Source<F, C, K, A>>(O.none()), (a, evalSrc, i) =>
      Ev.later(() => O.some([a, i, evalSrc] as const))
    ).value
}
