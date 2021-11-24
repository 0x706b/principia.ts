/**
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/fx/ZPure.scala
 */
import type { Eq } from './Eq'
import type * as HKT from './HKT'
import type { Predicate } from './Predicate'
import type { _E, _R } from './prelude'
import type { Stack } from './util/support/Stack'

import * as A from './Array/core'
import * as Ca from './Cause'
import * as C from './Chunk/core'
import * as E from './Either'
import * as Ex from './Exit'
import { flow, identity, pipe } from './function'
import * as I from './Iterable/core'
import * as L from './List/core'
import * as M from './Maybe'
import * as P from './prelude'
import { tuple } from './tuple'
import { isObject } from './util/predicates'
import { makeStack } from './util/support/Stack'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export const ZTypeId = Symbol.for('@principia/base/Z')
export type ZTypeId = typeof ZTypeId

export type Cause<E> = Ca.PCause<never, E>
export type Exit<E, A> = Ex.PExit<never, E, A>

/**
 * `Z<W, S1, S2, R, E, A>` is a purely functional description of a synchronous computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `Z` can be used to model a variety of effects
 * including context, state, failure, and logging.
 *
 * @note named `Z` in honor of `ZIO` and because it is, surely, the last computational monad
 * one will ever need :)
 *
 * @since 1.0.0
 */
export abstract class Z<W, S1, S2, R, E, A> {
  abstract readonly [ZTypeId]: ZTypeId
  readonly _W!: () => W
  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
}

export function isZ(u: unknown): u is Z<unknown, unknown, unknown, unknown, unknown, unknown> {
  return isObject(u) && ZTypeId in u
}

/**
 * @optimize remove
 */
function concrete(z: Z<any, any, any, any, any, any>): asserts z is Concrete {
  //
}

const ZTag = {
  Succeed: 'Succeed',
  EffectTotal: 'EffectTotal',
  EffectPartial: 'EffectPartial',
  DeferTotal: 'DeferTotal',
  DeferPartial: 'DeferPartial',
  Fail: 'Fail',
  Modify: 'Modify',
  Chain: 'Chain',
  Match: 'Match',
  Asks: 'Asks',
  Give: 'Give',
  Tell: 'Tell',
  Listen: 'Listen',
  Censor: 'Censor'
} as const

class Succeed<A> extends Z<never, unknown, never, unknown, never, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Succeed
  constructor(readonly value: A) {
    super()
  }
}

class EffectTotal<A> extends Z<never, unknown, never, unknown, never, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

class EffectPartial<E, A> extends Z<never, unknown, never, unknown, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

class DeferTotal<W, S1, S2, R, E, A> extends Z<W, S1, S2, R, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.DeferTotal
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class DeferPartial<W, S1, S2, R, E, A, E1> extends Z<W, S1, S2, R, E | E1, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.DeferPartial
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>, readonly onThrow: (u: unknown) => E1) {
    super()
  }
}

class Fail<E> extends Z<never, unknown, never, unknown, E, never> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Fail
  constructor(readonly cause: Cause<E>) {
    super()
  }
}

class Modify<S1, S2, A> extends Z<never, S1, S2, unknown, never, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Modify
  constructor(readonly run: (s1: S1) => readonly [A, S2]) {
    super()
  }
}

class Chain<W, S1, S2, R, E, A, W1, S3, Q, D, B> extends Z<W | W1, S1, S3, Q & R, D | E, B> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Chain
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly cont: (a: A) => Z<W1, S2, S3, Q, D, B>) {
    super()
  }
}

class Match<W, S1, S2, S5, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C> extends Z<
  W1 | W2,
  S1 & S5,
  S3 | S4,
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Match
  constructor(
    readonly z: Z<W, S1, S2, R, E, A>,
    readonly onFailure: (ws: C.Chunk<W>, e: Cause<E>) => Z<W1, S5, S3, R1, E1, B>,
    readonly onSuccess: (ws: C.Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
  ) {
    super()
  }
}

class Asks<W, R0, S1, S2, R, E, A> extends Z<W, S1, S2, R0 & R, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Asks
  constructor(readonly asks: (r: R0) => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class Give<W, S1, S2, R, E, A> extends Z<W, S1, S2, unknown, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Give
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly env: R) {
    super()
  }
}

class Tell<W> extends Z<W, unknown, never, unknown, never, void> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Tell
  constructor(readonly log: C.Chunk<W>) {
    super()
  }
}

class Censor<W, S1, S2, R, E, A, W1> extends Z<W1, S1, S2, R, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId
  readonly _tag = ZTag.Censor
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly modifyLog: (ws: C.Chunk<W>) => C.Chunk<W1>) {
    super()
  }
}

type Concrete =
  | Succeed<any>
  | Fail<any>
  | Modify<any, any, any>
  | Chain<any, any, any, any, any, any, any, any, any, any, any>
  | Match<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
  | Asks<any, any, any, any, any, any, any>
  | Give<any, any, any, any, any, any>
  | DeferTotal<any, any, any, any, any, any>
  | EffectTotal<any>
  | EffectPartial<any, any>
  | DeferPartial<any, any, any, any, any, any, any>
  | Tell<any>
  | Censor<any, any, any, any, any, any, any>

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function deferTry<W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, unknown, A> {
  return new DeferPartial(ma, identity)
}

