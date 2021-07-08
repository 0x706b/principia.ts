// tracing: off

import type { Predicate } from '../../Predicate'
import type { Refinement } from '../../Refinement'
import type { STM } from './primitives'

import * as E from '../../Either'
import { NoSuchElementError } from '../../Error'
import { RuntimeException } from '../../Exception'
import { constVoid, identity } from '../../function'
import * as T from '../../IO'
import * as O from '../../Option'
import { AtomicBoolean } from '../../util/support/AtomicBoolean'
import { tryCommit, tryCommitAsync } from '../Journal'
import { DoneTypeId, SuspendTypeId } from '../TryCommit'
import { txnId } from '../TxnId'
import * as _ from './primitives'
import { DieException, Effect, Gives, RetryException } from './primitives'

export const MaxFrames = 200

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export const succeed: <A>(a: A) => STM<unknown, never, A> = _.succeed

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export const succeedLazy: <A>(a: () => A) => STM<unknown, never, A> = _.succeedLazy

/**
 * Returns a value that models failure in the transaction.
 */
export const fail: <E>(e: E) => STM<unknown, E, never> = _.fail

/**
 * Returns a value that models failure in the transaction.
 */
export const failLazy: <E>(e: () => E) => STM<unknown, E, never> = _.failLazy

/**
 * Kills the fiber running the effect.
 */
export function die(u: unknown): STM<unknown, never, never> {
  return new Effect(() => {
    throw new DieException(u)
  })
}

/**
 * Kills the fiber running the effect.
 */
export function dieLazy(u: () => unknown): STM<unknown, never, never> {
  return new Effect(() => {
    throw new DieException(u())
  })
}

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 */
export const retry: STM<unknown, never, never> = new Effect(() => {
  throw new RetryException()
})

/*
 * -------------------------------------------------------------------------------------------------
 * Match
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 */
export function match_<R, E, A, B, C>(stm: STM<R, E, A>, g: (e: E) => C, f: (a: A) => B): STM<R, never, B | C> {
  return matchSTM_(
    stm,
    (e) => succeed(g(e)),
    (a) => succeed(f(a))
  )
}

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 *
 * @dataFirst match_
 */
