import { pipe } from './function'
import * as HKT from './HKT'

export interface ContravariantFunctor<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly contramap: ContramapFn<F, C>
  readonly contramap_: ContramapFn_<F, C>
}

export interface ContravariantFunctor2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends HKT.Typeclass2<F, G, CF, CG> {
  readonly contramap: ContramapFn2<F, G, CF, CG>
}

export function getContravariantFunctorComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: ContravariantFunctor<F, CF>,
  G: ContravariantFunctor<G, CG>
): ContravariantFunctor2<F, G, CF, CG>
export function getContravariantFunctorComposition<F, G>(
  F: ContravariantFunctor<HKT.F<F>>,
  G: ContravariantFunctor<HKT.F<G>>
) {
  return HKT.instance<ContravariantFunctor2<HKT.F<F>, HKT.F<G>>>({
    contramap: (f) => (fga) => pipe(fga, F.contramap(G.contramap(f)))
  })
}

export interface ContramapFn<F extends HKT.HKT, C = HKT.None> {
  <A, B>(f: (a: B) => A): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface ContramapFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (a: B) => A): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    B
  >
}

export interface ContramapFn2<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <A, B>(f: (b: A) => B): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fa: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