export function deferTryCatch<W, S1, S2, R, E, A, E1>(
  ma: () => Z<W, S1, S2, R, E, A>,
  f: (e: unknown) => E1
): Z<W, S1, S2, R, E | E1, A> {
  return new DeferPartial(ma, f)
}

export function defer<W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, E, A> {
  return new DeferTotal(ma)
}

function _try<A>(effect: () => A): Z<never, unknown, never, unknown, unknown, A> {
  return new EffectPartial(effect, identity)
}

export { _try as try }

export function succeedLazy<A, W = never, S1 = unknown, S2 = never>(effect: () => A): Z<W, S1, S2, unknown, never, A> {
  return new EffectTotal(effect)
}

export function tryCatch<A, E>(
  effect: () => A,
  onThrow: (reason: unknown) => E
): Z<never, unknown, never, unknown, E, A> {
  return new EffectPartial(effect, onThrow)
}

export function fail<E>(e: E): Z<never, unknown, never, unknown, E, never> {
  return failCause(Ca.fail(e))
}

export function failLazy<E>(e: () => E): Z<never, unknown, never, unknown, E, never> {
  return failCauseLazy(() => Ca.fail(e()))
}

export function fromEither<E, A>(either: E.Either<E, A>): Z<never, unknown, never, unknown, E, A> {
  return E.match_(either, fail, succeed)
}

export function fromEitherLazy<E, A>(either: () => E.Either<E, A>): Z<never, unknown, never, unknown, E, A> {
  return defer(() => fromEither(either()))
}

export function fromMaybe<A>(maybe: M.Maybe<A>): Z<never, unknown, never, unknown, M.Maybe<never>, A> {
  return M.match_(maybe, () => fail(M.nothing()), succeed)
}

export function fromMaybeLazy<A>(maybe: () => M.Maybe<A>): Z<never, unknown, never, unknown, M.Maybe<never>, A> {
  return defer(() => fromMaybe(maybe()))
}

export function failCause<E>(cause: Cause<E>): Z<never, unknown, never, unknown, E, never> {
  return new Fail(cause)
}

export function failCauseLazy<E>(cause: () => Cause<E>): Z<never, unknown, never, unknown, E, never> {
  return defer(() => failCause(cause()))
}

export function succeed<A, W = never, S1 = unknown, S2 = never>(a: A): Z<W, S1, S2, unknown, never, A> {
  return new Succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * State
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Constructs a computation from the specified modify function
 */
export function modify<S1, S2, A>(f: (s: S1) => readonly [A, S2]): Z<never, S1, S2, unknown, never, A> {
  return new Modify(f)
}

/**
 * Constructs a computation that may fail from the specified modify function.
 */
export function modifyEither<S1, S2, E, A>(
  f: (s: S1) => E.Either<E, readonly [A, S2]>
): Z<never, S1, S2, unknown, E, A> {
  return pipe(
    get<S1>(),
    map(f),
    chain(
      E.match(fail, ([a, s2]) =>
        pipe(
          succeed(a),
          mapState(() => s2)
        )
      )
    )
  )
}

/**
 * Like `map`, but also allows the state to be modified.
 */
export function transform_<W, S1, S2, R, E, A, S3, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (s: S2, a: A) => readonly [B, S3]
): Z<W, S1, S3, R, E, B> {
  return chain_(ma, (a) => modify((s) => f(s, a)))
}

/**
 * Like `map`, but also allows the state to be modified.
 *
 * @dataFirst transform_
 */
export function transform<S2, A, S3, B>(
  f: (s: S2, a: A) => readonly [B, S3]
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R, E, B> {
  return (ma) => transform_(ma, f)
}

/**
 * Constructs a computation that returns the initial state unchanged.
 */
export function get<S>(): Z<never, S, S, unknown, never, S> {
  return modify((s) => [s, s])
}

export function gets<S, A>(f: (s: S) => A): Z<never, S, S, unknown, never, A> {
  return modify((s) => [f(s), s])
}

export function getsZ<S, W, R, E, A>(f: (s: S) => Z<W, S, S, R, E, A>): Z<W, S, S, R, E, A> {
  return pipe(get<S>(), chain(f))
}

/**
 * Constructs a computation that sets the state to the specified value.
 */
export function put<S>(s: S): Z<never, unknown, S, unknown, never, void> {
  return modify(() => [undefined, s])
}

/**
 * Constructs a computation from the specified update function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function update<S1, S2>(f: (s: S1) => S2): Z<never, S1, S2, unknown, never, void> {
  return modify((s) => [undefined, f(s)])
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapState_<S0, W, S1, S2, R, E, A>(
  fa: Z<W, S1, S2, R, E, A>,
  f: (s: S0) => S1
): Z<W, S0, S2, R, E, A> {
  return chain_(update(f), () => fa)
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst contramapState_
 */
export function contramapState<S0, S1>(
  f: (s: S0) => S1
): <W, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S0, S2, R, E, A> {
  return (fa) => contramapState_(fa, f)
}

/**
 * Modifies the current state with the specified function
 */
export function mapState_<W, S1, S2, R, E, A, S3>(ma: Z<W, S1, S2, R, E, A>, f: (s: S2) => S3): Z<W, S1, S3, R, E, A> {
  return transform_(ma, (s, a) => [a, f(s)])
}

/**
 * Modifies the current state with the specified function
 *
 * @dataFirst mapState_
 */
export function mapState<S2, S3>(
  f: (s: S2) => S3
): <W, S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R, E, A> {
  return (ma) => mapState_(ma, f)
}

/**
 * Provides this computation with its initial state.
 */
export function giveState_<W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>, s: S1): Z<W, unknown, S2, R, E, A> {
  return zipSecond_(put(s), ma)
}

