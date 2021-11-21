import * as H from './HKT'

export interface Functor<F extends H.HKT, C = H.None> extends H.Typeclass<F, C> {
  readonly map_: MapFn_<F, C>
  readonly map: MapFn<F, C>
  readonly flap_: FlapFn_<F, C>
  readonly flap: FlapFn<F, C>
  readonly as_: AsFn_<F, C>
  readonly as: AsFn<F, C>
  readonly fcross_: FCrossFn_<F, C>
  readonly fcross: FCrossFn<F, C>
}

export type FunctorMin<F extends H.HKT, C = H.None> = {
  readonly map_: MapFn_<F, C>
}

export function Functor<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): Functor<F, C> {
  const flap_   = flapF_(F)
  const as_     = asF_(F)
  const fcross_ = fcrossF_(F)
  return H.instance<Functor<F, C>>({
    map_: F.map_,
    map: (f) => (fa) => F.map_(fa, f),
    flap_,
    flap: (a) => (fab) => flap_(fab, a),
    as_,
    as: (b) => (fa) => as_(fa, b),
    fcross_,
    fcross: (f) => (fa) => fcross_(fa, f)
  })
}

export interface Functor2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None>
  extends H.Typeclass2<F, G, CF, CG> {
  readonly map_: MapFn2_<F, G, CF, CG>
  readonly map: MapFn2<F, G, CF, CG>
}

export function getFunctorComposition<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None>(
  F: Functor<F, CF>,
  G: Functor<G, CG>
): Functor2<F, G, CF, CG> {
  const map_: MapFn2_<F, G, CF, CG> = (fga, f) => F.map_(fga, (ga) => G.map_(ga, f))

  return H.instance<Functor2<F, G, CF, CG>>({
    map_,
    map: (f) => (fga) => map_(fga, f)
  })
}

export interface MapFn<F extends H.HKT, C = H.None> {
  <A, B>(f: (a: A) => B): <K, Q, W, X, I, S, R, E>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => H.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface MapFn_<F extends H.HKT, C = H.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (a: A) => B): H.Kind<
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

export interface MapFn2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <A, B>(f: (a: A) => B): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface MapFn2_<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B
  ): H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface FlapFn_<F extends H.HKT, TC = H.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fab: H.Kind<F, TC, K, Q, W, X, I, S, R, E, (a: A) => B>, a: A): H.Kind<
    F,
    TC,
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

export interface FlapFn<F extends H.HKT, TC = H.None> {
  <A>(a: A): <K, Q, W, X, I, S, R, E, B>(
    fab: H.Kind<F, TC, K, Q, W, X, I, S, R, E, (a: A) => B>
  ) => H.Kind<F, TC, K, Q, W, X, I, S, R, E, B>
}

export interface FlapFn2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <A>(a: A): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, B>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, (a: A) => B>>
  ) => H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface FlapFn2_<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, (a: A) => B>>,
    a: A
  ): H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export function flapF_<F extends H.HKT, TC = H.None>(F: FunctorMin<F, TC>): FlapFn_<F, TC> {
  return (fab, a) => F.map_(fab, (f) => f(a))
}

export function flapF<F extends H.HKT, TC = H.None>(F: FunctorMin<F, TC>): FlapFn<F, TC> {
  const flap_ = flapF_(F)
  return (a) => (fab) => flap_(fab, a)
}

export interface AsFn_<F extends H.HKT, C = H.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>, b: () => B): H.Kind<
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

export interface AsFn<F extends H.HKT, C = H.None> {
  <B>(b: () => B): <K, Q, W, X, I, S, R, E, A>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => H.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export interface AsFn2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <B>(b: () => B): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface AsFn2_<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: () => B
  ): H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export function asF_<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): AsFn_<F, C> {
  return (fa, b) => F.map_(fa, b)
}

export function asF<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): AsFn<F, C> {
  return (b) => (fa) => F.map_(fa, b)
}

export interface FCrossFn_<F extends H.HKT, C = H.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (a: A) => B): H.Kind<
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
    readonly [A, B]
  >
}

export interface FCrossFn<F extends H.HKT, C = H.None> {
  <A, B>(f: (a: A) => B): <K, Q, W, X, I, S, R, E>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => H.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [A, B]>
}

export interface FCrossFn2<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <A, B>(f: (a: A) => B): <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [A, B]>>
}

export interface FCrossFn2_<F extends H.HKT, G extends H.HKT, CF = H.None, CG = H.None> {
  <KF, QF, WF, XF, IF, SF, RF, EF, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B
  ): H.Kind<F, CF, KF, QF, WF, XF, IF, SF, RF, EF, H.Kind<G, CG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [A, B]>>
}

export function fcrossF_<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): FCrossFn_<F, C> {
  return (fa, f) => F.map_(fa, (a) => [a, f(a)])
}

export function fcrossF<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): FCrossFn<F, C> {
  return (f) => (fa) => F.map_(fa, (a) => [a, f(a)])
}

export interface ToSFn_<F extends H.HKT, C = H.None> {
  <K, Q, W, X, I, S, R, E, A, BN extends string>(fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>, name: BN): H.Kind<
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
    { [K in BN]: A }
  >
}

export function toSF_<F extends H.HKT, C = H.None>(F: Functor<F, C>): ToSFn_<F, C> {
  return <K, Q, W, X, I, S, R, E, A, BN extends string>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    name: BN
  ): H.Kind<F, C, K, Q, W, X, I, S, R, E, { [K in BN]: A }> => F.map_(fa, (a) => ({ [name]: a } as { [K in BN]: A }))
}

export interface ToSFn<F extends H.HKT, C = H.None> {
  <BN extends string>(name: BN): <K, Q, W, X, I, S, R, E, A>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => H.Kind<F, C, K, Q, W, X, I, S, R, E, { [K in BN]: A }>
}

export function toSF<F extends H.HKT, C = H.None>(F: Functor<F, C>): ToSFn<F, C> {
  return <BN extends string>(
    name: BN
  ): (<K, Q, W, X, I, S, R, E, A>(
    fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => H.Kind<F, C, K, Q, W, X, I, S, R, E, { [K in BN]: A }>) =>
    F.map((a) => ({ [name]: a } as { [K in BN]: typeof a }))
}

export interface TupledFn<F extends H.HKT, C = H.None> {
  <K, Q, W, X, I, S, R, E, A>(fa: H.Kind<F, C, K, Q, W, X, I, S, R, E, A>): H.Kind<
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
    readonly [A]
  >
}

export function tupledF<F extends H.HKT, C = H.None>(F: FunctorMin<F, C>): TupledFn<F, C> {
  return (fa) => F.map_(fa, (a) => [a])
}
