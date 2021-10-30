import type { Applicative } from './Applicative'
import type { FilterableMin } from './Filterable'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'
import type { TraversableMin } from './Traversable'

import { Filterable } from './Filterable'
import * as HKT from './HKT'
import * as Mb from './internal/Maybe'
import { Traversable } from './Traversable'

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends Filterable<F, C>, Traversable<F, C> {
  readonly wilt_: WiltFn_<F, C>
  readonly wilt: WiltFn<F, C>
  readonly wither_: WitherFn_<F, C>
  readonly wither: WitherFn<F, C>
}

export type WitherableMin<F extends HKT.URIS, C = HKT.Auto> = FilterableMin<F, C> &
  TraversableMin<F, C> & {
    readonly wilt_: WiltFn_<F, C>
    readonly wither_: WitherFn_<F, C>
  }

export function Witherable<F extends HKT.URIS, C = HKT.Auto>(F: WitherableMin<F, C>): Witherable<F, C> {
  return HKT.instance({
    ...Filterable(F),
    ...Traversable(F),
    wilt_: F.wilt_,
    wilt: (A) => {
      const wilt_ = F.wilt_(A)
      return (f) => (wa) => wilt_(wa, f)
    },
    wither_: F.wither_,
    wither: (A) => {
      const wither_ = F.wither_(A)
      return (f) => (wa) => wither_(wa, f)
    }
  })
}

export interface WitherFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(A: Applicative<G, GC>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    f: (a: A) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface WitherFn_<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(A: Applicative<G, GC>): <
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
    f: (a: A) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export function implementWither<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A
    B: B
    G: G
    FK: FK
    FQ: FQ
    FW: FW
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    A: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Maybe<B>>
  ) => (
    wa: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn<F, C>
export function implementWither() {
  return (i: any) => i()
}

export function implementWither_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A
    B: B
    G: G
    FK: FK
    FQ: FQ
    FW: FW
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    A: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.HKT<G, Maybe<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn_<F, C>
export function implementWither_() {
  return (i: any) => i()
}

export interface WiltFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B, B1>(
    f: (a: A) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<
    G,
    CG,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B1>]
  >
}

export interface WiltFn_<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
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
    B1,
    A,
    B
  >(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
  ) => HKT.Kind<
    G,
    CG,
    KG,
    QG,
    WG,
    XG,
    IG,
    SG,
    RG,
    EG,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B1>]
  >
}

export function implementWilt<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, A, B, B1, G>(_: {
    A: A
    B: B
    B1: B1
    G: G
    KF: KF
    QF: QF
    WF: WF
    XF: XF
    IF: IF
    SF: SF
    RF: RF
    EF: EF
  }) => (
    A: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Either<B, B1>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<
    G,
    readonly [HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B1>]
  >
) => WiltFn<F, C>
export function implementWilt() {
  return (i: any) => i()
}

export interface FilterAFn_<F extends HKT.URIS, CF = HKT.Auto> {
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
    p: (a: AF) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterA_<F extends HKT.URIS, CF = HKT.Auto>(F: WitherableMin<F, CF>): FilterAFn_<F, CF> {
  return (G) => (fa, p) => F.wither_(G)(fa, (a) => G.map_(p(a), (bb) => (bb ? Mb.just(a) : Mb.nothing())))
}

export interface FilterAFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(G: Applicative<G, CG>): <AF, KG, QG, WG, XG, IG, SG, RG, EG>(
    p: (a: AF) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterA<F extends HKT.URIS, CF = HKT.Auto>(F: WitherableMin<F, CF>): FilterAFn<F, CF> {
  return (G) => (p) => (fa) => getFilterA_(F)(G)(fa, p)
}