/**
 * Provides this computation with its initial state.
 *
 * @dataFirst giveState_
 */
export function giveState<S1>(s: S1): <W, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, unknown, S2, R, E, A> {
  return (ma) => giveState_(ma, s)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Match
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success. More powerful
 * than `matchCauseM` by providing the current state of the log as an argument in
 * each case
 *
 * @note the log is cleared after being provided
 */
export function matchLogCauseZ_<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (ws: C.Chunk<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (ws: C.Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new Match(fa, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success. More powerful
 * than `matchCauseM` by providing the current state of the log as an argument in
 * each case
 *
 * @note the log is cleared after being provided
 *
 * @dataFirst matchLogCauseZ_
 */
export function matchLogCauseZ<W, S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (ws: C.Chunk<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (ws: C.Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): <R>(fa: Z<W, S1, S2, R, E, A>) => Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchLogCauseZ_(fa, onFailure, onSuccess)
}

export function matchCauseZ_<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchLogCauseZ_(
    fa,
    (ws, e) =>
      pipe(
        onFailure(e),
        censor((w1s) => C.concatW_(ws, w1s))
      ),
    (ws, a) =>
      pipe(
        onSuccess(a),
        censor((w2s) => C.concatW_(ws, w2s))
      )
  )
}

/**
 * @dataFirst matchCauseZ_
 */
export function matchCauseZ<S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchCauseZ_(fa, onFailure, onSuccess)
}

export function matchLogZ_<W, S1, S5, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (ws: C.Chunk<W>, e: E) => Z<W1, S5, S3, R1, E1, B>,
  onSuccess: (ws: C.Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchLogCauseZ_(
    fa,
    (ws, cause) =>
      pipe(
        Ca.failureOrCause(cause),
        E.match((e) => onFailure(ws, e), failCause)
      ),
    onSuccess
  )
}

/**
 * @dataFirst matchLogZ_
 */
export function matchLogZ<W, S1, S2, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (ws: C.Chunk<W>, e: E) => Z<W1, S1, S3, R1, E1, B>,
  onSuccess: (ws: C.Chunk<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): <R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchLogZ_(fa, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchZ_<W, S1, S5, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W1, S5, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchCauseZ_(fa, flow(Ca.failureOrCause, E.match(onFailure, failCause)), onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst matchZ_
 */
export function matchZ<S1, S2, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: E) => Z<W1, S1, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchZ_(fa, onFailure, onSuccess)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function match_<W, S1, S2, R, E, A, B, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): Z<W, S1, S2, R, never, B | C> {
  return matchZ_(
    fa,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  )
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst match_
 */
export function match<E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): <W, S1, S2, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, never, B | C> {
  return (fa) => match_(fa, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<W, S1, S2, R, E, A, W1, S3, R1, E1, A1>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: () => Z<W1, S1, S3, R1, E1, A1>
): Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return matchZ_(fa, () => fb(), succeed)
}

/**
 * @dataFirst alt_
 */
export function alt<W1, S1, S3, R1, E1, A1>(
  fb: () => Z<W1, S1, S3, R1, E1, A1>
): <W, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return (fa) => alt_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A, S1 = unknown, S2 = never>(a: A): Z<never, S1, S2, unknown, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function cross_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
export function cross<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

/**
 * @dataFirst crossPar_
 */
export function crossPar<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWith_<W, S, R, E, A, R1, E1, B, C>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): Z<W, S, S, R & R1, E | E1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<W, S, A, R1, E1, B, C>(
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R1 & R, E1 | E, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function crossWithPar_<W, S, R, E, A, R1, E1, B, C>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): Z<W, S, S, R & R1, E | E1, C> {
  return pipe(
    fa,
    matchCauseZ(
      (c1) =>
        pipe(
          fb,
          matchCauseZ(
            (c2) => failCause(Ca.both(c1, c2)),
            (_) => failCause(c1)
          )
        ),
      (a) => map_(fb, (b) => f(a, b))
    )
  )
}

/**
 * @dataFirst crossWithPar_
 */
export function crossWithPar<W, S, A, R1, E1, B, C>(
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(ma: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, C> {
  return (ma) => crossWithPar_(ma, fb, f)
}

export function ap_<W, S, R, E, A, R1, E1, B>(
  fab: Z<W, S, S, R, E, (a: A) => B>,
  fa: Z<W, S, S, R1, E1, A>
): Z<W, S, S, R1 & R, E1 | E, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst ap_
 */
export function ap<W, S, R1, E1, A>(
  fa: Z<W, S, S, R1, E1, A>
): <R, E, B>(fab: Z<W, S, S, R, E, (a: A) => B>) => Z<W, S, S, R1 & R, E1 | E, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst crossFirst_
 */
export function crossFirst<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst crossSecond_
 */
export function crossSecond<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, B> {
  return (fa) => crossSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Category
 * -------------------------------------------------------------------------------------------------
 */

export function andThen_<W, S1, S2, A, E, B, W1, S3, E1, C>(
  ab: Z<W, S1, S2, A, E, B>,
  bc: Z<W1, S2, S3, B, E1, C>
): Z<W | W1, S1, S3, A, E | E1, C> {
  return chain_(ab, (b) => giveAll_(bc, b))
}

/**
 * @dataFirst andThen_
 */
export function andThen<S2, B, W1, S3, E1, C>(
  bc: Z<W1, S2, S3, B, E1, C>
): <W, S1, A, E>(ab: Z<W, S1, S2, A, E, B>) => Z<W | W1, S1, S3, A, E | E1, C> {
  return (ab) => andThen_(ab, bc)
}

export function compose_<W, S1, S2, A, E, B, W1, S3, E1, C>(
  bc: Z<W, S2, S3, B, E, C>,
  ab: Z<W1, S1, S2, A, E1, B>
): Z<W | W1, S1, S3, A, E | E1, C> {
  return andThen_(ab, bc)
}

/**
 * @dataFirst compose_
 */
export function compose<S1, S2, B, W1, A, E1>(
  ab: Z<W1, S1, S2, A, E1, B>
): <W, S3, E, C>(bc: Z<W, S2, S3, B, E, C>) => Z<W | W1, S1, S3, A, E | E1, C> {
  return (bc) => andThen_(ab, bc)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Zip
 * -------------------------------------------------------------------------------------------------
 */

export function zip_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

/**
 * @dataFirst zip_
 */
export function zip<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWith_<W, S1, S2, R, E, A, W1, S3, Q, D, B, C>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): Z<W | W1, S1, S3, Q & R, D | E, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst zipWith_
 */
export function zipWith<W1, A, S2, S3, R1, E1, B, C>(
  fb: Z<W1, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
): <W, S1, R, E>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zap_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  fab: Z<W, S1, S2, R, E, (a: A) => B>,
  fa: Z<W1, S2, S3, R1, E1, A>
): Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return zipWith_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst zap_
 */
export function zap<W1, S2, S3, R1, E1, A>(
  fa: Z<W1, S2, S3, R1, E1, A>
): <W, S1, R, E, B>(fab: Z<W, S1, S2, R, E, (a: A) => B>) => Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return (fab) => zap_(fab, fa)
}

export function zipFirst_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst zipFirst_
 */
export function zipFirst<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, A> {
  return (fa) => zipFirst_(fa, fb)
}

export function zipSecond_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFirst zipSecond_
 */
export function zipSecond<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, B> {
  return (fa) => zipSecond_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<W, S1, S2, R, E, A, G, B>(
  pab: Z<W, S1, S2, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): Z<W, S1, S2, R, G, B> {
  return matchZ_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

/**
 * @dataFirst bimap_
 */
export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <W, S1, S2, R>(pab: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<W, S1, S2, R, E, A, G>(pab: Z<W, S1, S2, R, E, A>, f: (e: E) => G): Z<W, S1, S2, R, G, A> {
  return matchZ_(pab, (e) => fail(f(e)), succeed)
}

/**
 * @dataFirst mapError_
 */
export function mapError<E, G>(f: (e: E) => G): <W, S1, S2, R, A>(pab: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, G, A> {
  return (pab) => mapError_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fallible
 * -------------------------------------------------------------------------------------------------
 */

export function subsumeEither<W, S1, S2, R, E, E1, A>(
  fa: Z<W, S1, S2, R, E, E.Either<E1, A>>
): Z<W, S1, S2, R, E | E1, A> {
  return chain_(fa, E.match(fail, succeed))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<W, S1, S2, R, E, A, B>(fa: Z<W, S1, S2, R, E, A>, f: (a: A) => B): Z<W, S1, S2, R, E, B> {
  return chain_(fa, (a) => succeed(f(a)))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <W, S1, S2, R, E>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return new Chain(ma, f)
}

/**
 * @dataFirst chain_
 */
export function chain<A, W1, S2, S3, R1, E1, B>(
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return (ma) => chain_(ma, f)
}

export function tap_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * @dataFirst tap_
 */
export function tap<S2, A, W1, S3, R1, E1, B>(
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<W, S1, S2, R, E, A, W1, S3, R1, E1>(
  mma: Z<W, S1, S2, R, E, Z<W1, S2, S3, R1, E1, A>>
): Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function ask<R>(): Z<never, unknown, never, R, never, R> {
  return new Asks((r: R) => succeed(r))
}

export function asksZ<R0, W, S1, S2, R, E, A>(f: (r: R0) => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R & R0, E, A> {
  return new Asks(f)
}

export function asks<R0, A>(f: (r: R0) => A): Z<never, unknown, never, R0, never, A> {
  return asksZ((r: R0) => succeed(f(r)))
}

export function giveAll_<W, S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>, r: R): Z<W, S1, S2, unknown, E, A> {
  return new Give(fa, r)
}

/**
 * @dataFirst giveAll_
 */
export function giveAll<R>(r: R): <W, S1, S2, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r)
}

export function gives_<R0, W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>, f: (r0: R0) => R): Z<W, S1, S2, R0, E, A> {
  return asksZ((r: R0) => giveAll_(ma, f(r)))
}

/**
 * @dataFirst gives_
 */
export function gives<R0, R>(f: (r0: R0) => R): <W, S1, S2, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f)
}

export function give_<W, S1, S2, R, E, A, R0>(ma: Z<W, S1, S2, R & R0, E, A>, r: R): Z<W, S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }))
}

