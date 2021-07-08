import type { FiberId } from '../../Fiber'
import type { Journal } from '../Journal'

import * as E from '../../Either'
import { isObject } from '../../util/predicates'

export const STMTag = {
  Effect: 'Effect',
  OnFailure: 'OnFailure',
  OnRetry: 'OnRetry',
  OnSuccess: 'OnSuccess',
  Succeed: 'Succeed',
  SucceedNow: 'SucceedNow',
  Gives: 'Gives'
} as const

export const STMTypeId = Symbol('@principia/base/stm/STM')
export type STMTypeId = typeof STMTypeId

export abstract class STM<R, E, A> {
  readonly [STMTypeId]: STMTypeId = STMTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
}

export class Effect<R, E, A> extends STM<R, E, A> {
  readonly _tag = STMTag.Effect
  constructor(readonly f: (journal: Journal, fiberId: FiberId, r: R) => A) {
    super()
  }
}

export class OnFailure<R, E, A, E1> extends STM<R, E1, A> {
  readonly _tag = STMTag.OnFailure
  constructor(readonly stm: STM<R, E, A>, readonly onFailure: (e: E) => STM<R, E1, A>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new SucceedNow(a)
  }
}

export class OnRetry<R, E, A> extends STM<R, E, A> {
  readonly _tag = STMTag.OnRetry
  constructor(readonly stm: STM<R, E, A>, readonly onRetry: STM<R, E, A>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new SucceedNow(a)
  }
}

export class OnSuccess<R, E, A, B> extends STM<R, E, B> {
  readonly _tag = STMTag.OnSuccess
  constructor(readonly stm: STM<R, E, A>, readonly apply: (a: A) => STM<R, E, B>) {
    super()
  }
}

export class Succeed<A> extends STM<unknown, never, A> {
  readonly _tag = STMTag.Succeed
  constructor(readonly a: () => A) {
    super()
  }
}

export class SucceedNow<A> extends STM<unknown, never, A> {
  readonly _tag = STMTag.SucceedNow
  constructor(readonly a: A) {
    super()
  }
}

export class Gives<R, E, A, R0> extends STM<R0, E, A> {
  readonly _tag = STMTag.Gives
  constructor(readonly stm: STM<R, E, A>, readonly f: (_: R0) => R) {
    super()
  }
}

export function concrete<R, E, A>(
  _: STM<R, E, A>
): asserts _ is
  | Effect<R, E, A>
  | OnFailure<R, unknown, A, E>
  | OnSuccess<R, E, unknown, A>
  | OnRetry<R, E, A>
  | Succeed<A>
  | SucceedNow<A>
  | Gives<unknown, E, A, R> {
  //
}

export const FailExceptionTypeId = Symbol()
export type FailExceptionTypeId = typeof FailExceptionTypeId

export class FailException<E> {
  readonly [FailExceptionTypeId]: FailExceptionTypeId = FailExceptionTypeId
  constructor(readonly e: E) {}
}

export function isFailException(u: unknown): u is FailException<unknown> {
  return isObject(u) && FailExceptionTypeId in u
}

export const DieExceptionTypeId = Symbol()
export type DieExceptionTypeId = typeof DieExceptionTypeId

export class DieException<E> {
  readonly [DieExceptionTypeId]: DieExceptionTypeId = DieExceptionTypeId
  constructor(readonly e: E) {}
}

export function isDieException(u: unknown): u is DieException<unknown> {
  return isObject(u) && DieExceptionTypeId in u
}

export const RetryExceptionTypeId = Symbol()
export type RetryExceptionTypeId = typeof RetryExceptionTypeId

export class RetryException {
  readonly [RetryExceptionTypeId]: RetryExceptionTypeId = RetryExceptionTypeId
}

export function isRetryException(u: unknown): u is RetryException {
  return isObject(u) && RetryExceptionTypeId in u
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeed<A>(a: A): STM<unknown, never, A> {
  return new SucceedNow(a)
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeedLazy<A>(a: () => A): STM<unknown, never, A> {
  return new Succeed(a)
}

export function failLazy<E>(e: () => E): STM<unknown, E, never> {
  return new Effect(() => {
    throw new FailException(e())
  })
}

/**
 * Returns a value that models failure in the transaction.
 */
export function fail<E>(e: E): STM<unknown, E, never> {
  return failLazy(() => e)
}

/**
 * Maps the value produced by the effect.
 */
export function map_<R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B> {
  return chain_(self, (a) => succeed(f(a)))
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 */
export function chain_<R, E, A, R1, E1, B>(self: STM<R, E, A>, f: (a: A) => STM<R1, E1, B>): STM<R1 & R, E | E1, B> {
  return new OnSuccess<R1 & R, E | E1, A, B>(self, f)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(self: STM<R, E, A>, f: (e: E) => STM<R1, E1, B>): STM<R1 & R, E1, A | B> {
  return new OnFailure<R1 & R, E, A | B, E1>(self, f)
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 */
export function matchSTM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: STM<R, E, A>,
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R2 & R, E1 | E2, B | C> {
  return chain_<R2 & R, E2, E.Either<C, A>, R1, E1, B | C>(
    catchAll_(map_(self, E.right), (e) => map_(g(e), E.left)),
    E.match(succeed, f)
  )
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 */
export function ensuring_<R, E, A, R1, B>(self: STM<R, E, A>, finalizer: STM<R1, never, B>): STM<R & R1, E, A> {
  return matchSTM_(
    self,
    (e) => chain_(finalizer, () => fail(e)),
    (a) => chain_(finalizer, () => succeed(a))
  )
}
