import type * as HKT from './HKT'
import type { Either } from './internal/Either'
import type { MonadMin } from './Monad'

import * as E from './internal/Either'
import { Monad } from './Monad'

export interface TailRec<F extends HKT.HKT, C = HKT.None> {
  readonly chainRec_: ChainRecFn_<F, C>
  readonly chainRec: ChainRecFn<F, C>
}

export interface ChainRecFn_<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(a: A, f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>): HKT.Kind<
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

export interface ChainRecFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>): (
    a: A
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
}

export function tailRec_<A, B>(a: A, f: (a: A) => Either<A, B>): B {
  let v = f(a)
  while (v._tag === 'Left') {
    v = f(v.left)
  }
  return v.right
}

export function tailRec<A, B>(f: (a: A) => Either<A, B>): (a: A) => B {
  return (a) => tailRec_(a, f)
}

/**
 * Returns a `chainRec` for any stack-safe Monad
 */
export function getChainRec_<F extends HKT.HKT, C = HKT.None>(F: MonadMin<F, C>): ChainRecFn_<F, C> {
  const M = Monad(F)
  const chainRec_: ChainRecFn_<F, C> = (a, f) =>
    M.chain_(
      f(a),
      E.match((a) => chainRec_(a, f), M.pure)
    )
  return chainRec_
}

/**
 * Returns a `chainRec` for any stack-safe Monad
 */
export function getChainRec<F extends HKT.HKT, C = HKT.None>(F: MonadMin<F, C>): ChainRecFn<F, C> {
  const chainRec_ = getChainRec_(F)
  return (f) => (a) => chainRec_(a, f)
}
