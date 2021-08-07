import type { Eval } from './Eval'
import type { Option } from './internal/Option'
import type { Monad } from './Monad'
import type { Monoid } from './Monoid'
import type { TailRec } from './TailRec'

import * as Ev from './Eval/core'
import * as HKT from './HKT'
import * as E from './internal/Either'
import * as O from './internal/Option'

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
  <A, B>(b: B, f: (b: B, a: A) => B): <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => B
}

export interface FoldLeftFn_<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, b: B, f: (b: B, a: A) => B): B
}

export interface FoldLeftFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(b: B, f: (b: B, a: A) => B): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (b: B, a: A) => B
  ): B
}

export interface FoldRightFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(b: Eval<B>, f: (a: A, b: Eval<B>) => Eval<B>): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => Eval<B>
}

export interface FoldRightFn_<F extends HKT.URIS, C = HKT.Auto> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldRightFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(b: Eval<B>, f: (a: A, b: Eval<B>) => Eval<B>): <
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
    GE
  >(
    fa: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, A>>
  ) => Eval<B>
}

export interface FoldRightFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <FK, FQ, FW, FX, FI, FS, FR, FE, GK, GQ, GW, GX, GI, GS, GR, GE, A, B>(
    fa: HKT.Kind<F, CF, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GK, GQ, GW, GX, GI, GS, GR, GE, A>>,
    b: Eval<B>,
    f: (a: A, b: Eval<B>) => Eval<B>
  ): Eval<B>
}

export interface FoldMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <A>(f: (a: A) => M) => <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (a: A) => M) => M
}

export interface FoldMapFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <A>(
    f: (a: A) => M
  ) => <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => M
  ) => M
}

export interface FoldLeftMFn_<F extends HKT.URIS, CF = HKT.Auto> {
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
    f: (b: B, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export interface FoldLeftMFn<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM>): <AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (b: B, a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldlM_<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldLeftMFn_<F, CF> {
  return (M) => (fa, b, f) => F.foldl_(fa, M.pure(b), (mb, a) => M.chain_(mb, (b) => f(b, a)))
}

export function getFoldlM<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldLeftMFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldlM_(F)(M)(fa, b, f)
}

export interface FoldRightMFn_<F extends HKT.URIS, CF = HKT.Auto> {
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
    f: (a: AF, b: B) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export interface FoldRightMFn<F extends HKT.URIS, CF = HKT.Auto> {
  <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>): <AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
    b: B,
    f: (a: AF, b: B) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldrM_<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldRightMFn_<F, CF> {
  return <M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>) =>
    <KF, QF, WF, XF, IF, SF, RF, EF, AF, B, KM, QM, WM, XM, IM, SM, RM, EM>(
      fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
      b: B,
      f: (a: AF, b: B) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
    ) => {
      const source = fromFoldable(F)(fa)
      return M.chainRec_([b, source] as const, ([z, src]) =>
        O.match_(
          src,
          () => M.pure(E.right(z)),
          ([a, src]) => M.map_(f(a, z), (b) => E.left([b, src.value]))
        )
      )
    }
}

export function getFoldrM<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldRightMFn<F, CF> {
  return (M) => (b, f) => (fa) => getFoldrM_(F)(M)(fa, b, f)
}

export interface FoldMapMFn_<F extends HKT.URIS, CF = HKT.Auto> {
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
    f: (a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapM_<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldMapMFn_<F, CF> {
  const foldrM_ = getFoldrM_(F)
  return (M, B) => (fa, f) => foldrM_(M)(fa, B.nat, (a, b) => M.map_(f(a), (b1) => B.combine_(b, b1)))
}

export interface FoldMapMFn<F extends HKT.URIS, CF = HKT.Auto> {
  <B, M extends HKT.URIS, CM = HKT.Auto>(M: Monad<M, CM> & TailRec<M, CM>, B: Monoid<B>): <
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
    f: (a: AF) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<M, CM, KM, QM, WM, XM, IM, SM, RM, EM, B>
}

export function getFoldMapM<F extends HKT.URIS, CF = HKT.Auto>(F: Foldable<F, CF>): FoldMapMFn<F, CF> {
  return (M, B) => (f) => (fa) => getFoldMapM_(F)(M, B)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

type Source<A> = Option<readonly [A, Eval<Source<A>>]>

function fromFoldable<F extends HKT.URIS, C>(F: Foldable<F, C>) {
  return <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): Source<A> =>
    F.foldr_(fa, Ev.now<Source<A>>(O.none()), (a, evalSrc) => Ev.later(() => O.some([a, evalSrc] as const))).value
}
