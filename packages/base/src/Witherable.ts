import type { Applicative } from './Applicative'
import type { FilterableMin } from './Filterable'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'
import type { TraversableMin } from './Traversable'

import { Filterable } from './Filterable'
import * as HKT from './HKT'
import * as Mb from './internal/Maybe'
import { Traversable } from './Traversable'

export interface Witherable<F extends HKT.HKT, C = HKT.None> extends Filterable<F, C>, Traversable<F, C> {
  readonly wilt_: WiltFn_<F, C>
  readonly wilt: WiltFn<F, C>
  readonly wither_: WitherFn_<F, C>
  readonly wither: WitherFn<F, C>
}

export type WitherableMin<F extends HKT.HKT, C = HKT.None> = FilterableMin<F, C> &
  TraversableMin<F, C> & {
    readonly wilt_: WiltFn_<F, C>
    readonly wither_: WitherFn_<F, C>
  }

export function Witherable<F extends HKT.HKT, C = HKT.None>(F: WitherableMin<F, C>): Witherable<F, C> {
  return HKT.instance({
    ...Filterable(F),
    ...Traversable(F),
    wilt_: F.wilt_,
    wilt: <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>) => {
      const wilt_ = F.wilt_(A)
      return <KG, QG, WG, XG, IG, SG, RG, EG, A, B, B1>(
          f: (a: A) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
        ) =>
        <K, Q, W, X, I, S, R, E>(wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) =>
          wilt_(wa, f)
    },
    wither_: F.wither_,
    wither: <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>) => {
      const wither_ = F.wither_(A)
      return <KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
          f: (a: A) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
        ) =>
        <K, Q, W, X, I, S, R, E>(wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) =>
          wither_(wa, (a) => f(a))
    }
  })
}

export interface WitherFn<F extends HKT.HKT, C = HKT.None> {
  <G extends HKT.HKT, GC = HKT.None>(A: Applicative<G, GC>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    f: (a: A) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, Maybe<B>>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface WitherFn_<F extends HKT.HKT, C = HKT.None> {
  <G extends HKT.HKT, GC = HKT.None>(A: Applicative<G, GC>): <
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

export function implementWither<F extends HKT.HKT, C = HKT.None>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, A, GK, GQ, GW, GX, GI, GS, GR, GE, B, G>(_: {
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
    A: Applicative<HKT.F<G>>
  ) => (
    f: (a: A) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, Maybe<B>>
  ) => (
    wa: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn<F, C>
export function implementWither() {
  return (i: any) => i()
}

export function implementWither_<F extends HKT.HKT, C = HKT.None>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, GK, GQ, GW, GX, GI, GS, GR, GE, A, B, G>(_: {
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
    A: Applicative<HKT.F<G>>
  ) => (
    wa: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, Maybe<B>>
  ) => HKT.FK<G, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn_<F, C>
export function implementWither_() {
  return (i: any) => i()
}

export interface WiltFn<F extends HKT.HKT, C = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(A: Applicative<G, CG>): <KG, QG, WG, XG, IG, SG, RG, EG, A, B, B1>(
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

export interface WiltFn_<F extends HKT.HKT, C = HKT.None> {
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

export function implementWilt<F extends HKT.HKT, C = HKT.None>(): (
  i: <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B, B1, G>(_: {
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
    A: Applicative<HKT.F<G>>
  ) => (
    f: (a: A) => HKT.FK<G, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
  ) => (
    wa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.FK<
    G,
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
) => WiltFn<F, C>
export function implementWilt() {
  return (i: any) => i()
}

export interface FilterAFn_<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(G: Applicative<G, CG>): <
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

export function getFilterA_<F extends HKT.HKT, CF = HKT.None>(F: WitherableMin<F, CF>): FilterAFn_<F, CF> {
  return (G) => (fa, p) => F.wither_(G)(fa, (a) => G.map_(p(a), (bb) => (bb ? Mb.just(a) : Mb.nothing())))
}

export interface FilterAFn<F extends HKT.HKT, CF = HKT.None> {
  <G extends HKT.HKT, CG = HKT.None>(G: Applicative<G, CG>): <AF, KG, QG, WG, XG, IG, SG, RG, EG>(
    p: (a: AF) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, boolean>
  ) => <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>
  ) => HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, AF>>
}

export function getFilterA<F extends HKT.HKT, CF = HKT.None>(F: WitherableMin<F, CF>): FilterAFn<F, CF> {
  return (G) => (p) => (fa) => getFilterA_(F)(G)(fa, p)
}
