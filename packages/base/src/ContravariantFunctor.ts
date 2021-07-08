import * as HKT from './HKT'

export interface ContravariantFunctor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly contramap: ContramapFn<F, C>
  readonly contramap_: ContramapFn_<F, C>
}

export interface ContravariantFunctor2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly contramap: ContramapFn2<F, G, CF, CG>
}

export function getContravariantFunctorComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(F: ContravariantFunctor<F, CF>, G: ContravariantFunctor<G, CG>): ContravariantFunctor2<F, G, CF, CG>
export function getContravariantFunctorComposition<F, G>(
  F: ContravariantFunctor<HKT.UHKT<F>>,
  G: ContravariantFunctor<HKT.UHKT<G>>
) {
  return HKT.instance<ContravariantFunctor2<HKT.UHKT<F>, HKT.UHKT<G>>>({
    contramap: (f) => F.contramap(G.contramap(f))
  })
}

export interface ContramapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: B) => A): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface ContramapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: B) => A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface ContramapFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (b: A) => B): <
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
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
