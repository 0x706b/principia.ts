import type { MonadMin } from './Monad'

import * as HKT from './HKT'
import { Monad } from './Monad'

export interface MonadState<F extends HKT.HKT, TC = HKT.None> extends Monad<F, TC> {
  readonly get: GetFn<F, TC>
  readonly put: PutFn<F, TC>
  readonly modify: ModifyFn<F, TC>
  readonly gets: GetsFn<F, TC>
}

export type MonadStateMin<F extends HKT.HKT, C = HKT.None> = MonadMin<F, C> & {
  readonly get: GetFn<F, C>
  readonly put: PutFn<F, C>
  readonly modify: ModifyFn<F, C>
  readonly gets: GetsFn<F, C>
}

export function MonadState<F extends HKT.HKT, C = HKT.None>(F: MonadStateMin<F, C>): MonadState<F, C> {
  return HKT.instance({
    ...Monad(F),
    get: F.get,
    put: F.put,
    modify: F.modify,
    gets: F.gets
  })
}

export interface GetFn<F extends HKT.HKT, TC = HKT.None> {
  <
    S,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, S>
}

export interface PutFn<F extends HKT.HKT, TC = HKT.None> {
  <
    S,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    s: S
  ): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, void>
}

export interface GetsFn<F extends HKT.HKT, TC = HKT.None> {
  <
    S,
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    f: (s: S) => A
  ): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
}

export interface ModifyFn<F extends HKT.HKT, TC = HKT.None> {
  <
    S,
    A,
    K = HKT.Low<F, 'K'>,
    Q = HKT.Low<F, 'Q'>,
    W = HKT.Low<F, 'W'>,
    X = HKT.Low<F, 'X'>,
    I = HKT.Low<F, 'I'>,
    R = HKT.Low<F, 'R'>,
    E = HKT.Low<F, 'E'>
  >(
    f: (s: S) => readonly [A, S]
  ): HKT.Kind<F, TC, K, Q, W, X, I, S, R, E, A>
}