/**
 * @dataFirst give_
 */
export function give<R>(r: R): <W, S1, S2, R0, E, A>(ma: Z<W, S1, S2, R & R0, E, A>) => Z<W, S1, S2, R0, E, A> {
  return (ma) => give_(ma, r)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Z<never, unknown, never, unknown, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Writer
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Erases the current log
 */
export function erase<W, S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>): Z<never, S1, S2, R, E, A> {
  return censor_(wa, () => C.empty())
}

/**
 * Modifies the current log with the specified function
 */
export function censor_<W, S1, S2, R, E, A, W1>(
  wa: Z<W, S1, S2, R, E, A>,
  f: (ws: C.Chunk<W>) => C.Chunk<W1>
): Z<W1, S1, S2, R, E, A> {
  return new Censor(wa, f)
}

/**
 * Modifies the current log with the specified function
 *
 * @dataFirst censor_
 */
export function censor<W, W1>(
  f: (ws: C.Chunk<W>) => C.Chunk<W1>
): <S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>) => Z<W1, S1, S2, R, E, A> {
  return (wa) => censor_(wa, f)
}

/**
 * Constructs a computation
 */
export function tellAll<W>(ws: C.Chunk<W>): Z<W, unknown, never, unknown, never, void> {
  return new Tell(ws)
}

