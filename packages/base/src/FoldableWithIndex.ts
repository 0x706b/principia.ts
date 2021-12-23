import type { Eval } from './Eval'
import type { Maybe } from './internal/Maybe'
import type { Monad } from './Monad'
import type { Monoid } from './Monoid'
import type { PredicateWithIndex } from './Predicate'
import type { Foldable, FoldableComposition, RefinementWithIndex } from './prelude'
import type { TailRec } from './TailRec'

import * as Ev from './Eval/core'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as Mb from './internal/Maybe'

export interface FoldableWithIndex<F extends HKT.HKT, C = HKT.None> extends Foldable<F, C> {
  readonly ifoldl_: FoldLeftWithIndexFn_<F, C>
  readonly ifoldl: FoldLeftWithIndexFn<F, C>
  readonly ifoldMap_: FoldMapWithIndexFn_<F, C>
  readonly ifoldMap: FoldMapWithIndexFn<F, C>
  readonly ifoldr_: FoldRightWithIndexFn_<F, C>
  readonly ifoldr: FoldRightWithIndexFn<F, C>
}

export type FoldableWithIndexMin<F extends HKT.HKT, C = HKT.None> = {
  readonly ifoldl_: FoldLeftWithIndexFn_<F, C>
  readonly ifoldr_: FoldRightWithIndexFn_<F, C>
  readonly ifoldMap_: FoldMapWithIndexFn_<F, C>
}

export function FoldableWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): FoldableWithIndex<F, C> {
  const ifoldl: FoldLeftWithIndexFn<F, C>  = (b, f) => (fa) => F.ifoldl_(fa, b, f)
  const ifoldr: FoldRightWithIndexFn<F, C> = (b, f) => (fa) => F.ifoldr_(fa, b, f)
  const ifoldMap: FoldMapWithIndexFn<F, C> = (M) => (f) => (fa) => F.ifoldMap_(M)(fa, f)
  return HKT.instance<FoldableWithIndex<F, C>>({
    ifoldl_: F.ifoldl_,
    ifoldl,
    foldl_: (fa, b, f) => F.ifoldl_(fa, b, (_, b, a) => f(b, a)),
    foldl: (b, f) => (fa) => F.ifoldl_(fa, b, (_, b, a) => f(b, a)),
    ifoldr_: F.ifoldr_,
    ifoldr,
    foldr_: (fa, b, f) => F.ifoldr_(fa, b, (_, a, b) => f(a, b)),
    foldr: (b, f) => (fa) => F.ifoldr_(fa, b, (_, a, b) => f(a, b)),
    ifoldMap_: F.ifoldMap_,
    ifoldMap,
    foldMap_: (M) => (fa, f) => F.ifoldMap_(M)(fa, (_, a) => f(a)),
    foldMap: (M) => (f) => (fa) => F.ifoldMap_(M)(fa, (_, a) => f(a))
  })
}

export interface FoldableWithIndexComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends FoldableComposition<F, G, CF, CG> {
  readonly ifoldl_: FoldLeftWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldl: FoldLeftWithIndexFnComposition<F, G, CF, CG>
  readonly ifoldMap_: FoldMapWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldMap: FoldMapWithIndexFnComposition<F, G, CF, CG>
  readonly ifoldr_: FoldRightWithIndexFnComposition_<F, G, CF, CG>
  readonly ifoldr: FoldRightWithIndexFnComposition<F, G, CF, CG>
}

