import type { Has, Tag } from './Has'
import type { MonadMin } from './Monad'

import { chainF_ } from './Chain'
import { flow, identity, pipe } from './function'
import * as HKT from './HKT'
import { Monad } from './Monad'

/**
 * Contravariant `Reader` + `Monad`
 */
export interface MonadEnv<F extends HKT.ContravariantR, C = HKT.None> extends Monad<F, C> {
  readonly asks: AsksFn<F, C>
  readonly ask: AskFn<F, C>
  readonly asksM: AsksMFn<F, C>
  readonly give_: GiveFn_<F, C>
  readonly give: GiveFn<F, C>
  readonly gives_: GivesFn_<F, C>
  readonly gives: GivesFn<F, C>
}

export type MonadEnvMin<F extends HKT.ContravariantR, C = HKT.None> = MonadMin<F, C> & {
  readonly asks: AsksFn<F, C>
  readonly give_: GiveFn_<F, C>
}

export function MonadEnv<F extends HKT.ContravariantR, C = HKT.None>(M: MonadEnvMin<F, C>): MonadEnv<F, C> {
  return HKT.instance<MonadEnv<F, C>>({
    ...Monad(M),
    give_: M.give_,
    give: (r) => (fa) => M.give_(fa, r),
    asks: M.asks,
    ask: askF(M),
    asksM: asksMF(M),
    gives_: givesF_(M),
    gives: givesF(M)
  })
}

export interface AskFn<F extends HKT.ContravariantR, C = HKT.None> {
  <
    R,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    E = HKT.Low<F, 'E'>
  >(): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, R>
}

export function askF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): AskFn<F, C>
export function askF<F extends HKT.ContravariantR>(F: MonadEnvMin<HKT.FContraR<F>>): AskFn<HKT.FContraR<F>> {
  return () => F.asks(identity)
}

export interface AsksFn<F extends HKT.HKT, C = HKT.None> {
  <
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    f: (_: R) => A
  ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface AsksMFn<F extends HKT.ContravariantR, C = HKT.None> {
  <R0, K, Q, W, X, I, S, R, E, A>(f: (_: HKT.OrFix<C, 'R', R0>) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    HKT.Mix<F, 'R', [R, R0]>,
    E,
    A
  >
}

export interface GiveFn<F extends HKT.ContravariantR, TC = HKT.None> {
  <R>(r: R): <K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, unknown, E, A>
}

export interface GiveFn_<F extends HKT.ContravariantR, TC = HKT.None> {
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>, r: R): HKT.Kind<
    F,
    TC,
    K,
    Q,
    W,
    X,
    I,
    S,
    unknown,
    E,
    A
  >
}

export interface GiveSomeFn<F extends HKT.ContravariantR, TC = HKT.None> {
  <R>(r: R): <K, Q, W, X, I, S, R0, E, A>(
    ma: HKT.Kind<F, TC, K, Q, W, X, I, S, R & R0, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R0, E, A>
}

export interface GiveSomeFn_<F extends HKT.ContravariantR, TC = HKT.None> {
  <K, Q, W, X, I, S, R0, R, E, A>(ma: HKT.Kind<F, TC, K, Q, W, X, I, S, R & R0, E, A>, r: R): HKT.Kind<
    F,
    TC,
    K,
    Q,
    W,
    X,
    I,
    S,
    R0,
    E,
    A
  >
}

export interface GivesFn<F extends HKT.ContravariantR, C = HKT.None> {
  <R0, R>(f: (r0: R0) => R): <K, Q, W, X, I, S, E, A>(
    ma: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R0, E, A>
}

export interface GivesFn_<F extends HKT.ContravariantR, C = HKT.None> {
  <K, Q, W, X, I, S, R0, R, E, A>(ma: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, f: (r0: R0) => R): HKT.Kind<
    F,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R0,
    E,
    A
  >
}

export interface AsksServiceFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): <
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    S = HKT.Low<F, 'S'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    f: (_: Service) => A
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
}

export interface AsksServiceMFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): <K, Q, W, X, I, S, R, E, A>(
    f: (_: Service) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
}

