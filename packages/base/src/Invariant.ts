import * as HKT from './HKT'

export interface Invariant<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly invmap_: InvMapFn_<F, TC>
  readonly invmap: InvMapFn<F, TC>
}

export interface InvariantComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly invmap_: InvMapFnComposition_<F, G, CF, CG>
  readonly invmap: InvMapFnComposition<F, G, CF, CG>
}

export function getInvariantComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Invariant<F, CF>,
  G: Invariant<G, CG>
): InvariantComposition<F, G, CF, CG>
export function getInvariantComposition<F, G>(F: Invariant<HKT.UHKT<F>>, G: Invariant<HKT.UHKT<G>>) {
  return HKT.instance<InvariantComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    invmap_: (fga, f, g) => F.invmap_(fga, G.invmap(f, g), G.invmap(g, f)),
    invmap: (f, g) => F.invmap(G.invmap(f, g), G.invmap(g, f))
  })
}

export interface InvMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface InvMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface InvMapFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <
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
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface InvMapFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