export function tell<W>(w: W): Z<W, unknown, never, unknown, never, void> {
  return tellAll(C.single(w))
}

export function writeAll_<W, S1, S2, R, E, A, W1>(
  ma: Z<W, S1, S2, R, E, A>,
  ws: C.Chunk<W1>
): Z<W | W1, S1, S2, R, E, A> {
  return censor_(ma, C.concatW(ws))
}

/**
 * @dataFirst writeAll_
 */
export function writeAll<W1>(
  ws: C.Chunk<W1>
): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => writeAll_(ma, ws)
}

export function write_<W, S1, S2, R, E, A, W1>(ma: Z<W, S1, S2, R, E, A>, w: W1): Z<W | W1, S1, S2, R, E, A> {
  return writeAll_(ma, C.single(w))
}

/**
 * @dataFirst write_
 */
export function write<W1>(w: W1): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => write_(ma, w)
}

export function listen<W, S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, E, readonly [A, C.Chunk<W>]> {
  return matchLogCauseZ_(
    wa,
    (_, e) => failCause(e),
    (ws, a) => succeed([a, ws])
  )
}

export function listens_<W, S1, S2, R, E, A, B>(
  wa: Z<W, S1, S2, R, E, A>,
  f: (l: C.Chunk<W>) => B
): Z<W, S1, S2, R, E, readonly [A, B]> {
  return pipe(
    wa,
    listen,
    map(([a, ws]) => [a, f(ws)])
  )
}

/**
 * @dataFirst listens_
 */
export function listens<W, B>(
  f: (l: C.Chunk<W>) => B
): <S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, readonly [A, B]> {
  return (wa) => listens_(wa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
): Z<W, S1, S3, R & R1, E1, A | B> {
  return matchZ_(fa, onFailure, (a) => succeed(a))
}

/**
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst catchAll_
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure)
}

export function catchJust_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Z<W, S1, S2, R, E, A>,
  f: (e: E) => M.Maybe<Z<W, S1, S3, R1, E1, B>>
): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      M.getOrElse((): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> => fa)
    )
  )
}

/**
 * @dataFirst catchJust_
 */
export function catchJust<W, S1, E, S3, R1, E1, B>(
  f: (e: E) => M.Maybe<Z<W, S1, S3, R1, E1, B>>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2 | S3, R & R1, E | E1, B | A> {
  return (fa) => catchJust_(fa, f)
}

/**
 * Repeats this computation the specified number of times (or until the first failure)
 * passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatN_<W, S1, S2 extends S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>, n: number): Z<W, S1, S2, R, E, A> {
  return chain_(ma, (a) => (n <= 0 ? succeed(a) : repeatN_(ma, n - 1)))
}

/**
 * Repeats this computation the specified number of times (or until the first failure)
 * passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst repeatN_
 */
export function repeatN(
  n: number
): <W, S1, S2 extends S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
  return (ma) => repeatN_(ma, n)
}

/**
 * Repeats this computation until its value satisfies the specified predicate
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntil_<W, S1, S2 extends S1, R, E, A>(
  ma: Z<W, S1, S2, R, E, A>,
  predicate: Predicate<A>
): Z<W, S1, S2, R, E, A> {
  return chain_(ma, (a) => (predicate(a) ? succeed(a) : repeatUntil_(ma, predicate)))
}

/**
 * Repeats this computation until its value satisfies the specified predicate
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst repeatUntil_
 */
export function repeatUntil<A>(
  predicate: Predicate<A>
): <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
  return (ma) => repeatUntil_(ma, predicate)
}

/**
 * Repeats this computation until its value is equal to the specified value
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntilEquals_<A>(
  E: Eq<A>
): <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>, value: () => A) => Z<W, S1, S2, R, E, A> {
  return (ma, value) => repeatUntil_(ma, (a) => E.equals_(a, value()))
}

/**
 * Repeats this computation until its value is equal to the specified value
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst repeatUntilEquals_
 */
