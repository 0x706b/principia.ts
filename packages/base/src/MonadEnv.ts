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
  readonly access: AccessFn<F, C>
  readonly environment: EnvironmentFn<F, C>
  readonly accessM: AccessMFn<F, C>
  readonly provide_: ProvideFn_<F, C>
  readonly provide: ProvideFn<F, C>
  readonly local_: LocalFn_<F, C>
  readonly local: LocalFn<F, C>
}

export type MonadEnvMin<F extends HKT.ContravariantR, C = HKT.None> = MonadMin<F, C> & {
  readonly access: AccessFn<F, C>
  readonly provide_: ProvideFn_<F, C>
}

export function MonadEnv<F extends HKT.ContravariantR, C = HKT.None>(M: MonadEnvMin<F, C>): MonadEnv<F, C> {
  return HKT.instance<MonadEnv<F, C>>({
    ...Monad(M),
    provide_: M.provide_,
    provide: (r) => (fa) => M.provide_(fa, r),
    access: M.access,
    environment: environmentF(M),
    accessM: accessMF(M),
    local_: localF_(M),
    local: localF(M)
  })
}

export interface EnvironmentFn<F extends HKT.ContravariantR, C = HKT.None> {
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

export function environmentF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): EnvironmentFn<F, C>
export function environmentF<F extends HKT.ContravariantR>(
  F: MonadEnvMin<HKT.FContraR<F>>
): EnvironmentFn<HKT.FContraR<F>> {
  return () => F.access(identity)
}

export interface AccessFn<F extends HKT.HKT, C = HKT.None> {
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

export interface AccessMFn<F extends HKT.ContravariantR, C = HKT.None> {
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

export interface ProvideFn<F extends HKT.ContravariantR, TC = HKT.None> {
  <R>(r: R): <K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, unknown, E, A>
}

export interface ProvideFn_<F extends HKT.ContravariantR, TC = HKT.None> {
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

export interface ProvideSomeFn<F extends HKT.ContravariantR, TC = HKT.None> {
  <R>(r: R): <K, Q, W, X, I, S, R0, E, A>(
    ma: HKT.Kind<F, TC, K, Q, W, X, I, S, R & R0, E, A>
  ) => HKT.Kind<F, TC, K, Q, W, X, I, S, R0, E, A>
}

export interface ProvideSomeFn_<F extends HKT.ContravariantR, TC = HKT.None> {
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

export interface LocalFn<F extends HKT.ContravariantR, C = HKT.None> {
  <R0, R>(f: (r0: R0) => R): <K, Q, W, X, I, S, E, A>(
    ma: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R0, E, A>
}

export interface LocalFn_<F extends HKT.ContravariantR, C = HKT.None> {
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

export interface AccessServiceFn<F extends HKT.ContravariantR, C = HKT.None> {
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

export interface AccessServiceMFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): <K, Q, W, X, I, S, R, E, A>(
    f: (_: Service) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
}

export interface ProvideServiceFn<F extends HKT.ContravariantR, C = HKT.None> {
  <Service>(H: Tag<Service>): (
    S: Service
  ) => <K, Q, W, X, I, S, R, E, A>(
    ma: HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
}

export interface ProvideServiceMFn<F extends HKT.ContravariantR, C = HKT.None> {
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

export function localF_<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): LocalFn_<F, C>
export function localF_<F>(F: MonadEnvMin<HKT.FContraR<F>>): LocalFn_<HKT.FContraR<F>, HKT.None> {
  return <K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.FK<F, K, Q, W, X, I, S, R, E, A>,
    f: (_: R0) => R
  ): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> => accessMF(F)((r0: R0) => F.provide_(ma, f(r0)))
}

export function localF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): LocalFn<F, C>
export function localF<F>(F: MonadEnvMin<HKT.FContraR<F>>): LocalFn<HKT.FContraR<F>> {
  return <R0, R>(f: (_: R0) => R) =>
    <K, Q, W, X, I, S, E, A>(ma: HKT.FK<F, K, Q, W, X, I, S, R, E, A>): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> =>
      accessMF(F)((r0: R0) => F.provide_(ma, f(r0)))
}

export function provideF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): ProvideSomeFn<F, C>
export function provideF<F>(F: MonadEnv<HKT.FContraR<F>>): ProvideSomeFn<HKT.FContraR<F>> {
  return <R>(r: R) =>
    <K, Q, W, X, I, S, R0, E, A>(
      ma: HKT.FK<F, K, Q, W, X, I, S, R & R0, E, A>
    ): HKT.FK<F, K, Q, W, X, I, S, R0, E, A> =>
      accessMF(F)((r0: R0) => F.provide_(ma, { ...r, ...r0 }))
}

export function accessMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnvMin<F, C>): AccessMFn<F, C>
export function accessMF<F>(F: MonadEnvMin<HKT.FContraR<F>>): AccessMFn<HKT.FContraR<F>> {
  const chain_ = chainF_(F)
  return (f) => chain_(F.access(f), identity)
}

export function accessServiceF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): AccessServiceFn<F, C> {
  return (H) => (f) => F.access((_) => pipe(_, H.read, f))
}

export function accessServiceMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): AccessServiceMFn<F, C>
export function accessServiceMF<F>(F: MonadEnv<HKT.FContraR<F>>): AccessServiceMFn<HKT.FContraR<F>> {
  return (H) => (f) => accessMF(F)(flow(H.read, f))
}

export function provideServiceF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): ProvideServiceFn<F, C>
export function provideServiceF<F>(F: MonadEnv<HKT.FContraR<F>>): ProvideServiceFn<HKT.FContraR<F>> {
  return <Service>(H: Tag<Service>) =>
    (S: Service) =>
    <K, Q, W, X, I, S, R, E, A>(ma: HKT.FK<F, K, Q, W, X, I, S, R & Has<Service>, E, A>) =>
      accessMF(F)((r: R) => F.provide_(ma, { ...r, [H.key]: S } as unknown as Has<Service> & R))
}

export function provideServiceMF<F extends HKT.ContravariantR, C = HKT.None>(F: MonadEnv<F, C>): ProvideServiceMFn<F, C>
export function provideServiceMF<F>(F: MonadEnv<HKT.FContraR<F>, HKT.None>) {
  return <Service>(H: Tag<Service>) =>
    <K, Q, W, X, I, S, R, E>(S: HKT.FK<F, K, Q, W, X, I, S, R, E, Service>) =>
    <A>(ma: HKT.FK<F, K, Q, W, X, I, S, R & Has<Service>, E, A>) =>
      accessMF(F)((r: R) =>
        pipe(S, (ms) => F.chain_(ms, (s) => F.provide_(ma, { ...r, [H.key]: s } as unknown as Has<Service> & R)))
      )
}