export function getFoldableWithIndexComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: FoldableWithIndex<F, CF>,
  G: FoldableWithIndex<G, CG>
): FoldableWithIndexComposition<F, G, CF, CG>
export function getFoldableWithIndexComposition<F, G>(F: FoldableWithIndex<HKT.F<F>>, G: FoldableWithIndex<HKT.F<G>>) {
  const ifoldl_: FoldLeftWithIndexFnComposition_<HKT.F<F>, HKT.F<G>> = (fga, b, f) =>
    F.ifoldl_(fga, b, (fi, b, ga) => G.ifoldl_(ga, b, (gi, b, a) => f([fi, gi], b, a)))

  const ifoldMap_: FoldMapWithIndexFnComposition_<HKT.F<F>, HKT.F<G>> = (M) => (fga, f) =>
    F.ifoldMap_(M)(fga, (kf, ga) => G.ifoldMap_(M)(ga, (kg, a) => f([kf, kg], a)))

  const ifoldr_: FoldRightWithIndexFnComposition_<HKT.F<F>, HKT.F<G>> = (fga, b, f) =>
    F.ifoldr_(fga, b, (fi, ga, b) => G.ifoldr_(ga, b, (gi, a, b) => f([fi, gi], a, b)))

  const ifoldl: FoldLeftWithIndexFnComposition<HKT.F<F>, HKT.F<G>>  = (b, f) => (fga) => ifoldl_(fga, b, f)
  const ifoldr: FoldRightWithIndexFnComposition<HKT.F<F>, HKT.F<G>> = (b, f) => (fga) => ifoldr_(fga, b, f)
  const ifoldMap: FoldMapWithIndexFnComposition<HKT.F<F>, HKT.F<G>> = (M) => (f) => (fga) => ifoldMap_(M)(fga, f)

  return HKT.instance<FoldableWithIndexComposition<HKT.F<F>, HKT.F<G>>>({
    ifoldl_,
    ifoldMap_,
    ifoldr_,
    ifoldl,
    ifoldMap,
    ifoldr,
    foldl_: (fga, b, f) => ifoldl_(fga, b, (_, b, a) => f(b, a)),
    foldr_: (fga, b, f) => ifoldr_(fga, b, (_, a, b) => f(a, b)),
    foldMap_: (M) => (fga, f) => ifoldMap_(M)(fga, (_, a) => f(a)),
    foldl: (b, f) => (fga) => ifoldl_(fga, b, (_, b, a) => f(b, a)),
    foldr: (b, f) => (fga) => ifoldr_(fga, b, (_, a, b) => f(a, b)),
    foldMap: (M) => (f) => (fga) => ifoldMap_(M)(fga, (_, a) => f(a))
  })
}

export interface FoldLeftWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B>(b: B, f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, b: B, a: A) => B): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => B
}

export interface FoldLeftWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, b: B, a: A) => B
  ): B
}

export interface FoldLeftWithIndexFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, KG, A, B>(
    b: B,
    f: (i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>], b: B, a: A) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftWithIndexFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>], b: B, a: A) => B
  ): B
}

export interface FoldRightWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B>(b: Eval<B>, f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A, b: Eval<B>) => Eval<B>): <
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

export interface FoldRightWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: Eval<B>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldRightWithIndexFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, KG, A, B>(
    b: Eval<B>,
    f: (
      i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>],
      a: A,
      b: Eval<B>
    ) => Eval<B>
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => Eval<B>
}

export interface FoldRightWithIndexFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: Eval<B>,
    f: (
      i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>],
      a: A,
      b: Eval<B>
    ) => Eval<B>
  ): Eval<B>
}

export interface FoldMapWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <M>(M: Monoid<M>): <K, A>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <M>(M: Monoid<M>): <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (k: HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, a: A) => M
  ) => M
}

export interface FoldMapWithIndexFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <M>(M: Monoid<M>): <KF, KG, A>(
    f: (i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>], a: A) => M
  ) => <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapWithIndexFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <M>(M: Monoid<M>): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (i: [HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, HKT.IndexFor<G, HKT.OrFix<CG, 'K', KG>>], a: A) => M
  ) => M
}

export interface FindWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>
  ): Maybe<B>
  <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): Maybe<A>
}

export function getFindWithIndex_<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): FindWithIndexFn_<F, C> {
  return <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): Maybe<A> => F.ifoldr_(fa, Ev.now(Mb.nothing<A>()), (i, a, b) => (predicate(i, a) ? Ev.now(Mb.just(a)) : b)).value
}

