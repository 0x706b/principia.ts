/**
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/fx/ZPure.scala
 */
import type { Eq } from './Eq'
import type { FreeSemiring } from './FreeSemiring'
import type * as HKT from './HKT'
import type { ZURI } from './Modules'
import type { Predicate } from './Predicate'
import type { _E, _R } from './prelude'
import type { Stack } from './util/support/Stack'

import * as A from './Array/core'
import * as C from './Chunk/core'
import * as E from './Either'
import * as FS from './FreeSemiring'
import * as I from './Iterable/core'
import * as L from './List/core'
import * as O from './Option'
import { flow, isObject } from './prelude'
import * as P from './prelude'
import { makeStack } from './util/support/Stack'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export const ZTypeId = Symbol()
export type ZTypeId = typeof ZTypeId

export type Cause<E> = FreeSemiring<never, E>

abstract class ZSyntax<W, S1, S2, R, E, A> {
  ['>>=']<W1, S3, Q, D, B>(
    this: Z<W, S1, S2, R, E, A>,
    f: (a: A) => Z<W1, S2, S3, Q, D, B>
  ): Z<W | W1, S1, S3, Q & R, D | E, B> {
    return new Chain(this, f)
  }
  ['<$>']<B>(this: Z<W, S1, S2, R, E, A>, f: (a: A) => B): Z<W, S1, S2, R, E, B> {
    return this['>>=']((a) => new Succeed(f(a)))
  }
  ['$>']<B>(this: Z<W, S1, S2, R, E, A>, b: () => B): Z<W, S1, S2, R, E, B> {
    return this['<$>'](b)
  }
  ['*>']<W1, S3, Q, D, B>(this: Z<W, S1, S2, R, E, A>, mb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, B> {
    return zipSecond_(this, mb)
  }
  ['<*']<W1, S3, Q, D, B>(this: Z<W, S1, S2, R, E, A>, mb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, A> {
    return zipFirst_(this, mb)
  }
  ['<*>']<W1, S3, Q, D, B>(
    this: Z<W, S1, S2, R, E, A>,
    mb: Z<W1, S2, S3, Q, D, B>
  ): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
    return zip_(this, mb)
  }
}

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
export abstract class Z<W, S1, S2, R, E, A> extends ZSyntax<W, S1, S2, R, E, A> {
  readonly [ZTypeId]: ZTypeId = ZTypeId