export function repeatUntilEquals<A>(
  E: Eq<A>
): (value: () => A) => <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
  const repeatUntilEqualsE_ = repeatUntilEquals_(E)
  return (value) => (ma) => repeatUntilEqualsE_(ma, value)
}

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function either<W, S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>): Z<W, S1, S1 | S2, R, never, E.Either<E, A>> {
  return match_(fa, E.left, E.right)
}

export function orElse_<W, S1, S2, R, E, A, S3, S4, R1, E1>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>
): Z<W, S1 & S3, S2 | S4, R & R1, E1, A> {
  return matchZ_(fa, onFailure, succeed)
}

/**
 * @dataFirst orElse_
 */
export function orElse<W, E, A, S3, S4, R1, E1>(
  onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>
): <S1, S2, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1 & S3, S4 | S2, R & R1, E1, A> {
  return (fa) => orElse_(fa, onFailure)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither_<W, S1, S2, R, E, A, S3, S4, R1, E1, A1>(
  fa: Z<W, S1, S2, R, E, A>,
  that: Z<W, S3, S4, R1, E1, A1>
): Z<W, S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> {
  return matchZ_(
    fa,
    () => map_(that, E.right),
    (a) => succeed(E.left(a))
  )
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst orElseEither_
 */
export function orElseEither<W, S3, S4, R1, E1, A1>(
  that: Z<W, S3, S4, R1, E1, A1>
): <S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1 & S3, S4 | S2, R & R1, E1, E.Either<A, A1>> {
  return (fa) => orElseEither_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foreach
 * -------------------------------------------------------------------------------------------------
 */

function _MonoidBindUnit<W, S, R, E>(): P.Monoid<Z<W, S, S, R, E, void>> {
  return P.Monoid<Z<W, S, S, R, E, void>>((x, y) => chain_(x, () => y), unit())
}

export function foreachUnit_<A, W, S, R, E>(
  as: Iterable<A>,
  f: (a: A, i: number) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return I.foldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

/**
 * @dataFirst foreachUnit_
 */
export function foreachUnit<A, W, S, R, E>(
  f: (a: A, i: number) => Z<W, S, S, R, E, void>
): (as: Iterable<A>) => Z<W, S, S, R, E, void> {
  return (as) => foreachUnit_(as, f)
}

export function foreach_<W, S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, C.Chunk<B>> {
  return I.foldl_(as, succeed(C.empty()) as Z<W, S, S, R, E, C.Chunk<B>>, (b, a, i) =>
    crossWith_(
      b,
      defer(() => f(a, i)),
      C.append_
    )
  )
}

/**
 * @dataFirst foreach_
 */
export function foreach<A, W, S, R, E, B>(
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, C.Chunk<B>> {
  return (as) => foreach_(as, f)
}

export function foreachArrayUnit_<A, W, S, R, E>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return A.foldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

/**
 * @dataFirst foreachArrayUnit_
 */
export function foreachArrayUnit<A, W, S, R, E>(
  f: (a: A, i: number) => Z<W, S, S, R, E, void>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, void> {
  return (as) => foreachArrayUnit_(as, f)
}

export function foreachArray_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return A.foldl_(as, succeed([]) as Z<W, S, S, R, E, Array<B>>, (b, a, i) =>
    crossWith_(
      b,
      defer(() => f(a, i)),
      (acc, a) => {
        acc.push(a)
        return acc
      }
    )
  )
}

/**
 * @dataFirst foreachArray_
 */
export function foreachArray<A, W, S, R, E, B>(
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => foreachArray_(as, f)
}

export function foreachList_<A, W, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, L.List<B>> {
  return I.foldl_(as, succeed(L.emptyPushable()) as Z<W, S, S, R, E, L.MutableList<B>>, (b, a, i) =>
    crossWith_(
      b,
      defer(() => f(a, i)),
      (acc, a) => {
        L.push(a, acc)
        return acc
      }
    )
  )
}

/**
 * @dataFirst foreachList_
 */
export function foreachList<A, W, S, R, E, B>(
  f: (a: A, i: number) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, L.List<B>> {
  return (as) => foreachList_(as, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Runtime
 * -------------------------------------------------------------------------------------------------
 */

class MatchFrame {
  readonly _zTag = 'MatchFrame'
  constructor(
    readonly failure: (e: any) => Z<any, any, any, any, any, any>,
    readonly apply: (a: any) => Z<any, any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _zTag = 'ApplyFrame'
  constructor(readonly apply: (e: any) => Z<any, any, any, any, any, any>) {}
}

type Frame = MatchFrame | ApplyFrame

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll_<W, S1, S2, E, A>(
  ma: Z<W, S1, S2, unknown, E, A>,
  s: S1
): readonly [C.Chunk<W>, Exit<E, readonly [S2, A]>] {
  let frames = undefined as Stack<Frame> | undefined

  let s0            = s as any
  let result: any   = null
  const environment = undefined as Stack<any> | undefined
  let failed        = false
  let current       = ma as Z<any, any, any, any, any, any> | undefined
  let log           = C.empty<W>()

  function popContinuation() {
    const current = frames?.value
    frames        = frames?.previous
    return current
  }

  function pushContinuation(cont: Frame) {
    frames = makeStack(cont, frames)
  }

  function popEnv() {
    const current = environment?.value
    frames        = environment?.previous
    return current
  }

  function pushEnv(env: any) {
    frames = makeStack(env, environment)
  }

  function findNextErrorHandler() {
    let unwinding = true
    while (unwinding) {
      const next = popContinuation()

      if (next == null) {
        unwinding = false
      } else {
        if (next._zTag === 'MatchFrame') {
          unwinding = false
          pushContinuation(new ApplyFrame(next.failure))
        }
      }
    }
  }

  while (current != null) {
    const Z = current
    concrete(Z)

    switch (Z._tag) {
      case ZTag.Chain: {
        current = Z.z
        pushContinuation(new ApplyFrame(Z.cont))
        break
      }
      case ZTag.EffectTotal: {
        result                = Z.effect()
        const nextInstruction = popContinuation()
        if (nextInstruction) {
          current = nextInstruction.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case ZTag.EffectPartial: {
        try {
          current = succeed(Z.effect())
        } catch (e) {
          current = fail(Z.onThrow(e))
        }
        break
      }
      case ZTag.DeferTotal: {
        current = Z.z()
        break
      }
      case ZTag.DeferPartial: {
        try {
          current = Z.z()
        } catch (e) {
          current = fail(Z.onThrow(e))
        }
        break
      }
      case ZTag.Succeed: {
        result          = Z.value
        const nextInstr = popContinuation()
        if (nextInstr) {
          current = nextInstr.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case ZTag.Fail: {
        findNextErrorHandler()
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(Z.cause)
        } else {
          failed  = true
          result  = Z.cause
          current = undefined
        }
        break
      }
      case ZTag.Match: {
        current     = Z.z
        const state = s0
        pushContinuation(
          new MatchFrame(
            (cause: Cause<any>) => {
              const m = crossSecond_(put(state), Z.onFailure(log, cause))
              log     = C.empty()
              return m
            },
            (a) => {
              const m = Z.onSuccess(log, a)
              log     = C.empty()
              return m
            }
          )
        )
        break
      }
      case ZTag.Asks: {
        current = Z.asks(environment?.value || {})
        break
      }
      case ZTag.Give: {
        pushEnv(Z.env)
        current = matchZ_(
          Z.z,
          (e) => crossSecond_(succeed(popEnv()), fail(e)),
          (a) => crossSecond_(succeed(popEnv()), succeed(a))
        )
        break
      }
      case ZTag.Modify: {
        const updated  = Z.run(s0)
        s0             = updated[1]
        result         = updated[0]
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case ZTag.Tell: {
        log            = Z.log
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case ZTag.Censor: {
        current = Z.z
        pushContinuation(
          new MatchFrame(
            (cause: Cause<any>) => {
              log = Z.modifyLog(log)
              return failCause(cause)
            },
            (a) => {
              log = Z.modifyLog(log)
              return succeed(a)
            }
          )
        )
      }
    }
  }

  if (failed) {
    return [log, Ex.failCause(result)]
  }

  return [log, Ex.succeed([s0, result])]
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 *
 * @dataFirst runAll_
 */
export function runAll<S1>(
  s: S1
): <W, S2, E, A>(fa: Z<W, S1, S2, unknown, E, A>) => readonly [C.Chunk<W>, Exit<E, readonly [S2, A]>] {
  return (fa) => runAll_(fa, s)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function run_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): readonly [S2, A] {
  return pipe(ma, runAll(s), ([, exit]) =>
    pipe(
      exit,
      Ex.match((cause) => {
        throw Ca.squash_(P.Show((_: never) => ''))(cause, identity)
      }, identity)
    )
  )
}

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 *
 * @dataFirst run_
 */
export function run<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => readonly [S2, A] {
  return (ma) => run_(ma, s)
}

/**
 * Runs this computation, returning the result.
 */
export function runResult<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): A {
  return run_(ma, {})[1]
}

/**
 * Runs this computation with the given environment, returning the result.
 */
export function runReader_<W, R, A>(ma: Z<W, unknown, never, R, never, A>, r: R): A {
  return runResult(giveAll_(ma, r))
}

/**
 * Runs this computation with the given environment, returning the result.
 *
 * @dataFirst runReader_
 */
export function runReader<R>(r: R): <W, A>(ma: Z<W, unknown, never, R, never, A>) => A {
  return (ma) => runReader_(ma, r)
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): S2 {
  return run_(ma, s)[0]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 *
 * @dataFirst runState_
 */
export function runState<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => S2 {
  return (ma) => runState_(ma, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): A {
  return pipe(ma, runAll(s), ([, exit]) =>
    pipe(
      exit,
      Ex.match(
        (cause) => {
          throw Ca.squash_(P.Show((_: never) => ''))(cause, identity)
        },
        ([, a]) => a
      )
    )
  )
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 *
 * @dataFirst runStateResult_
 */
export function runStateResult<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => A {
  return (ma) => runStateResult_(ma, s)
}

/**
 * Runs this computation returning either the result or error
 */
export function runExit<E, A>(ma: Z<never, unknown, unknown, unknown, E, A>): Exit<E, A> {
  return pipe(
    runAll_(ma, {} as never)[1],
    Ex.map(([, a]) => a)
  )
}

export function runReaderExit_<R, E, A>(ma: Z<never, unknown, unknown, R, E, A>, env: R): Exit<E, A> {
  return runExit(giveAll_(ma, env))
}

/**
 * @dataFirst runReaderExit_
 */
export function runReaderExit<R>(env: R): <E, A>(ma: Z<never, unknown, unknown, R, E, A>) => Exit<E, A> {
  return (ma) => runReaderExit_(ma, env)
}

export function runWriter<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): readonly [C.Chunk<W>, A] {
  return pipe(ma, runAll({}), ([w, exit]) =>
    pipe(
      exit,
      Ex.match(
        (cause) => {
          throw Ca.squash_(P.Show((_: never) => ''))(cause, identity)
        },
        ([, a]) => [w, a]
      )
    )
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export interface ZF extends HKT.HKT {
  readonly type: Z<this['W'], this['S'], this['S'], this['R'], this['E'], this['A']>
  readonly variance: {
    W: '_'
    S: '_'
    R: '-'
    E: '+'
    A: '+'
  }
}

export interface ZReaderCategoryF extends HKT.HKT {
  readonly type: Z<this['W'], this['S'], this['S'], this['I'], this['E'], this['A']>
  readonly variance: {
    W: '_'
    S: '_'
    R: '-'
    E: '+'
    A: '+'
  }
}

export interface ZStateCategoryF extends HKT.HKT {
  readonly type: Z<this['W'], this['I'], this['A'], this['R'], this['E'], this['A']>
  readonly variance: {
    W: '_'
    S: '_'
    R: '-'
    E: '+'
    A: '+'
  }
}

export const Functor = P.Functor<ZF>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<ZF>({ map_, crossWith_, cross_ })

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)
export const crossS_   = P.crossSF_(SemimonoidalFunctor)
export const crossS    = P.crossSF(SemimonoidalFunctor)
export const crossT_   = P.crossTF_(SemimonoidalFunctor)
export const crossT    = P.crossTF(SemimonoidalFunctor)

export const Apply = P.Apply<ZF>({ map_, crossWith_, cross_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<ZF>({ map_, crossWith_, cross_, unit })

export const Applicative = P.Applicative<ZF>({ map_, crossWith_, cross_, ap_, unit, pure })

export const ApplicativeExcept = P.ApplicativeExcept<ZF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  fail,
  catchAll_
})

export const Monad = P.Monad<ZF>({ map_, crossWith_, cross_, ap_, unit, pure, chain_, flatten })

export const chainRec_: <A, W, S, R, E, B>(a: A, f: (a: A) => Z<W, S, S, R, E, E.Either<A, B>>) => Z<W, S, S, R, E, B> =
  P.getChainRec_<ZF>({ map_, crossWith_, cross_, ap_, unit, pure, chain_, flatten })

/**
 * @dataFirst chainRec_
 */
export const chainRec: <A, W, S, R, E, B>(
  f: (a: A) => Z<W, S, S, R, E, E.Either<A, B>>
) => (a: A) => Z<W, S, S, R, E, B> = P.getChainRec<ZF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten
})

export const MonadExcept = P.MonadExcept<ZF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  fail,
  catchAll_
})

export const MonadEnv = P.MonadEnv<ZF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  asks,
  giveAll_
})

export const MonadState = P.MonadState<ZF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  chain_,
  flatten,
  get,
  gets,
  put,
  modify
})

export const ReaderCategory = P.Category<ZReaderCategoryF>({
  id: () => asks(identity),
  andThen_,
  compose_
})

export const StateCategory = P.Category<ZStateCategoryF>({
  id: () => modify((a) => [a, a]),
  andThen_: (ab, bc) => chain_(ab, () => bc),
  compose_: (bc, ab) => chain_(ab, () => bc)
})

export const Do = P.Do(Monad)

export const chainS_ = P.chainSF_(Monad)

/**
 * @dataFirst chainS_
 */
export const chainS = P.chainSF(Monad)

export const pureS_ = P.pureSF_(Monad)

/**
 * @dataFirst pureS_
 */
export const pureS = P.pureSF(Monad)

export const toS_ = P.toSF_(Monad)

/**
 * @dataFirst toS_
 */
export const toS = P.toSF(Monad)

export class GenZ<W, S, R, E, A> {
  readonly _W!: () => W
  readonly _S!: (_: S) => S
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly Z: Z<W, S, S, R, E, A>) {}

  *[Symbol.iterator](): Generator<GenZ<W, S, R, E, A>, A, any> {
    return yield this
  }
}

/**
 * @internal
 */
export const __adapter = (_: any, __?: any) => {
  return _
}

const adapter = (_: any, __?: any) => {
  return new GenZ(__adapter(_, __))
}

type _W<Z> = [Z] extends [{ ['_W']: () => infer W }] ? W : never
type _S<Z> = [Z] extends [{ ['_S']: (_: infer S) => infer S }] ? S : never

/**
 * @gen
 */
export function gen<T extends GenZ<any, any, any, any, any>, A>(
  f: (i: <W, S, R, E, A>(_: Z<W, S, S, R, E, A>) => GenZ<W, S, R, E, A>) => Generator<T, A, any>
): Z<_W<T>, _S<T>, _S<T>, _R<T>, _E<T>, A> {
  return defer(() => {
    const iterator = f(adapter as any)
    const state    = iterator.next()

    function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): Z<any, any, any, any, any, A> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value['Z'], (val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}
