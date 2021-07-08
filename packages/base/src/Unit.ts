import type * as HKT from './HKT'

/**
 * `Unit` describes the `unit` function, which is a natural transformation from the identity
 * of the `syntactic category` of the language, in this case `void`, to a `Functor`
 */
export interface Unit<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly unit: UnitFn<F, TC>
}

export type UnitMin<F extends HKT.URIS, C = HKT.Auto> = { readonly unit: UnitFn<F, C> }

export interface Unit2<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  readonly unit: UnitFn2<F, G, TCF, TCG>
}

export interface UnitFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(/* void */): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, void>
}

export interface UnitFn2<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  <
    NF extends string = HKT.Initial<TCF, 'N'>,
    KF = HKT.Initial<TCF, 'K'>,
    QF = HKT.Initial<TCF, 'Q'>,
    WF = HKT.Initial<TCF, 'W'>,
    XF = HKT.Initial<TCF, 'X'>,
    IF = HKT.Initial<TCF, 'I'>,
    SF = HKT.Initial<TCF, 'S'>,
    RF = HKT.Initial<TCF, 'R'>,
    EF = HKT.Initial<TCF, 'E'>,
    NG extends string = HKT.Initial<TCG, 'N'>,
    KG = HKT.Initial<TCG, 'K'>,
    QG = HKT.Initial<TCG, 'Q'>,
    WG = HKT.Initial<TCG, 'W'>,
    XG = HKT.Initial<TCG, 'X'>,
    IG = HKT.Initial<TCG, 'I'>,
    SG = HKT.Initial<TCG, 'S'>,
    RG = HKT.Initial<TCG, 'R'>,
    EG = HKT.Initial<TCG, 'E'>
  >(/* void */): HKT.Kind<
    F,
    TCF,
    NF,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, void>
  >
}
