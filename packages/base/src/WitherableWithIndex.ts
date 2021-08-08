import type { Applicative } from './Applicative'
import type { FilterableWithIndexMin } from './FilterableWithIndex'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'
import type { TraversableWithIndexMin } from './TraversableWithIndex'

import { FilterableWithIndex } from './FilterableWithIndex'
import * as HKT from './HKT'
import * as O from './internal/Option'
import { TraversableWithIndex } from './TraversableWithIndex'

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FilterableWithIndex<F, C>,
    TraversableWithIndex<F, C> {
  readonly ifilterMapA_: FilterMapWithIndexAFn_<F, C>
  readonly ifilterMapA: FilterMapWithIndexAFn<F, C>
  readonly ipartitionMapA_: PartitionMapWithIndexAFn_<F, C>
  readonly ipartitionMapA: PartitionMapWithIndexAFn<F, C>
}

export type WitherableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = FilterableWithIndexMin<F, C> &
  TraversableWithIndexMin<F, C> & {
    readonly ifilterMapA_: FilterMapWithIndexAFn_<F, C>
    readonly ipartitionMapA_: PartitionMapWithIndexAFn_<F, C>
  }

export function WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: WitherableWithIndexMin<F, C>
): WitherableWithIndex<F, C> {
  return HKT.instance({
    ...FilterableWithIndex(F),
    ...TraversableWithIndex(F),
    ipartitionMapA_: F.ipartitionMapA_,
    ipartitionMapA: (AG) => {
      const ipartitionMapAG_ = F.ipartitionMapA_(AG)
      return (f) => (wa) => ipartitionMapAG_(wa, f)
    },
    ifilterMapA_: F.ifilterMapA_,
    ifilterMapA: (AG) => {
      const ifilterMapAG_ = F.ifilterMapA_(AG)
      return (f) => (wa) => ifilterMapAG_(wa, f)
    }
  })
}

export interface FilterMapWithIndexAFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B, KF>(
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface FilterMapWithIndexAFn_<F extends HKT.URIS, C = HKT.Auto> {
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
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
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
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', F, KF>>) => HKT.HKT<G, Option<B>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => FilterMapWithIndexAFn<F, C>
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
    f: (a: A, i: HKT.IndexFor<F, HKT.OrFix<'K', C, KF>>) => HKT.HKT<G, Option<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => FilterMapWithIndexAFn_<F, C>
export function implementWitherWithIndex_() {
  return (i: any) => i()
}

export interface PartitionMapWithIndexAFn<F extends HKT.URIS, C = HKT.Auto> {
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

export interface PartitionMapWithIndexAFn_<F extends HKT.URIS, C = HKT.Auto> {
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
) => PartitionMapWithIndexAFn<F, C>
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
) => PartitionMapWithIndexAFn_<F, C>
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

export function getFilterA_<F extends HKT.URIS, CF = HKT.Auto>(
  F: WitherableWithIndexMin<F, CF>
): FilterWithIndexAFn_<F, CF> {
  return (G) => (fa, p) => F.ifilterMapA_(G)(fa, (a, i) => G.map_(p(a, i), (bb) => (bb ? O.some(a) : O.none())))
}

export interface FilterWithIndexAFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(G: Applicative<G, CG>): <KF, AF, KG, QG, WG, XG, IG, SG, RG, EG>(
    p: (a: AF, i: HKT.IndexFor<F, HKT.OrFix<'K', CF, KF>>) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterA<F extends HKT.URIS, CF = HKT.Auto>(
  F: WitherableWithIndexMin<F, CF>
): FilterWithIndexAFn<F, CF> {
  return (G) => (p) => (fa) => getFilterA_(F)(G)(fa, p)
}