export interface GiveServiceFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): (
    S: Service
  ) => <K, Q, W, X, I, S, R, E, A>(
    ma: HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface GiveServiceMFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): <K, Q, W, X, I, S, R, E>(
    S: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Service>
  ) => <K1, Q1, W1, X1, I1, S1, R1, E1, A>(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<F, 'K', K, K1>,
      HKT.Intro<F, 'Q', Q, Q1>,
      HKT.Intro<F, 'W', W, W1>,
      HKT.Intro<F, 'X', X, X1>,
      HKT.Intro<F, 'I', I, I1>,
      HKT.Intro<F, 'S', S, S1>,
      HKT.Intro<F, 'R', R, R1 & Has<Service>>,
      HKT.Intro<F, 'E', E, E1>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<F, 'K', [K, K1]>,
    HKT.Mix<F, 'Q', [Q, Q1]>,
    HKT.Mix<F, 'W', [W, W1]>,
    HKT.Mix<F, 'X', [X, X1]>,
    HKT.Mix<F, 'I', [I, I1]>,
    HKT.Mix<F, 'S', [S, S1]>,
    R & R1,
    HKT.Mix<F, 'E', [E, E1]>,
    A
  >
}

export function givesF_<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): GivesFn_<F, C>
export function givesF_<F>(F: MonadEnvMin<HKT.FContraR<F>>): GivesFn_<HKT.FContraR<F>, HKT.None> {
  return <K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
    f: (_: R0) => R
  ): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> => asksMF(F)((r0: R0) => F.give_(ma, f(r0)))
}

export function givesF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): GivesFn<F, C>
export function givesF<F>(F: MonadEnvMin<HKT.FContraR<F>>): GivesFn<HKT.FContraR<F>> {
  return <R0, R>(f: (_: R0) => R) =>
    <K, Q, W, X, I, S, E, A>(ma: HKT.FK<F, K, Q, W, X, I, S, R, E, A>): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> =>
      asksMF(F)((r0: R0) => F.give_(ma, f(r0)))
}

export function giveSomeF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): GiveSomeFn<F, C>
export function giveSomeF<F>(F: MonadEnv<HKT.FContraR<F>>): GiveSomeFn<HKT.FContraR<F>> {
  return <R>(r: R) =>
    <K, Q, W, X, I, S, R0, E, A>(
      ma: HKT.FK<F, K, Q, W, X, I, S, R & R0, E, A>
    ): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> =>
      asksMF(F)((r0: R0) => F.give_(ma, { ...r, ...r0 }))
}

export function asksMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): AsksMFn<F, C>
export function asksMF<F>(F: MonadEnvMin<HKT.FContraR<F>>): AsksMFn<HKT.FContraR<F>> {
  const chain_ = chainF_(F)
  return (f) => chain_(F.asks(f), identity)
}

export function asksServiceF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): AsksServiceFn<F, C> {
  return (H) => (f) => F.asks((_) => pipe(_, H.read, f))
}

export function asksServiceMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): AsksServiceMFn<F, C>
export function asksServiceMF<F>(F: MonadEnv<HKT.FContraR<F>>): AsksServiceMFn<HKT.FContraR<F>> {
  return (H) => (f) => asksMF(F)(flow(H.read, f))
}

export function giveServiceF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): GiveServiceFn<F, C>
export function giveServiceF<F>(F: MonadEnv<HKT.FContraR<F>>): GiveServiceFn<HKT.FContraR<F>> {
  return <Service>(H: Tag<Service>) =>
    (S: Service) =>
    <K, Q, W, X, I, S, R, E, A>(ma: HKT.FK<F, K, Q, W, X, I, S, R & Has<Service>, E, A>) =>
      asksMF(F)((r: R) => F.give_(ma, { ...r, [H.key]: S } as unknown as Has<Service> & R))
}

export function giveServiceMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): GiveServiceMFn<F, C>
export function giveServiceMF<F>(F: MonadEnv<HKT.FContraR<F>, HKT.None>) {
  return <Service>(H: Tag<Service>) =>
    <K, Q, W, X, I, S, R, E>(S: HKT.FK<F, K, Q, W, X, I, S, R, E, Service>) =>
    <A>(ma: HKT.FK<F, K, Q, W, X, I, S, R & Has<Service>, E, A>) =>
      asksMF(F)((r: R) =>
        pipe(S, (ms) => F.chain_(ms, (s) => F.give_(ma, { ...r, [H.key]: s } as unknown as Has<Service> & R)))
      )
}
