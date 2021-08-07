import type * as HKT from './HKT'
import type { Either } from './internal/Either'

export interface TailRec<F extends HKT.URIS, C = HKT.Auto> {
  readonly chainRec_: ChainRecFn_<F, C>
  readonly chainRec: ChainRecFn<F, C>
}

export interface ChainRecFn_<F extends HKT.URIS, C = HKT.Auto> {
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

export interface ChainRecFn<F extends HKT.URIS, C = HKT.Auto> {
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