export interface FindWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B extends A>(refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Maybe<B>
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Maybe<A>
}

export function getFindWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): FindWithIndexFn<F, C> {
  return <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>) =>
    <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) =>
      getFindWithIndex_(F)(fa, predicate)
}

export interface FindWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <
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
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, Maybe<AF>>
}

export function getFindWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FindWithIndexMFn_<F, CF> {
  return (M) => (fa, p) =>
    M.chainRec_(
      fromFoldableWithIndex(F)(fa),
      Mb.match(
        () => M.pure(E.right(Mb.nothing())),
        ([i, a, src]) => M.map_(p(i, a), (b) => (b ? E.right(Mb.just(a)) : E.left(src.value)))
      )
    )
}

export interface FindWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <KF, AF, KM, QM, WM, XM, IM, SM, RM, EM>(
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, Maybe<AF>>
}

export function getFindWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FindWithIndexMFn<F, CF> {
  return (M) => (p) => (fa) => getFindWithIndexM_(F)(M)(fa, p)
}

export interface FoldLeftWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM>): <
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
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, b: B, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  <M>(M: Monad<HKT.F<M>>): <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    b: B,
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, b: B, a: AF) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldlWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldLeftWithIndexMFn_<F, CF> {
  return <M>(M: Monad<HKT.F<M>>) =>
    <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
      fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
      b: B,
      f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, b: B, a: AF) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
    ): HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B> =>
      F.ifoldl_(fa, M.pure(b), (i, mb, a) => M.chain_(mb, (b) => f(i, b, a)))
}

export interface FoldLeftWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM>): <KF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, b: B, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldlWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldLeftWithIndexMFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldlWithIndexM_(F)(M)(fa, b, f)
}

export interface FoldRightWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <
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
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF, b: B) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  <M>(M: Monad<HKT.F<M>> & TailRec<HKT.F<M>>): <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    b: B,
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF, b: B) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldrWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldRightWithIndexMFn_<F, CF> {
  return <M>(M: Monad<HKT.F<M>> & TailRec<HKT.F<M>>) =>
    <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
      fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
      b: B,
      f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF, b: B) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
    ) => {
      const source = fromFoldableWithIndex(F)(fa)
      return M.chainRec_([b, source] as const, ([z, src]) =>
        Mb.match_(
          src,
          () => M.pure(E.right(z)),
          ([i, a, src]) => M.map_(f(i, a, z), (b) => E.left([b, src.value] as const))
        )
      )
    }
}

export interface FoldRightWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <KF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF, b: B) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldrWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldRightWithIndexMFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldrWithIndexM_(F)(M)(fa, b, f)
}

export interface FoldMapWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <B, M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>, B: Monoid<B>): <
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
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldMapWithIndexMFn_<F, CF> {
  const ifoldrM_ = getFoldrWithIndexM_(F)
  return (M, B) => (fa, f) => ifoldrM_(M)(fa, B.nat, (i, a, b) => M.map_(f(i, a), (b1) => B.combine_(b, b1)))
}

export interface FoldMapWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <B, M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>, B: Monoid<B>): <
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
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  <M, B>(M: Monad<HKT.F<M>> & TailRec<HKT.F<M>>, B: Monoid<B>): <KF, AF, KM, QM, WM, XM, IM, SM, RM, EM>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): FoldMapWithIndexMFn<F, CF> {
  return <M, B>(M: Monad<HKT.F<M>> & TailRec<HKT.F<M>>, B: Monoid<B>) =>
    <KF, AF, KM, QM, WM, XM, IM, SM, RM, EM>(
      f: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B>
    ) =>
    <QF, WF, XF, IF, SF, RF, EF>(
      fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
    ): HKT.FK<M, KM, QM, WM, XM, IM, SM, RM, EM, B> =>
      getFoldMapWithIndexM_(F)(M, B)(fa, f)
}

