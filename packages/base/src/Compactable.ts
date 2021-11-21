import type * as HKT from './HKT'
import type { Either } from './internal/Either'
import type { Maybe } from './internal/Maybe'

export interface Compactable<F extends HKT.HKT, C = HKT.None> extends HKT.Typeclass<F, C> {
  readonly compact: CompactFn<F, C>
  readonly separate: SeparateFn<F, C>
}

export interface CompactFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<A>>): HKT.Kind<
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
    A
  >
}
export interface SeparateFn<F extends HKT.HKT, C = HKT.None> {
  <K, Q, W, X, I, S, R, E, A, B>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>): readonly [
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ]
}