  readonly _W!: () => W
  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor() {
    super()
  }
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
  readonly _tag = ZTag.Succeed
  constructor(readonly value: A) {
    super()
  }
}

class EffectTotal<A> extends Z<never, unknown, never, unknown, never, A> {
  readonly _tag = ZTag.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

class EffectPartial<E, A> extends Z<never, unknown, never, unknown, E, A> {
  readonly _tag = ZTag.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

class DeferTotal<W, S1, S2, R, E, A> extends Z<W, S1, S2, R, E, A> {
  readonly _tag = ZTag.DeferTotal
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class DeferPartial<W, S1, S2, R, E, A, E1> extends Z<W, S1, S2, R, E | E1, A> {
  readonly _tag = ZTag.DeferPartial
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>, readonly onThrow: (u: unknown) => E1) {
    super()
  }
}

class Fail<E> extends Z<never, unknown, never, unknown, E, never> {
  readonly _tag = ZTag.Fail
  constructor(readonly cause: Cause<E>) {
    super()
  }
}

class Modify<S1, S2, A> extends Z<never, S1, S2, unknown, never, A> {
  readonly _tag = ZTag.Modify
  constructor(readonly run: (s1: S1) => readonly [A, S2]) {
    super()
  }
}

class Chain<W, S1, S2, R, E, A, W1, S3, Q, D, B> extends Z<W | W1, S1, S3, Q & R, D | E, B> {
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
  readonly _tag = ZTag.Asks
  constructor(readonly asks: (r: R0) => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class Give<W, S1, S2, R, E, A> extends Z<W, S1, S2, unknown, E, A> {
  readonly _tag = ZTag.Give
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly env: R) {
    super()
  }
}

class Tell<W> extends Z<W, unknown, never, unknown, never, void> {
  readonly _tag = ZTag.Tell
  constructor(readonly log: C.Chunk<W>) {
    super()
  }
}

class Censor<W, S1, S2, R, E, A, W1> extends Z<W1, S1, S2, R, E, A> {
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
  return new DeferPartial(ma, P.identity)
}

export function deferTryCatch_<W, S1, S2, R, E, A, E1>(
  ma: () => Z<W, S1, S2, R, E, A>,
  f: (e: unknown) => E1
): Z<W, S1, S2, R, E | E1, A> {
  return new DeferPartial(ma, f)
}

export function deferTryCatch<E1>(
  onThrow: (e: unknown) => E1
): <W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E | E1, A> {
  return (ma) => deferTryCatch_(ma, onThrow)
}

export function defer<W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, E, A> {
  return new DeferTotal(ma)
}

function _try<A>(effect: () => A): Z<never, unknown, never, unknown, unknown, A> {
  return new EffectPartial(effect, P.identity)
}

export { _try as try }

export function succeedLazy<A, W = never, S1 = unknown, S2 = never>(effect: () => A): Z<W, S1, S2, unknown, never, A> {
  return new EffectTotal(effect)
}

export function tryCatch_<A, E>(
  effect: () => A,
  onThrow: (reason: unknown) => E
): Z<never, unknown, never, unknown, E, A> {
  return new EffectPartial(effect, onThrow)
}

export function tryCatch<E>(
  onThrow: (reason: unknown) => E
): <A>(effect: () => A) => Z<never, unknown, never, unknown, E, A> {
  return (effect) => tryCatch_(effect, onThrow)
}

export function fail<E>(e: E): Z<never, unknown, never, unknown, E, never> {
  return halt(FS.single(e))
}

export function failLazy<E>(e: () => E): Z<never, unknown, never, unknown, E, never> {
  return haltLazy(() => FS.single(e()))
}

export function fromEither<E, A>(either: E.Either<E, A>): Z<never, unknown, never, unknown, E, A> {
  return E.match_(either, fail, succeed)
}

export function fromEitherLazy<E, A>(either: () => E.Either<E, A>): Z<never, unknown, never, unknown, E, A> {
  return defer(() => fromEither(either()))
}

export function fromOption<A>(option: O.Option<A>): Z<never, unknown, never, unknown, O.Option<never>, A> {
  return O.match_(option, () => fail(O.none()), succeed)
}

export function fromOptionLazy<A>(option: () => O.Option<A>): Z<never, unknown, never, unknown, O.Option<never>, A> {
  return defer(() => fromOption(option()))
}

export function halt<E>(cause: Cause<E>): Z<never, unknown, never, unknown, E, never> {
  return new Fail(cause)
}

export function haltLazy<E>(cause: () => Cause<E>): Z<never, unknown, never, unknown, E, never> {
  return defer(() => halt(cause()))
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
  return P.pipe(
    get<S1>(),
    map(f),
    chain(
      E.match(fail, ([a, s2]) =>
        P.pipe(
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
  return P.pipe(get<S>(), chain(f))
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
  return put(s)['*>'](ma)
}

/**
 * Provides this computation with its initial state.
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
      P.pipe(
        onFailure(e),
        censor((w1s) => C.concatW_(ws, w1s))
      ),
    (ws, a) =>
      P.pipe(
        onSuccess(a),
        censor((w2s) => C.concatW_(ws, w2s))
      )
  )
}

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
  return matchLogCauseZ_(fa, (ws, e) => onFailure(ws, FS.first(e)), onSuccess)
}

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
  return matchCauseZ_(fa, P.flow(FS.first, onFailure), onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
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
  return crossWith_(fa, fb, P.tuple)
}

export function cross<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, P.tuple)
}

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
  return P.pipe(
    fa,
    matchCauseZ(
      (c1) =>
        P.pipe(
          fb,
          matchCauseZ(
            (c2) => halt(FS.both(c1, c2)),
            (_) => halt(c1)
          )
        ),
      (a) => map_(fb, (b) => f(a, b))
    )
  )
}

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

export function crossSecond<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, B> {
  return (fa) => crossSecond_(fa, fb)
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
  return zipWith_(fa, fb, P.tuple)
}

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

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <W, S1, S2, R>(pab: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<W, S1, S2, R, E, A, G>(pab: Z<W, S1, S2, R, E, A>, f: (e: E) => G): Z<W, S1, S2, R, G, A> {
  return matchZ_(pab, (e) => fail(f(e)), succeed)
}

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

export function tap<S2, A, W1, S3, R1, E1, B>(
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<W, S1, S2, R, E, A, W1, S3, R1, E1>(
  mma: Z<W, S1, S2, R, E, Z<W1, S2, S3, R1, E1, A>>
): Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return chain_(mma, P.identity)
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

export function giveAll<R>(r: R): <W, S1, S2, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r)
}

export function gives_<R0, W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>, f: (r0: R0) => R): Z<W, S1, S2, R0, E, A> {
  return asksZ((r: R0) => giveAll_(ma, f(r)))
}

export function gives<R0, R>(f: (r0: R0) => R): <W, S1, S2, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f)
}

export function give_<W, S1, S2, R, E, A, R0>(ma: Z<W, S1, S2, R & R0, E, A>, r: R): Z<W, S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }))
}

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

export function writeAll<W1>(
  ws: C.Chunk<W1>
): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => writeAll_(ma, ws)
}

export function write_<W, S1, S2, R, E, A, W1>(ma: Z<W, S1, S2, R, E, A>, w: W1): Z<W | W1, S1, S2, R, E, A> {
  return writeAll_(ma, C.single(w))
}

export function write<W1>(w: W1): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => write_(ma, w)
}

export function listen<W, S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, E, readonly [A, C.Chunk<W>]> {
  return matchLogCauseZ_(
    wa,
    (_, e) => halt(e),
    (ws, a) => succeed([a, ws])
  )
}

export function listens_<W, S1, S2, R, E, A, B>(
  wa: Z<W, S1, S2, R, E, A>,
  f: (l: C.Chunk<W>) => B
): Z<W, S1, S2, R, E, readonly [A, B]> {
  return P.pipe(
    wa,
    listen,
    map(([a, ws]) => [a, f(ws)])
  )
}

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
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure)
}

export function catchSome_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Z<W, S1, S2, R, E, A>,
  f: (e: E) => O.Option<Z<W, S1, S3, R1, E1, B>>
): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      O.getOrElse((): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> => fa)
    )
  )
}

export function catchSome<W, S1, E, S3, R1, E1, B>(
  f: (e: E) => O.Option<Z<W, S1, S3, R1, E1, B>>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2 | S3, R & R1, E | E1, B | A> {
  return (fa) => catchSome_(fa, f)
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

export function iforeachUnit_<A, W, S, R, E>(
  as: Iterable<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return I.ifoldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

export function iforeachUnit<A, W, S, R, E>(
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): (as: Iterable<A>) => Z<W, S, S, R, E, void> {
  return (as) => iforeachUnit_(as, f)
}

export function iforeach_<W, S, R, E, A, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, C.Chunk<B>> {
  return I.ifoldl_(as, succeed(C.empty()) as Z<W, S, S, R, E, C.Chunk<B>>, (b, i, a) =>
    crossWith_(
      b,
      defer(() => f(i, a)),
      C.append_
    )
  )
}

export function iforeach<A, W, S, R, E, B>(
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, C.Chunk<B>> {
  return (as) => iforeach_(as, f)
}

export function foreach_<A, W, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, C.Chunk<B>> {
  return iforeach_(as, (_, a) => f(a))
}

export function foreach<A, W, S, R, E, B>(
  f: (a: A) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, C.Chunk<B>> {
  return (as) => foreach_(as, f)
}

export function iforeachArrayUnit_<A, W, S, R, E>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return A.ifoldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

export function iforeachArrayUnit<A, W, S, R, E>(
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, void> {
  return (as) => iforeachArrayUnit_(as, f)
}

export function iforeachArray_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return A.ifoldl_(as, succeed([]) as Z<W, S, S, R, E, Array<B>>, (b, i, a) =>
    crossWith_(
      b,
      defer(() => f(i, a)),
      (acc, a) => {
        acc.push(a)
        return acc
      }
    )
  )
}

export function iforeachArray<A, W, S, R, E, B>(
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => iforeachArray_(as, f)
}

export function foreachArray_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return iforeachArray_(as, (_, a) => f(a))
}

export function foreachArray<A, W, S, R, E, B>(
  f: (a: A) => Z<W, S, S, R, E, B>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => foreachArray_(as, f)
}

export function iforeachList_<A, W, S, R, E, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, L.List<B>> {
  return I.ifoldl_(as, succeed(L.emptyPushable()) as Z<W, S, S, R, E, L.MutableList<B>>, (b, i, a) =>
    crossWith_(
      b,
      defer(() => f(i, a)),
      (acc, a) => {
        L.push(a, acc)
        return acc
      }
    )
  )
}

export function iforeachList<A, W, S, R, E, B>(
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, L.List<B>> {
  return (as) => iforeachList_(as, f)
}

export function foreachList_<A, W, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, L.List<B>> {
  return iforeachList_(as, (_, a) => f(a))
}

export function foreachList<A, W, S, R, E, B>(
  f: (a: A) => Z<W, S, S, R, E, B>
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
): readonly [C.Chunk<W>, E.Either<Cause<E>, readonly [S2, A]>] {
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
              const m = put(state)['*>'](Z.onFailure(log, cause))
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
          (e) => succeed(popEnv())['*>'](fail(e)),
          (a) => succeed(popEnv())['*>'](succeed(a))
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
              return halt(cause)
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
    return [log, E.left(result)]
  }

  return [log, E.right([s0, result])]
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll<S1>(
  s: S1
): <W, S2, E, A>(fa: Z<W, S1, S2, unknown, E, A>) => readonly [C.Chunk<W>, E.Either<Cause<E>, readonly [S2, A]>] {
  return (fa) => runAll_(fa, s)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function run_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): readonly [S2, A] {
  return (runAll_(ma, s) as [C.Chunk<W>, E.Right<readonly [S2, A]>])[1].right
}

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
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
 */
export function runState<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => S2 {
  return (ma) => runState_(ma, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): A {
  return (runAll_(ma, s) as readonly [C.Chunk<W>, E.Right<readonly [S2, A]>])[1].right[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => A {
  return (ma) => runStateResult_(ma, s)
}

/**
 * Runs this computation returning either the result or error
 */
export function runEither<E, A>(ma: Z<never, unknown, unknown, unknown, E, A>): E.Either<E, A> {
  return P.pipe(
    runAll_(ma, {} as never)[1],
    E.map(([, x]) => x),
    E.mapLeft(FS.first)
  )
}

export function runReaderEither_<R, E, A>(ma: Z<never, unknown, unknown, R, E, A>, env: R): E.Either<E, A> {
  return runEither(giveAll_(ma, env))
}

export function runReaderEither<R>(env: R): <E, A>(ma: Z<never, unknown, unknown, R, E, A>) => E.Either<E, A> {
  return (ma) => runReaderEither_(ma, env)
}

export function runWriter<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): readonly [C.Chunk<W>, A] {
  const [log, result] = runAll_(ma, {}) as readonly [C.Chunk<W>, E.Right<[never, A]>]
  return [log, result.right[1]]
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

type URI = [HKT.URI<ZURI>]

export type V = HKT.V<'W', '_'> & HKT.V<'S', '_'> & HKT.V<'R', '-'> & HKT.V<'E', '+'>

export const Functor = P.Functor<URI, V>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({ map_, crossWith_, cross_ })

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)

export const Apply = P.Apply<URI, V>({ map_, crossWith_, cross_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({ map_, crossWith_, cross_, unit })

export const Applicative = P.Applicative<URI, V>({ map_, crossWith_, cross_, ap_, unit, pure })

export const ApplicativeExcept = P.ApplicativeExcept<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  fail,
  catchAll_
})

export const Monad = P.Monad<URI, V>({ map_, crossWith_, cross_, ap_, unit, pure, chain_, flatten })

export const MonadExcept = P.MonadExcept<URI, V>({
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

export const MonadEnv = P.MonadEnv<URI, V>({
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

export const MonadState = P.MonadState<URI, V>({
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

const adapter = (_: any, __?: any) => {
  return new GenZ(_)
}

type _W<Z> = [Z] extends [{ ['_W']: () => infer W }] ? W : never
type _S<Z> = [Z] extends [{ ['_S']: (_: infer S) => infer S }] ? S : never

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

export { ZURI } from './Modules'