export function match<E, A, B, C>(g: (e: E) => C, f: (a: A) => B): <R>(stm: STM<R, E, A>) => STM<R, never, B | C> {
  return (stm) => match_(stm, g, f)
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 */
export const matchSTM_: <R, E, A, R1, E1, B, R2, E2, C>(
  self: STM<R, E, A>,
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
) => STM<R1 & R2 & R, E1 | E2, B | C> = _.matchSTM_

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 *
 * @dataFirst matchSTM_
 */
export function matchSTM<E, A, R1, E1, B, R2, E2, C>(
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): <R>(self: STM<R, E, A>) => STM<R1 & R2 & R, E1 | E2, B | C> {
  return (self) => matchSTM_(self, g, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 */
export function crossWith_<R, E, A, R1, E1, B, C>(
  stm: STM<R, E, A>,
  that: STM<R1, E1, B>,
  f: (a: A, b: B) => C
): STM<R1 & R, E | E1, C> {
  return chain_(stm, (a) => map_(that, (b) => f(a, b)))
}

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @dataFirst crossWith_
 */
export function crossWith<A, R1, E1, B, C>(
  that: STM<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(stm: STM<R, E, A>) => STM<R1 & R, E | E1, C> {
  return (stm) => chain_(stm, (a) => map_(that, (b) => f(a, b)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an `STM` effect that succeeds with `Unit`.
 */
export const unit = succeed<void>(undefined)

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Retrieves the environment inside an stm.
 */
export function ask<R>(): STM<R, never, R> {
  return new Effect((_, __, r: R) => r)
}

/**
 * Accesses the environment of the transaction.
 */
export function asks<R, A>(f: (r: R) => A): STM<R, never, A> {
  return map_(ask<R>(), f)
}

/**
 * Accesses the environment of the transaction to perform a transaction.
 */
export function asksSTM<R0, R, E, A>(f: (r: R0) => STM<R, E, A>) {
  return chain_(ask<R0>(), f)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function gives_<R, E, A, R0>(self: STM<R, E, A>, f: (r: R0) => R): STM<R0, E, A> {
  return new Gives(self, f)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @dataFirst gives_
 */
export function gives<R, R0>(f: (r: R0) => R): <E, A>(self: STM<R, E, A>) => STM<R0, E, A> {
  return (self) => gives_(self, f)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, A>(stm: STM<R, E, A>, r: R): STM<unknown, E, A> {
  return gives_(stm, () => r)
}

/**
 * Provides the transaction its required environment, which eliminates
 * its dependency on `R`.
 *
 * @dataFirst giveAll_
 */
export function giveAll<R>(r: R): <E, A>(stm: STM<R, E, A>) => STM<unknown, E, A> {
  return (stm) => giveAll_(stm, r)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 */
export const chain_: <R, E, A, R1, E1, B>(self: STM<R, E, A>, f: (a: A) => STM<R1, E1, B>) => STM<R1 & R, E | E1, B> =
  _.chain_

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @dataFirst chain_
 */
export function chain<A, R1, E1, B>(f: (a: A) => STM<R1, E1, B>): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, B> {
  return (self) => chain_(self, f)
}

/**
 * Flattens out a nested `STM` effect.
 */
export function flatten<R, E, R1, E1, B>(stm: STM<R, E, STM<R1, E1, B>>): STM<R1 & R, E | E1, B> {
  return chain_(stm, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Recovers from all errors.
 */
export const catchAll_: <R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R1, E1, B>
) => STM<R1 & R, E1, A | B> = _.catchAll_

/**
 * Recovers from all errors.
 *
 * @dataFirst catchAll_
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => STM<R1, E1, B>
): <R, A>(self: STM<R, E, A>) => STM<R1 & R, E1, A | B> {
  return (self) => catchAll_(self, f)
}

/**
 * Recovers from specified error.
 *
 * @dataFirst catch_
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
) {
  return <R, A>(stm: STM<R, E, A>): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> =>
    catchAll_(stm, (e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return fail(e as any)
    })
}

export { _catch as catch }

/**
 * Recovers from specified error.
 */
export function catch_<N extends keyof E, K extends E[N] & string, E, R, A, R1, E1, A1>(
  stm: STM<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => STM<R1, E1, A1>
): STM<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return catchAll_(stm, (e) => {
    if (tag in e && e[tag] === k) {
      return f(e as any)
    }
    return fail(e as any)
  })
}

/**
 * Recovers from specified error.
 *
 * @dataFirst catchTag_
 */
export function catchTag<K extends E['_tag'] & string, E extends { _tag: string }, R1, E1, A1>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
) {
  return <R, A>(stm: STM<R, E, A>): STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> => catchTag_(stm, k, f)
}

/**
 * Recovers from specified error.
 */
export function catchTag_<K extends E['_tag'] & string, E extends { _tag: string }, R, A, R1, E1, A1>(
  stm: STM<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
): STM<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catchAll_(stm, (e) => {
    if ('_tag' in e && e['_tag'] === k) {
      return f(e as any)
    }
    return fail(e as any)
  })
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, B>(
  stm: STM<R, E, A>,
  f: (e: E) => O.Option<STM<R1, E1, B>>
): STM<R1 & R, E | E1, A | B> {
  return catchAll_(stm, (e): STM<R1, E | E1, A | B> => O.match_(f(e), () => fail(e), identity))
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchSome_
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => O.Option<STM<R1, E1, B>>
): <R, A>(stm: STM<R, E, A>) => STM<R1 & R, E | E1, A | B> {
  return (stm) => catchSome_(stm, f)
}

/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 */
export function subsumeEither<R, E, E1, A>(z: STM<R, E, E.Either<E1, A>>): STM<R, E | E1, A> {
  return chain_(z, fromEither)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as_<R, E, A, B>(stm: STM<R, E, A>, b: B): STM<R, E, B> {
  return map_(stm, () => b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<A, B>(b: B): <R, E>(stm: STM<R, E, A>) => STM<R, E, B> {
  return (stm) => as_(stm, b)
}

/**
 * Maps the value produced by the effect.
 */
export const map_: <R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B) => STM<R, E, B> = _.map_

/**
 * Maps the value produced by the effect.
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B> {
  return (self) => map_(self, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps from one error type to another.
 */
export function mapError_<R, E, A, E1>(stm: STM<R, E, A>, f: (a: E) => E1): STM<R, E1, A> {
  return matchSTM_(stm, (e) => fail(f(e)), succeed)
}

/**
 * Maps from one error type to another.
 *
 * @dataFirst mapError_
 */
export function mapError<E, E1>(f: (a: E) => E1): <R, A>(stm: STM<R, E, A>) => STM<R, E1, A> {
  return (stm) => mapError_(stm, f)
}

/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, B>(stm: STM<R, E, A>, g: (e: E) => E1, f: (a: A) => B): STM<R, E1, B> {
  return matchSTM_(
    stm,
    (e) => fail(g(e)),
    (a) => succeed(f(a))
  )
}

/**
 * Returns an `STM` effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @dataFirst bimap_
 */
export function bimap<R, E, A, E1, B>(g: (e: E) => E1, f: (a: A) => B): (stm: STM<R, E, A>) => STM<R, E1, B> {
  return (stm) => bimap_(stm, g, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Propagates the given environment to stm.
 */
export function andThen_<R, E, A, E1, B>(stm: STM<R, E, A>, that: STM<A, E1, B>): STM<R, E | E1, B> {
  return chain_(stm, (a) => giveAll_(that, a))
}

/**
 * Propagates the given environment to stm.
 *
 * @dataFirst andThen_
 */
export function andThen<A, E1, B>(that: STM<A, E1, B>): <R, E>(stm: STM<R, E, A>) => STM<R, E | E1, B> {
  return (stm) => andThen_(stm, that)
}

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(stm: STM<R, E, A>): STM<R, E, O.Option<A>> {
  return map_(stm, O.some)
}

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(stm: STM<R, E, A>): STM<R, O.Option<E>, A> {
  return mapError_(stm, O.some)
}

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 */
export function continueOrRetrySTM_<R, E, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
): STM<R2 & R, E | E2, A2> {
  return chain_(fa, (a): STM<R2, E2, A2> => O.getOrElse_(pf(a), () => retry))
}

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 *
 * @dataFirst continueOrRetrySTM_
 */
export function continueOrRetrySTM<A, R2, E2, A2>(
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
): <R, E>(fa: STM<R, E, A>) => STM<R2 & R, E | E2, A2> {
  return (fa) => continueOrRetrySTM_(fa, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrRetry_<R, E, A, A2>(fa: STM<R, E, A>, pf: (a: A) => O.Option<A2>) {
  return continueOrRetrySTM_(fa, (x) => O.map_(pf(x), succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrRetry_
 */
export function continueOrRetry<A, A2>(pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrRetry_(fa, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailSTM_<R, E, E1, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return chain_(fa, (a): STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => fail(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailSTM_
 */
export function continueOrFailSTM<E1, A, R2, E2, A2>(e: E1, pf: (a: A) => O.Option<STM<R2, E2, A2>>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailSTM_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, E1, A, A2>(fa: STM<R, E, A>, e: E1, pf: (a: A) => O.Option<A2>) {
  return continueOrFailSTM_(fa, e, (x) => O.map_(pf(x), succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFail_
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFail_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailWithSTM_<R, E, E1, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<STM<R2, E2, A2>>
) {
  return chain_(fa, (a): STM<R2, E1 | E2, A2> => O.getOrElse_(pf(a), () => failLazy(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailWithSTM_
 */
export function continueOrFailWithSTM<E1, A, R2, E2, A2>(e: () => E1, pf: (a: A) => O.Option<STM<R2, E2, A2>>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailWithSTM_(fa, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFailWith_<R, E, E1, A, A2>(fa: STM<R, E, A>, e: () => E1, pf: (a: A) => O.Option<A2>) {
  return continueOrFailWithSTM_(fa, e, (x) => O.map_(pf(x), succeed))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFailWith_
 */
export function continueOrFailWith<E1, A, A2>(e: () => E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: STM<R, E, A>) => continueOrFailWith_(fa, e, pf)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @dataFirst chainError_
 */
export function chainError<E, R2, E2>(f: (e: E) => STM<R2, never, E2>) {
  return <R, A>(stm: STM<R, E, A>) => chainError_(stm, f)
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 */
export function chainError_<R, E, A, R2, E2>(stm: STM<R, E, A>, f: (e: E) => STM<R2, never, E2>) {
  return swapWith_(stm, (x) => chain_(x, f))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function checkWith(predicate: () => boolean) {
  return defer(() => (predicate() ? unit : retry))
}

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 */
export function check(predicate: boolean) {
  return checkWith(() => predicate)
}

/**
 * Propagates stm environment to that.
 */
export function compose_<R, E, A, R1, E1>(stm: STM<R, E, A>, that: STM<R1, E1, R>) {
  return andThen_(that, stm)
}

/**
 * Propagates stm environment to that.
 *
 * @dataFirst compose_
 */
export function compose<R, R1, E1>(that: STM<R1, E1, R>) {
  return <E, A>(stm: STM<R, E, A>) => andThen_(that, stm)
}

/**
 * Commits this transaction atomically.
 */
export function commit<R, E, A>(stm: STM<R, E, A>): T.IO<R, E, A> {
  return T.asksIO((r: R) =>
    T.deferWith((_, fiberId) => {
      const v = tryCommit(fiberId, stm, r)

      switch (v._typeId) {
        case DoneTypeId: {
          return v.io
        }
        case SuspendTypeId: {
          const id        = txnId()
          const done      = new AtomicBoolean(false)
          const interrupt = T.succeedLazy(() => done.set(true))
          const io        = T.async(tryCommitAsync(v.journal, fiberId, stm, id, done, r))
          return T.ensuring_(io, interrupt)
        }
      }
    })
  )
}

/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 */
export function commitEither<R, E, A>(stm: STM<R, E, A>): T.IO<R, E, A> {
  return T.subsumeEither(commit(either(stm)))
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessage(message: string): STM<unknown, never, never> {
  return dieLazy(() => new RuntimeException(message))
}

/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 */
export function dieMessageWith(message: () => string): STM<unknown, never, never> {
  return succeedLazy(() => {
    throw new RuntimeException(message())
  })
}

/**
 * Converts the failure channel into an `Either`.
 */
export function either<R, E, A>(stm: STM<R, E, A>): STM<R, never, E.Either<E, A>> {
  return match_(
    stm,
    (x) => E.left(x),
    (x) => E.right(x)
  )
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 */
export const ensuring_: <R, E, A, R1, B>(self: STM<R, E, A>, finalizer: STM<R1, never, B>) => STM<R & R1, E, A> =
  _.ensuring_

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @dataFirst ensuring_
 */
export function ensuring<R1, B>(finalizer: STM<R1, never, B>): <R, E, A>(self: STM<R, E, A>) => STM<R & R1, E, A> {
  return (self) => ensuring_(self, finalizer)
}

/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(stm: STM<R, E, A>): STM<R, never, A> {
  return matchSTM_(stm, () => eventually(stm), succeed)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @dataFirst filterOrDie_
 */
export function filterOrDie<A, B extends A>(
  p: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): <R, E>(fa: STM<R, E, A>) => STM<R, E, B>
export function filterOrDie<A>(p: Predicate<A>, dieWith: (a: A) => unknown): <R, E>(fa: STM<R, E, A>) => STM<R, E, A>
export function filterOrDie<A>(p: Predicate<A>, dieWith: unknown) {
  return <R, E>(fa: STM<R, E, A>): STM<R, E, A> => filterOrDie_(fa, p, dieWith as (a: A) => unknown)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: STM<R, E, A>,
  p: Refinement<A, B>,
  f: (a: Exclude<A, B>) => unknown
): STM<R, E, B>
export function filterOrDie_<R, E, A>(fa: STM<R, E, A>, p: Predicate<A>, f: (a: A) => unknown): STM<R, E, A>
export function filterOrDie_<R, E, A>(fa: STM<R, E, A>, p: Predicate<A>, f: unknown) {
  return filterOrElse_(fa, p, (x) => dieLazy(() => (f as (a: A) => unknown)(x)))
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @dataFirst filterOrFail_
 */
export function filterOrFail<A, B extends A, E1>(
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): <R, E>(fa: STM<R, E, A>) => STM<R, E | E1, B>
export function filterOrFail<A, E1>(
  p: Predicate<A>,
  failWith: (a: A) => E1
): <R, E>(fa: STM<R, E, A>) => STM<R, E | E1, A>
export function filterOrFail<A, E1>(p: Predicate<A>, failWith: unknown) {
  return <R, E>(fa: STM<R, E, A>): STM<R, E | E1, A> => filterOrFail_(fa, p, failWith as (a: A) => E1)
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, E1, A, B extends A>(
  fa: STM<R, E, A>,
  p: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): STM<R, E | E1, B>
export function filterOrFail_<R, E, E1, A>(fa: STM<R, E, A>, p: Predicate<A>, failWith: (a: A) => E1): STM<R, E | E1, A>
export function filterOrFail_<R, E, E1, A>(fa: STM<R, E, A>, p: Predicate<A>, failWith: unknown) {
  return filterOrElse_(fa, p, (x) => fail((failWith as (a: A) => E1)(x)))
}

/**
 * Applies `or` if the predicate fails.
 *
 * @dataFirst filterOrElse_
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => STM<R2, E2, A2>
): <R, E>(fa: STM<R, E, A>) => STM<R & R2, E | E2, B | A2>
export function filterOrElse<A, R2, E2, A2>(
  p: Predicate<A>,
  or: (a: A) => STM<R2, E2, A2>
): <R, E>(fa: STM<R, E, A>) => STM<R & R2, E | E2, A | A2>
export function filterOrElse<A, R2, E2, A2>(p: Predicate<A>, or: unknown) {
  return <R, E>(fa: STM<R, E, A>) => filterOrElse_(fa, p, or as (a: A) => STM<R2, E2, A2>)
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R2, E2, A2>(
  fa: STM<R, E, A>,
  p: Refinement<A, B>,
  or: (a: Exclude<A, B>) => STM<R2, E2, A2>
): STM<R & R2, E | E2, B | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  p: Predicate<A>,
  or: (a: A) => STM<R2, E2, A2>
): STM<R & R2, E | E2, A | A2>
export function filterOrElse_<R, E, A, R2, E2, A2>(
  fa: STM<R, E, A>,
  p: Predicate<A>,
  or: unknown
): STM<R & R2, E | E2, A | A2> {
  return chain_(fa, (a): STM<R2, E2, A | A2> => (p(a) ? succeed(a) : defer(() => (or as (a: A) => STM<R2, E2, A2>)(a))))
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 *
 * @dataFirst filterOrDieMessage_
 */
export function filterOrDieMessage<A, B extends A>(
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): <R, E>(fa: STM<R, E, A>) => STM<R, E, B>
export function filterOrDieMessage<A>(
  p: Predicate<A>,
  message: (a: A) => string
): <R, E>(fa: STM<R, E, A>) => STM<R, E, A>
export function filterOrDieMessage<A>(p: Predicate<A>, message: unknown) {
  return <R, E>(fa: STM<R, E, A>): STM<R, E, A> => filterOrDieMessage_(fa, p, message as (a: A) => string)
}

/**
 * Dies with a `Error` having the specified text message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: STM<R, E, A>,
  p: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): STM<R, E, B>
export function filterOrDieMessage_<R, E, A>(fa: STM<R, E, A>, p: Predicate<A>, message: (a: A) => string): STM<R, E, A>
export function filterOrDieMessage_<R, E, A>(fa: STM<R, E, A>, p: Predicate<A>, message: unknown) {
  return filterOrDie_(fa, p, (a) => new RuntimeException((message as (a: A) => string)(a)))
}

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 */
export function swap<R, E, A>(stm: STM<R, E, A>) {
  return matchSTM_(stm, succeed, fail)
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @dataFirst swapWith_
 */
export function swapWith<R, E, A, R2, E2, A2>(f: (stm: STM<R, A, E>) => STM<R2, A2, E2>) {
  return (stm: STM<R, E, A>): STM<R2, E2, A2> => swapWith_(stm, f)
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 */
export function swapWith_<R, E, A, R2, E2, A2>(stm: STM<R, E, A>, f: (stm: STM<R, A, E>) => STM<R2, A2, E2>) {
  return swap(f(swap(stm)))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @dataFirst flattenErrorOptionWith_
 */
export function flattenErrorOptionWith<E2>(def: () => E2) {
  return <R, E, A>(stm: STM<R, O.Option<E>, A>): STM<R, E | E2, A> => flattenErrorOptionWith_(stm, def)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOptionWith_<R, E, A, E2>(stm: STM<R, O.Option<E>, A>, def: () => E2): STM<R, E | E2, A> {
  return mapError_(stm, O.match(def, identity))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @dataFirst flattenErrorOption_
 */
export function flattenErrorOption<E2>(def: E2) {
  return <R, E, A>(stm: STM<R, O.Option<E>, A>): STM<R, E | E2, A> => flattenErrorOption_(stm, def)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOption_<R, E, A, E2>(stm: STM<R, O.Option<E>, A>, def: E2): STM<R, E | E2, A> {
  return mapError_(
    stm,
    O.match(() => def, identity)
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns a transactional effect that produces a new `ReadonlyArray<B>`.
 */
export function foreach_<A, R, E, B>(it: Iterable<A>, f: (a: A) => STM<R, E, B>): STM<R, E, readonly B[]> {
  return defer(() => {
    let stm = succeed([]) as STM<R, E, B[]>

    for (const a of it) {
      stm = crossWith_(stm, f(a), (acc, b) => {
        acc.push(b)
        return acc
      })
    }

    return stm
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns a transactional effect that produces a new `ReadonlyArray<B>`.
 *
 * @dataFirst foreach_
 */
export function foreach<A, R, E, B>(f: (a: A) => STM<R, E, B>): (it: Iterable<A>) => STM<R, E, readonly B[]> {
  return (stm) => foreach_(stm, f)
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEitherWith<E, A>(e: () => E.Either<E, A>): STM<unknown, E, A> {
  return defer(() => {
    return E.match_(e(), fail, succeed)
  })
}

/**
 * Lifts an `Either` into a `STM`.
 */
export function fromEither<E, A>(e: E.Either<E, A>): STM<unknown, E, A> {
  return E.match_(e, fail, succeed)
}

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 */
export function get<R, E, A>(stm: STM<R, E, O.Option<A>>): STM<R, O.Option<E>, A> {
  return matchSTM_(
    stm,
    (x) => fail(O.some(x)),
    O.match(() => fail(O.none()), succeed)
  )
}

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 */
export function head<R, E, A>(stm: STM<R, E, Iterable<A>>): STM<R, O.Option<E>, A> {
  return matchSTM_(
    stm,
    (x) => fail(O.some(x)),
    (x) => {
      const it   = x[Symbol.iterator]()
      const next = it.next()
      return next.done ? fail(O.none()) : succeed(next.value)
    }
  )
}

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(stm: STM<R, E, A>): STM<R, never, void> {
  return match_(stm, constVoid, constVoid)
}

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(stm: STM<R, E, A>) {
  return match_(
    stm,
    () => true,
    () => false
  )
}

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(stm: STM<R, E, A>) {
  return match_(
    stm,
    () => false,
    () => true
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error `None`.
 */
export function left<R, E, B, C>(stm: STM<R, E, E.Either<B, C>>): STM<R, O.Option<E>, B> {
  return matchSTM_(
    stm,
    (e) => fail(O.some(e)),
    E.match(succeed, () => fail(O.none()))
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 */
export function leftOrFail_<R, E, B, C, E1>(stm: STM<R, E, E.Either<B, C>>, orFail: (c: C) => E1) {
  return chain_(
    stm,
    E.match(succeed, (x) => failLazy(() => orFail(x)))
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @dataFirst leftOrFail_
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(stm: STM<R, E, E.Either<B, C>>) => leftOrFail_(stm, orFail)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with a `NoSuchElementException`.
 */
export function leftOrFailException<R, E, B, C>(stm: STM<R, E, E.Either<B, C>>) {
  return leftOrFail_(stm, () => new NoSuchElementError('STM.leftOrFailException'))
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @dataFirst join_
 */
export function join<R1, E1, A1>(that: STM<R1, E1, A1>) {
  return <R, E, A>(stm: STM<R, E, A>): STM<E.Either<R, R1>, E | E1, A | A1> => {
    return join_(stm, that)
  }
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function join_<R, E, A, R1, E1, A1>(
  stm: STM<R, E, A>,
  that: STM<R1, E1, A1>
): STM<E.Either<R, R1>, E | E1, A | A1> {
  return asksSTM(
    (_: E.Either<R, R1>): STM<unknown, E | E1, A | A1> =>
      E.match_(
        _,
        (r) => giveAll_(stm, r),
        (r1) => giveAll_(that, r1)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  stm: STM<R, E, A>,
  that: STM<R1, E1, A1>
): STM<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return asksSTM(
    (_: E.Either<R, R1>): STM<unknown, E | E1, E.Either<A, A1>> =>
      E.match_(
        _,
        (r) => map_(giveAll_(stm, r), E.left),
        (r1) => map_(giveAll_(that, r1), E.right)
      )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R, E, A, R1, E1, A1>(
  that: STM<R1, E1, A1>
): (stm: STM<R, E, A>) => STM<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return (stm) => joinEither_(stm, that)
}

/**
 * Repeats this `STM` effect until its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatUntil` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryUntil` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually satisfy the predicate.
 */
export function repeatUntil_<R, E, A>(stm: STM<R, E, A>, f: (a: A) => boolean): STM<R, E, A> {
  return chain_(stm, (a) => (f(a) ? succeed(a) : repeatUntil_(stm, f)))
}

/**
 * Repeats this `STM` effect until its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatUntil` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryUntil` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually satisfy the predicate.
 *
 * @dataFirst repeatUntil_
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(stm: STM<R, E, A>) => STM<R, E, A> {
  return (stm) => repeatUntil_(stm, f)
}

/**
 * Repeats this `STM` effect while its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatWhile` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryWhile` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually not satisfy the predicate.
 */
export function repeatWhile_<R, E, A>(stm: STM<R, E, A>, f: (a: A) => boolean): STM<R, E, A> {
  return chain_(stm, (a) => (f(a) ? repeatWhile_(stm, f) : succeed(a)))
}

/**
 * Repeats this `STM` effect while its result satisfies the specified predicate.
 *
 * WARNING:
 * `repeatWhile` uses a busy loop to repeat the effect and will consume a thread until
 * it completes (it cannot yield). This is because STM describes a single atomic
 * transaction which must either complete, retry or fail a transaction before
 * yielding back to the Effect Runtime.
 *
 * - Use `retryWhile` instead if you don't need to maintain transaction state for repeats.
 * - Ensure repeating the STM effect will eventually not satisfy the predicate.
 *
 * @dataFirst repeatWhile_
 */
export function repeatWhile<R, E, A>(f: (a: A) => boolean): (stm: STM<R, E, A>) => STM<R, E, A> {
  return (stm) => repeatWhile_(stm, f)
}

/**
 * Suspends creation of the specified transaction lazily.
 */
export function defer<R, E, A>(f: () => STM<R, E, A>): STM<R, E, A> {
  return flatten(succeedLazy(f))
}

/**
 * "Peeks" at the success of transactional effect.
 */
export function tap_<R, E, A, R1, E1, B>(stm: STM<R, E, A>, f: (a: A) => STM<R1, E1, B>): STM<R1 & R, E | E1, A> {
  return chain_(stm, (a) => as_(f(a), a))
}

/**
 * "Peeks" at the success of transactional effect.
 *
 * @dataFirst tap_
 */
export function tap<A, R1, E1, B>(f: (a: A) => STM<R1, E1, B>): <R, E>(stm: STM<R, E, A>) => STM<R1 & R, E | E1, A> {
  return (stm) => tap_(stm, f)
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeftLazy<A>(a: () => A): STM<unknown, never, E.Either<A, never>> {
  return chain_(succeedLazy(a), (x) => succeed(E.left(x)))
}

/**
 * Returns an effect with the value on the left part.
 */
export function toLeft<A>(a: A): STM<unknown, never, E.Either<A, never>> {
  return succeed(E.left(a))
}
