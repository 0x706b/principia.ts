import type * as H from './HKT'

/**
 * `Unit` describes the `unit` function, which is a natural transformation from the identity
 * of the `syntactic category` of the language, in this case `void`, to a `Functor`
 */
export interface Unit<F extends H.HKT, C = H.None> extends H.Typeclass<F, C> {
  readonly unit: UnitFn<F, C>
}

export type UnitMin<F extends H.HKT, C = H.None> = { readonly unit: UnitFn<F, C> }

export interface Unit2<F extends H.HKT, G extends H.HKT, C = H.None, D = H.None> extends H.Typeclass2<F, G, C, D> {
  readonly unit: UnitFn2<F, G, C, D>
}

export interface UnitFn<F extends H.HKT, C = H.None> {
  <
    K = H.Low<F, 'K'>,
    Q = H.Low<F, 'Q'>,
    W = H.Low<F, 'W'>,
    X = H.Low<F, 'X'>,
    I = H.Low<F, 'I'>,
    S = H.Low<F, 'S'>,
    R = H.Low<F, 'R'>,
    E = H.Low<F, 'E'>
  >(/* void */): H.Kind<F, C, K, Q, W, X, I, S, R, E, void>
}

export interface UnitFn2<F extends H.HKT, G extends H.HKT, C = H.None, D = H.None> {
  <
    KF = H.Low<F, 'K'>,
    QF = H.Low<F, 'Q'>,
    WF = H.Low<F, 'W'>,
    XF = H.Low<F, 'X'>,
    IF = H.Low<F, 'I'>,
    SF = H.Low<F, 'S'>,
    RF = H.Low<F, 'R'>,
    EF = H.Low<F, 'E'>,
    KG = H.Low<G, 'K'>,
    QG = H.Low<G, 'Q'>,
    WG = H.Low<G, 'W'>,
    XG = H.Low<G, 'X'>,
    IG = H.Low<G, 'I'>,
    SG = H.Low<G, 'S'>,
    RG = H.Low<G, 'R'>,
    EG = H.Low<G, 'E'>
  >(/* void */): H.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, D, KG, QG, WG, XG, IG, SG, RG, EG, void>>
}
