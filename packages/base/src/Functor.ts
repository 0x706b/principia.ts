import * as HKT from './HKT'

export interface Functor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly map_: MapFn_<F, C>
  readonly map: MapFn<F, C>
  readonly flap_: FlapFn_<F, C>
  readonly flap: FlapFn<F, C>
  readonly as_: AsFn_<F, C>
  readonly as: AsFn<F, C>
  readonly fcross_: FCrossFn_<F, C>
  readonly fcross: FCrossFn<F, C>
}

export type FunctorMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly map_: MapFn_<F, C>
}

export function Functor<F extends HKT.URIS, C = HKT.Auto>(F: FunctorMin<F, C>): Functor<F, C> {
  const flap_   = flapF_(F)
  const as_     = asF_(F)
  const fcross_ = fcrossF_(F)
  return HKT.instance<Functor<F, C>>({
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

export interface Functor2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly map_: MapFn2_<F, G, CF, CG>
  readonly map: MapFn2<F, G, CF, CG>
}

export function getFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Functor<F, CF>,
  G: Functor<G, CG>
): Functor2<F, G, CF, CG> {
  const map_: MapFn2_<F, G, CF, CG> = (fga, f) => F.map_(fga, (ga) => G.map_(ga, f))

  return HKT.instance<Functor2<F, G, CF, CG>>({
    map_,
    map: (f) => (fga) => map_(fga, f)
  })
}

export interface MapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => B): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface MapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface MapFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (a: A) => B): <
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

export interface MapFn2_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface FlapFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, (a: A) => B>,
    a: A
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, B>
}

export interface FlapFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A>(a: A): <N extends string, K, Q, W, X, I, S, R, E, B>(
    fab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, (a: A) => B>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, B>
}

export interface FlapFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A>(a: A): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, B>(
    fa: HKT.Kind<
      F,
      CF,
      NF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, (a: A) => B>
    >
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface FlapFn2_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: HKT.Kind<
      F,
      CF,
      NF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, (a: A) => B>
    >,
    a: A
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export function flapF_<F extends HKT.URIS, TC = HKT.Auto>(F: FunctorMin<F, TC>): FlapFn_<F, TC> {
  return (fab, a) => F.map_(fab, (f) => f(a))
}

export function flapF<F extends HKT.URIS, TC = HKT.Auto>(F: Functor<F, TC>): FlapFn<F, TC> {
  const flap_ = flapF_(F)
  return (a) => (fab) => flap_(fab, a)
}

export interface AsFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: () => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface AsFn<F extends HKT.URIS, C = HKT.Auto> {
  <B>(b: () => B): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface AsFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <B>(b: () => B): <
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
    EG,
    A
  >(
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface AsFn2_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: () => B
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export function asF_<F extends HKT.URIS, C = HKT.Auto>(F: FunctorMin<F, C>): AsFn_<F, C> {
  return (fa, b) => F.map_(fa, b)
}

export function asF<F extends HKT.URIS, C = HKT.Auto>(F: Functor<F, C>): AsFn<F, C> {
  return (b) => (fa) => F.map_(fa, b)
}

export interface FCrossFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, readonly [A, B]>
}

export interface FCrossFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => B): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, readonly [A, B]>
}

export interface FCrossFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (a: A) => B): <
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
  ) => HKT.Kind<
    F,
    CF,
    NF,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [A, B]>
  >
}

export interface FCrossFn2_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B
  ): HKT.Kind<
    F,
    CF,
    NF,
    KF,
    QF,
    WF,
    XF,
    IF,
    SF,
    RF,
    EF,
    HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, readonly [A, B]>
  >
}

export function fcrossF_<F extends HKT.URIS, C = HKT.Auto>(F: FunctorMin<F, C>): FCrossFn_<F, C> {
  return (fa, f) => F.map_(fa, (a) => [a, f(a)])
}

export function fcrossF<F extends HKT.URIS, C = HKT.Auto>(F: Functor<F, C>): FCrossFn<F, C> {
  return (f) => (fa) => F.map_(fa, (a) => [a, f(a)])
}

export interface ToSFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, BN extends string>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    name: BN
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in BN]: A }>
}

export function toSF_<F extends HKT.URIS, C = HKT.Auto>(F: Functor<F, C>): ToSFn_<F, C> {
  return (fa, name) => F.map_(fa, (a) => ({ [name]: a }))
}

export interface ToSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string>(name: BN): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in BN]: A }>
}

export function toSF<F extends HKT.URIS, C = HKT.Auto>(F: Functor<F, C>): ToSFn<F, C> {
  return (name) => F.map((a) => ({ [name]: a }))
}

export interface TupledFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    N,
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

export function tupledF<F extends HKT.URIS, C = HKT.Auto>(F: Functor<F, C>): TupledFn<F, C> {
  return F.map((a) => [a])
}
