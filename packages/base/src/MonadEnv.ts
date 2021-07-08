import type { Has, Tag } from './Has'
import type { MonadMin } from './Monad'

import { pureF } from './Applicative'
import { chainF_ } from './Bind'
import { flow, identity, pipe } from './function'
import * as HKT from './HKT'
import { Monad } from './Monad'

/**
 * Contravariant `Reader` + `Monad`
 */
export interface MonadEnv<F extends HKT.URIS, C extends HKT.V<'R', '-'>> extends Monad<F, C> {
  readonly asks: AsksFn<F, C>
  readonly ask: AskFn<F, C>
  readonly asksM: AsksMFn<F, C>
  readonly giveAll_: GiveAllFn_<F, C>
  readonly giveAll: GiveAllFn<F, C>
  readonly gives_: GivesFn_<F, C>
  readonly gives: GivesFn<F, C>
}

export type MonadEnvMin<F extends HKT.URIS, C extends HKT.V<'R', '-'>> = MonadMin<F, C> & {
  readonly asks: AsksFn<F, C>
  readonly giveAll_: GiveAllFn_<F, C>
}

export function MonadEnv<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(M: MonadEnvMin<F, C>): MonadEnv<F, C> {
  return HKT.instance<MonadEnv<F, C>>({
    ...Monad(M),
    giveAll_: M.giveAll_,
    giveAll: (r) => (fa) => M.giveAll_(fa, r),
    asks: M.asks,
    ask: askF(M),
    asksM: asksMF(M),
    gives_: givesF_(M),
    gives: givesF(M)
  })
}

export interface AskFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <
    R,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    E = HKT.Initial<C, 'E'>
  >(): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, R>
}

export function askF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnvMin<F, C>): AskFn<F, C> {
  return () => F.asks(pureF(F))
}

export interface AsksFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    f: (_: R) => A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}

export interface AsksMFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <R0, N extends string, K, Q, W, X, I, S, R, E, A>(
    f: (_: HKT.OrFix<'R', C, R0>) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, HKT.Mix<C, 'R', [R0, R]>, E, A>
}

export interface GiveAllFn<F extends HKT.URIS, TC extends HKT.V<'R', '-'>> {
  <R>(r: R): <N extends string, K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, unknown, E, A>
}

export interface GiveAllFn_<F extends HKT.URIS, TC extends HKT.V<'R', '-'>> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>, r: R): HKT.Kind<
    F,
    TC,
    N,
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

export interface GiveFn<F extends HKT.URIS, TC extends HKT.V<'R', '-'>> {
  <R>(r: R): <N extends string, K, Q, W, X, I, S, R0, E, A>(
    ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>
}

export interface GiveFn_<F extends HKT.URIS, TC extends HKT.V<'R', '-'>> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>,
    r: R
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>
}

export interface GivesFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <R0, R>(f: (r0: R0) => R): <N extends string, K, Q, W, X, I, S, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>
}

export interface GivesFn_<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (r0: R0) => R
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>
}

export interface AsksServiceFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <Service>(H: Tag<Service>): <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    f: (_: Service) => A
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R & Has<Service>, E, A>
}

export interface AsksServiceMFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <Service>(H: Tag<Service>): <N extends string, K, Q, W, X, I, S, R, E, A>(
    f: (_: Service) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R & Has<Service>, E, A>
}

export interface GiveServiceFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <Service>(H: Tag<Service>): (
    S: Service
  ) => <N extends string, K, Q, W, X, I, S, R, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R & Has<Service>, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}