export interface ExistsWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): boolean
}

export function getExistsWithIndex_<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): ExistsWithIndexFn_<F, C> {
  return (fa, predicate) => F.ifoldr_(fa, Ev.now(false), (i, a, b) => (predicate(i, a) ? Ev.now(true) : b)).value
}

export interface ExistsWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => boolean
}

export function getExistsWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): ExistsWithIndexFn<F, C> {
  return (predicate) => (fa) => getExistsWithIndex_(F)(fa, predicate)
}

export interface ExistsWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <
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
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
}

export function getExistsWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): ExistsWithIndexMFn_<F, CF> {
  return (M) => (fa, p) =>
    M.chainRec_(
      fromFoldableWithIndex(F)(fa),
      Mb.match(
        () => M.pure(E.right(false)),
        ([i, a, src]) => M.map_(p(i, a), (bb) => (bb ? E.right(true) : E.left(src.value)))
      )
    )
}

export interface ExistsWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <KF, AF, KM, QM, WM, XM, IM, SM, RM, EM>(
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
}

export function getExistsWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): ExistsWithIndexMFn<F, CF> {
  return (M) => (p) => (fa) => getExistsWithIndexM_(F)(M)(fa, p)
}

export interface EveryWithIndexFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>
  ): fa is HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): boolean
}

export function getEveryWithIndex_<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): EveryWithIndexFn_<F, C> {
  return <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>
  ): fa is HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A> =>
    F.ifoldr_(fa, Ev.now(true), (i, a, b) => (predicate(i, a) ? b : Ev.now(false))).value
}

export interface EveryWithIndexFn<F extends HKT.HKT, C = HKT.None> {
  <K, A, B extends A>(refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => fa is HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => boolean
}

export function getEveryWithIndex<F extends HKT.HKT, C = HKT.None>(
  F: FoldableWithIndexMin<F, C>
): EveryWithIndexFn<F, C> {
  return <K, A>(predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A>) =>
    <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): fa is HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A> =>
      getEveryWithIndex_(F)(fa, predicate)
}

export interface EveryWithIndexMFn_<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <
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
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
}

export function getEveryWithIndexM_<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): EveryWithIndexMFn_<F, CF> {
  return (M) => (fa, p) =>
    M.chainRec_(
      fromFoldableWithIndex(F)(fa),
      Mb.match(
        () => M.pure(E.right(true)),
        ([i, a, src]) => M.map_(p(i, a), (bb) => (!bb ? E.right(false) : E.left(src.value)))
      )
    )
}

export interface EveryWithIndexMFn<F extends HKT.HKT, CF = HKT.None> {
  <M extends HKT.HKT, CM = HKT.None>(M: Monad<M, CM> & TailRec<M, CM>): <KF, AF, KM, QM, WM, XM, IM, SM, RM, EM>(
    p: (i: HKT.IndexFor<F, HKT.OrFix<CF, 'K', KF>>, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, boolean>
}

export function getEveryWithIndexM<F extends HKT.HKT, CF = HKT.None>(
  F: FoldableWithIndexMin<F, CF>
): EveryWithIndexMFn<F, CF> {
  return (M) => (p) => (fa) => getEveryWithIndexM_(F)(M)(fa, p)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

type SourceWithIndex<F extends HKT.HKT, C, K, A> = Maybe<
  readonly [HKT.IndexFor<F, HKT.OrFix<C, 'K', K>>, A, Eval<SourceWithIndex<F, C, K, A>>]
>

function fromFoldableWithIndex<F extends HKT.HKT, C>(F: FoldableWithIndexMin<F, C>) {
  return <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): SourceWithIndex<F, C, K, A> =>
    F.ifoldr_(fa, Ev.now<SourceWithIndex<F, C, K, A>>(Mb.nothing()), (i, a, evalSrc) =>
      Ev.later(() => Mb.just([i, a, evalSrc] as const))
    ).value
}
