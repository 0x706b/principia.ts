import { pipe } from './function'
import * as HKT from './HKT'

export interface Invariant<F extends HKT.HKT, TC = HKT.None> extends HKT.Typeclass<F, TC> {
  readonly invmap_: InvMapFn_<F, TC>
  readonly invmap: InvMapFn<F, TC>
}

export interface InvariantComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>
  extends HKT.Typeclass2<F, G, CF, CG> {
  readonly invmap_: InvMapFnComposition_<F, G, CF, CG>
  readonly invmap: InvMapFnComposition<F, G, CF, CG>
}

export function getInvariantComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None>(
  F: Invariant<F, CF>,
  G: Invariant<G, CG>
): InvariantComposition<F, G, CF, CG>
export function getInvariantComposition<F, G>(
  F: Invariant<HKT.F<F>>,
  G: Invariant<HKT.F<G>>
): InvariantComposition<HKT.F<F>, HKT.F<G>> {
  return HKT.instance<InvariantComposition<HKT.F<F>, HKT.F<G>>>({
    invmap_: (fga, f, g) => F.invmap_(fga, G.invmap(f, g), G.invmap(g, f)),
    invmap: (f, g) => (fga) => pipe(fga, F.invmap(G.invmap(f, g), G.invmap(g, f)))
  })
}

export interface InvMapFn<F extends HKT.HKT, C = HKT.None> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface InvMapFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface InvMapFnComposition<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface InvMapFnComposition_<F extends HKT.HKT, G extends HKT.HKT, CF = HKT.None, CG = HKT.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
