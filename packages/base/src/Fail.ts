import * as HKT from './HKT'

export interface Fail<F extends HKT.HKT, TC = HKT.None> extends HKT.Typeclass<F, TC> {
  readonly fail: FailFn<F, TC>
}

export type FailMin<F extends HKT.HKT, C = HKT.None> = {
  readonly fail: FailFn<F, C>
}

export function Fail<F extends HKT.HKT, C = HKT.None>(F: FailMin<F, C>): Fail<F, C> {
  return HKT.instance({
    fail: F.fail
  })
}

export interface FailFn<F extends HKT.HKT, C = HKT.None> {
  <
    E,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    A = never
  >(
    e: HKT.OrFix<C, 'E', E>
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface FailFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <
    EG,
    KF = HKT.Low<F, 'K'>,
    QF = HKT.Low<F, 'Q'>,
    WF = HKT.Low<F, 'W'>,
    XF = HKT.Low<F, 'X'>,
    IF = HKT.Low<F, 'I'>,
    SF = HKT.Low<F, 'S'>,
    RF = HKT.Low<F, 'R'>,
    EF = HKT.Low<F, 'E'>,
    KG = HKT.Low<G, 'K'>,
    QG = HKT.Low<G, 'Q'>,
    WG = HKT.Low<G, 'W'>,
    XG = HKT.Low<G, 'X'>,
    IG = HKT.Low<G, 'I'>,
    SG = HKT.Low<G, 'S'>,
    RG = HKT.Low<G, 'R'>,
    A = never
  >(
    e: EG
  ): HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
}