export interface GiveServiceMFn<F extends HKT.URIS, C extends HKT.V<'R', '-'>> {
  <Service>(H: Tag<Service>): <N extends string, K, Q, W, X, I, S, R, E>(
    S: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Service>
  ) => <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A>(
    ma: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    R & R1,
    HKT.Mix<C, 'E', [E, E1]>,
    A
  >
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * gives :: (MonadEnv m) => (r0 -> r) -> m r a -> m r0 a
 * ```
 */
export function givesF_<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnvMin<F, C>): GivesFn_<F, C>
export function givesF_<F>(F: MonadEnvMin<HKT.UHKT3<F>, HKT.V<'R', '-'>>): GivesFn_<HKT.UHKT3<F>, HKT.V<'R', '-'>> {
  return <R0, R, E, A>(ma: HKT.HKT3<F, R, E, A>, f: (_: R0) => R): HKT.HKT3<F, R0, E, A> =>
    asksMF(F)((r0: R0) => F.giveAll_(ma, f(r0)))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * gives :: (MonadEnv m) => (r0 -> r) -> m r a -> m r0 a
 * ```
 */
export function givesF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnvMin<F, C>): GivesFn<F, C>
export function givesF<F>(F: MonadEnvMin<HKT.UHKT3<F>, HKT.V<'R', '-'>>): GivesFn<HKT.UHKT3<F>, HKT.V<'R', '-'>> {
  return <R0, R>(f: (_: R0) => R) =>
    <E, A>(ma: HKT.HKT3<F, R, E, A>): HKT.HKT3<F, R0, E, A> =>
      asksMF(F)((r0: R0) => F.giveAll_(ma, f(r0)))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * give :: (MonadEnv m) => r -> m |r & r0| a -> m r0 a
 * ```
 */
export function giveF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnv<F, C>): GiveFn<F, C>
export function giveF<F>(F: MonadEnv<HKT.UHKT3<F>, HKT.V<'R', '-'>>): GiveFn<HKT.UHKT3<F>, HKT.V<'R', '-'>> {
  return <R>(r: R) =>
    <R0, E, A>(ma: HKT.HKT3<F, R & R0, E, A>): HKT.HKT3<F, R0, E, A> =>
      asksMF(F)((r0: R0) => F.giveAll_(ma, { ...r, ...r0 }))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * asksM :: (MonadEnv m) => (r0 -> m r a) -> m |r0 & r| a
 * ```
 */
export function asksMF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnvMin<F, C>): AsksMFn<F, C> {
  const chain_ = chainF_(F)
  return flow(F.asks, (mma) => chain_(mma, identity))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * asksService :: (MonadEnv m) => (Tag s) => (s -> a) -> m s a
 * ```
 */
export function asksServiceF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnv<F, C>): AsksServiceFn<F, C> {
  return (H) => (f) => F.asks((_) => pipe(_, H.read, f))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * asksService :: (MonadEnv m) => (Tag s) => (s -> m r a) -> m |s & r| a
 * ```
 */
export function asksServiceMF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnv<F, C>): AsksServiceMFn<F, C> {
  return (H) => (f) => asksMF(F)(flow(H.read, f))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * giveService :: (MonadEnv m) => (Tag s) => s -> m |s & r| a -> m r a
 * ```
 */
export function giveServiceF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnv<F, C>): GiveServiceFn<F, C> {
  return (H) => (S) => (ma) => asksMF(F)((r) => F.giveAll_(ma, { ...r, [H.key]: S } as any))
}

/**
 * Derives from `MonadEnv`:
 * ```haskell
 * giveService :: (MonadEnv m) => (Tag s) => m r0 s -> m |s & r| a -> m |r & r0| a
 * ```
 */
export function giveServiceMF<F extends HKT.URIS, C extends HKT.V<'R', '-'>>(F: MonadEnv<F, C>): GiveServiceMFn<F, C>
export function giveServiceMF<F>(F: MonadEnv<HKT.UHKT3<F>, HKT.V<'R', '-'>>) {
  return <Service>(H: Tag<Service>) =>
    <R, E>(S: HKT.HKT3<F, R, E, Service>) =>
    <A>(ma: HKT.HKT3<F, R & Has<Service>, E, A>) =>
      asksMF(F)((r: R) => pipe(S, (mas) => F.chain_(mas, (svc) => F.giveAll_(ma, { ...r, [H.key]: svc } as any))))
}
