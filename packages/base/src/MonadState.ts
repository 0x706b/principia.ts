import type { MonadMin } from './Monad'

import * as HKT from './HKT'
import { Monad } from './Monad'

export interface MonadState<F extends HKT.URIS, TC = HKT.Auto> extends Monad<F, TC> {
  readonly get: GetFn<F, TC>
  readonly put: PutFn<F, TC>
  readonly modify: ModifyFn<F, TC>
  readonly gets: GetsFn<F, TC>
}

export type MonadStateMin<F extends HKT.URIS, C = HKT.Auto> = MonadMin<F, C> & {
  readonly get: GetFn<F, C>
  readonly put: PutFn<F, C>
  readonly modify: ModifyFn<F, C>
  readonly gets: GetsFn<F, C>
}

export function MonadState<F extends HKT.URIS, C = HKT.Auto>(F: MonadStateMin<F, C>): MonadState<F, C> {
  return HKT.instance({
    ...Monad(F),
    get: F.get,
    put: F.put,
    modify: F.modify,
    gets: F.gets
  })
}

export interface GetFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, S>
}

export interface PutFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    s: S
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, void>
}

export interface GetsFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    A,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (s: S) => A
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
}

export interface ModifyFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    A,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (s: S) => readonly [A, S]
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
}
