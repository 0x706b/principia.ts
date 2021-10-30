import type { Applicative } from './Applicative'
import type { FilterableWithIndexMin } from './FilterableWithIndex'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'
import type { TraversableWithIndexMin } from './TraversableWithIndex'

import { FilterableWithIndex } from './FilterableWithIndex'
import * as HKT from './HKT'
import * as Mb from './internal/Maybe'
import { TraversableWithIndex } from './TraversableWithIndex'

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FilterableWithIndex<F, C>,
    TraversableWithIndex<F, C> {
  readonly iwither_: WitherWithIndexFn_<F, C>
  readonly iwither: WitherWithIndexFn<F, C>
  readonly iwilt_: WiltWithIndexFn_<F, C>
  readonly iwilt: WiltWithIndexFn<F, C>
}

export type WitherableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = FilterableWithIndexMin<F, C> &
  TraversableWithIndexMin<F, C> & {
    readonly iwither_: WitherWithIndexFn_<F, C>
    readonly iwilt_: WiltWithIndexFn_<F, C>
  }

export function WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: WitherableWithIndexMin<F, C>
): WitherableWithIndex<F, C> {
  return HKT.instance({
    ...FilterableWithIndex(F),
    ...TraversableWithIndex(F),
    iwilt_: F.iwilt_,
    iwilt: (AG) => {
      const iwilt_ = F.iwilt_(AG)
      return (f) => (wa) => iwilt_(wa, f)
    },
    iwither_: F.iwither_,
    iwither: (AG) => {
      const iwither_ = F.iwither_(AG)
      return (f) => (wa) => iwither_(wa, f)
    }
  })
}

export interface WitherWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B, KF>(
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface WitherWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
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
    A,
    B
  >(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export function implementFilterMapWithIndexA<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
    A: A
    B: B
    G: G
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', F, KF>>) => HKT.HKT<G, Maybe<B>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => WitherWithIndexFn<F, C>
export function implementFilterMapWithIndexA() {
  return (i: any) => i()
}

export function implementWitherWithIndex_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
    A: A
    B: B
    G: G
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.HKT<G, Maybe<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => WitherWithIndexFn_<F, C>
export function implementWitherWithIndex_() {
  return (i: any) => i()
}

export interface WiltWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B, B2, KF>(
    f: (
      a: A,
      k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>
    ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B2>>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<
    G,
    GC,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B2>]
  >
}

export interface WiltWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
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
    A,
    B,
    B2
  >(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (
      a: A,
      k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>
    ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B2>>
  ) => HKT.Kind<
    G,
    GC,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B2>]
  >
}

export function implementPartitionMapWithIndexA<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
    A: A
    B: B
    B2: B2
    G: G
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.HKT<G, Either<B, B2>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<
    G,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B2>]
  >
) => WiltWithIndexFn<F, C>
export function implementPartitionMapWithIndexA() {
  return (i: any) => i()
}

export function implementPartitionMapWithIndexA_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
    A: A
    B: B
    B2: B2
    G: G
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.HKT<G, Either<B, B2>>
  ) => HKT.HKT<
    G,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B2>]
  >
) => WiltWithIndexFn_<F, C>
export function implementPartitionMapWithIndexA_() {
  return (i: any) => i()
}

export interface FilterWithIndexAFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(G: Applicative<G, CG>): <
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    AF,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG
  >(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>,
    p: (a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterWithIndexA_<F extends HKT.URIS, CF = HKT.Auto>(
  F: WitherableWithIndexMin<F, CF>
): FilterWithIndexAFn_<F, CF> {
  return (G) => (fa, p) => F.iwither_(G)(fa, (a, i) => G.map_(p(a, i), (bb) => (bb ? Mb.just(a) : Mb.nothing())))
}

export interface FilterWithIndexAFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(G: Applicative<G, CG>): <KF, AF, KG, QG, WG, XG, IG, SG, RG, EG>(
    p: (a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterWithIndexA<F extends HKT.URIS, CF = HKT.Auto>(
  F: WitherableWithIndexMin<F, CF>
): FilterWithIndexAFn<F, CF> {
  return (G) => (p) => (fa) => getFilterWithIndexA_(F)(G)(fa, p)
}
