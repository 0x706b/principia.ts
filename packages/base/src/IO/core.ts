// tracing: off

import type { Async } from '../Async'
import type { Cause } from '../Cause/core'
import type { Chunk } from '../Chunk'
import type { Eval } from '../Eval'
import type { Exit } from '../Exit/core'
import type { Platform } from '../Fiber'
import type { FiberDescriptor, InterruptStatus } from '../Fiber/core'
import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/trace'
import type { Has, Tag } from '../Has'
import type { FiberContext } from '../internal/FiberContext'
import type { Monoid } from '../Monoid'
import type { NonEmptyArray } from '../NonEmptyArray'
import type { Option } from '../Option'
import type { Predicate } from '../Predicate'
import type { HasStruct, HasTuple, ServicesStruct, ServicesTuple } from '../prelude'
import type { Refinement } from '../Refinement'
import type { Supervisor } from '../Supervisor'
import type { Sync } from '../Sync'
import type { FailureReporter, FIO, IO, UIO, URIO } from './primitives'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as A from '../Array/core'
import { runAsyncEnv } from '../Async'
import * as C from '../Cause/core'
import * as Ch from '../Chunk/core'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import { RuntimeException } from '../Exception'
import * as Ex from '../Exit/core'
import { constant, flow, identity, pipe } from '../function'
import { isTag, mergeEnvironments } from '../Has'
import * as I from '../Iterable'
import * as NEA from '../NonEmptyArray'
import * as O from '../Option'
import * as P from '../prelude'
import * as R from '../Record'
import * as S from '../Sync'
import { tuple } from '../tuple'
import {
  Chain,
  CheckDescriptor,
  DeferMaybeWith,
  DeferPartialWith,
  DeferTotalWith,
  EffectAsync,
  EffectPartial,
  EffectTotal,
  Fail,
  Fork,
  GetInterrupt,
  GetPlatform,
  Give,
  Match,
  Read,
  Succeed,
  Supervise,
  Yield
} from './primitives'

export * from './primitives'

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a `IO` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 * @trace call
 */
export function succeed<A>(a: A): IO<unknown, never, A> {
  return new Succeed(a, accessCallTrace())
}

/**
 * Imports a total synchronous effect into a pure `IO` value.
 * The effect must not throw any exceptions. If you wonder if the effect
 * throws exceptions, then do not use this method, use `IO.try`
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function succeedLazy<A>(a: () => A): UIO<A> {
  return new EffectTotal(a)
}

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow: UIO<void> = new Yield()

/**
 * Imports an asynchronous side-effect into a `IO`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function async<R, E, A>(
  register: (k: (_: IO<R, E, A>) => void) => void,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new EffectAsync(
    traceAs(register, (cb) => {
      register(cb)
      return O.none()
    }),
    blockingOn
  )
}

/**
 * Imports an asynchronous effect into a pure `IO`, possibly returning the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function asyncOption<R, E, A>(
  register: (k: (_: IO<R, E, A>) => void) => O.Option<IO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new EffectAsync(register, blockingOn)
}

/**
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`.
 *
 * @trace 0
 */
function try_<A>(effect: () => A): FIO<unknown, A> {
  return new EffectPartial(effect, identity)
}

export { try_ as try }

/**
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`, and mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 * @trace 1
 */
export function tryCatch_<E, A>(effect: () => A, onThrow: (error: unknown) => E): FIO<E, A> {
  return new EffectPartial(effect, onThrow)
}

/**
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`, and mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @dataFirst tryCatch_
 * @trace 0
 */
export function tryCatch<E>(onThrow: (error: unknown) => E): <A>(effect: () => A) => FIO<E, A> {
  return (
    /**
     * @trace 0
     */
    (effect) => tryCatch_(effect, onThrow)
  )
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(try(io))`.
 *
 * @trace 0
 */
export function deferTry<R, E, A>(io: () => IO<R, E, A>): IO<R, unknown, A> {
  return new DeferPartialWith(io, identity)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 *
 * @trace 0
 */
export function deferTryWith<R, E, A>(
  io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>
): IO<R, unknown, A> {
  return new DeferPartialWith(io, identity)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 *
 * @trace 0
 * @trace 1
 */
export function deferTryCatch_<R, E, A, E1>(io: () => IO<R, E, A>, onThrow: (error: unknown) => E1): IO<R, E | E1, A> {
  return new DeferPartialWith(io, onThrow)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 *
 * @trace 0
 */
export function deferTryCatch<E1>(
  onThrow: (error: unknown) => E1
): <R, E, A>(io: () => IO<R, E, A>) => IO<R, E | E1, A> {
  return (
    /**
     * @trace 0
     */
    (io) => deferTryCatch_(io, onThrow)
  )
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 *
 * @trace 0
 * @trace 1
 */
export function deferTryCatchWith_<R, E, A, E1>(
  io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>,
  onThrow: (error: unknown) => E1
): IO<R, E | E1, A> {
  return new DeferPartialWith(io, onThrow)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 *
 * @dataFirst deferTryCatchWith_
 * @trace 0
 */
export function deferTryCatchWith<E1>(onThrow: (error: unknown) => E1) {
  /**
   * @trace 0
   */
  return <R, E, A>(io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>): IO<R, E | E1, A> =>
    deferTryCatchWith_(io, onThrow)
}

/**
 * @trace 0
 */
export function deferMaybeWith<E, A, R, E1, A1>(
  io: (platform: Platform<unknown>, id: FiberId) => E.Either<Exit<E, A>, IO<R, E1, A1>>
): IO<R, E | E1, A | A1> {
  return new DeferMaybeWith(io)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is required (i.e., when R == unknown)
 * it is conceptually equivalent to `flatten(succeedWith(io))`. If you wonder if the effect throws exceptions,
 * do not use this method, use `IO.deferTryCatch`.
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function defer<R, E, A>(io: () => IO<R, E, A>): IO<R, E, A> {
  return new DeferTotalWith(io)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is required (i.e., when R == unknown)
 * it is conceptually equivalent to `flatten(effectTotal(io))`. If you wonder if the effect throws exceptions,
 * do not use this method, use `IO.deferTryCatchWith`.
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function deferWith<R, E, A>(io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>): IO<R, E, A> {
  return new DeferTotalWith(io)
}

/**
 * Returns the `FiberId` of the `Fiber` on which this `IO` is running
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fiberId(): IO<unknown, never, FiberId> {
  return descriptorWith((d) => succeed(d.id))
}

/**
 * Checks the current `Platform`
 */
export function platform<R, E, A>(f: (p: Platform<unknown>) => IO<R, E, A>): IO<R, E, A> {
  return new GetPlatform(f)
}

/**
 * Creates a `IO` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 * @trace call
 */
export function halt<E>(cause: C.Cause<E>): FIO<E, never> {
  const trace = accessCallTrace()
  return new Fail(traceFrom(trace, () => cause))
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 * This version takes in a lazily-evaluated trace that can be attached to the `Cause`
 * via `Cause.Traced`.
 *
 * @trace 0
 */
export function haltWithTrace<E>(cause: (_: () => Trace) => Cause<E>): FIO<E, never> {
  return new Fail(cause)
}

/**
 * Returns an effect that models failure with the specified lazily-evaluated `Cause`.
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function haltLazy<E = never, A = never>(cause: () => Cause<E>): IO<unknown, E, A> {
  return haltWithTrace(cause)
}

/**
 * Creates a `IO` that has failed with value `e`. The moral equivalent of `throw`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace call
 */
export function fail<E = never, A = never>(e: E): IO<unknown, E, A> {
  const trace = accessCallTrace()
  return haltWithTrace(traceFrom(trace, (trace) => C.traced(C.fail(e), trace())))
}

/**
 * Creates a `IO` that has failed with lazily-evaluated value `e`. The moral equivalent of `throw`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function failLazy<E = never, A = never>(e: () => E): IO<unknown, E, A> {
  return haltWithTrace(traceAs(e, (trace) => C.traced(C.fail(e()), trace())))
}

/**
 * Creates an `IO` that has died with the specified defect
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace call
 */
export function die(e: unknown): UIO<never> {
  const trace = accessCallTrace()
  return haltWithTrace(traceFrom(trace, (trace) => C.traced(C.die(e), trace())))
}

/**
 * Creates an `IO` that dies with the specified lazily-evaluated defect.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function dieLazy<E = never, A = never>(e: () => unknown): IO<unknown, E, A> {
  return haltWithTrace(traceAs(e, (trace) => C.traced(C.die(e()), trace())))
}

/**
 * Returns an IO that dies with a `RuntimeException` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string): FIO<never, never> {
  return die(new RuntimeException(message))
}

/**
 * Creates a `IO` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 * @trace call
 */
export function done<E, A>(exit: Exit<E, A>): FIO<E, A> {
  const trace = accessCallTrace()
  return Ex.match_(exit, (cause) => traceCall(halt, trace)(cause), succeed)
}

/**
 * Creates a `IO` from a lazily-evaluated exit value
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function doneLazy<E, A>(exit: () => Exit<E, A>): FIO<E, A> {
  return defer(traceAs(exit, () => Ex.match_(exit(), halt, succeed)))
}

/**
 * Lifts an `Either` into an `IO`
 *
 * @trace 0
 */
export function fromEitherLazy<E, A>(f: () => E.Either<E, A>): IO<unknown, E, A> {
  return chain_(succeedLazy(f), E.match(fail, succeed))
}

/**
 * Lifts an `Either` into an `IO`
 *
 * @trace call
 */
export function fromEither<E, A>(either: E.Either<E, A>): IO<unknown, E, A> {
  const trace = accessCallTrace()
  return E.match_(either, (e) => traceCall(fail, trace)(e), succeed)
}

/**
 * Lifts an `Eval` into an `IO`
 */
export function fromEval<A>(ma: Eval<A>): IO<unknown, never, A> {
  const trace = accessCallTrace()
  return succeedLazy(traceFrom(trace, () => ma.value))
}

/**
 * Lifts an `Option` into an `IO` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 *
 * @trace 0
 */
export function fromOptionLazy<A>(m: () => Option<A>): FIO<Option<never>, A> {
  return chain_(
    succeedLazy(m),
    O.match(() => fail(O.none()), succeed)
  )
}

/**
 * @trace call
 */
export function fromOption<A = never>(option: Option<A>): IO<unknown, Option<never>, A> {
  const trace = accessCallTrace()
  return O.match_(option, () => traceCall(fail, trace)(O.none()), succeed)
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 *
 * @trace 0
 * @trace 1
 */
export function fromPromiseCatch_<E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): FIO<E, A> {
  return async((resolve) => {
    promise().then(flow(succeed, resolve)).catch(flow(onReject, fail, resolve))
  })
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 *
 * @dataFirst fromPromiseCatch_
 * @trace 0
 */
export function fromPromiseCatch<E>(onReject: (reason: unknown) => E) {
  return (
    /**
     * @trace 0
     */
    <A>(promise: () => Promise<A>): FIO<E, A> => fromPromiseCatch_(promise, onReject)
  )
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 *
 * @trace 0
 */
export function fromPromise<A>(promise: () => Promise<A>): FIO<unknown, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(fail, resolve))
  })
}

/**
 * Like fromPromise but produces a defect in case of errors
 *
 * @trace 0
 */
export function fromPromiseDie<A>(promise: () => Promise<A>): FIO<never, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve))
  })
}

/**
 * Lifts a `Sync` computation into an `IO`
 *
 * @trace call
 */
export function fromSync<R, E, A>(effect: Sync<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return asksIO(traceAs(trace, (_: R) => pipe(effect, S.giveAll(_), S.runEither, E.match(fail, succeed))))
}

/**
 * Lifts an `Async` computation into an `IO`
 *
 * @trace call
 */
export function fromAsync<R, E, A>(effect: Async<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return asksIO(
    traceAs(trace, (_: R) =>
      async<unknown, E, A>((k) => {
        runAsyncEnv(effect, _, (ex) => {
          switch (ex._tag) {
            case 'Success': {
              k(succeed(ex.value))
              break
            }
            case 'Failure': {
              k(fail(ex.error))
              break
            }
            case 'Interrupt': {
              k(descriptorWith((d) => halt(C.interrupt(d.id))))
              break
            }
          }
        })
      })
    )
  )
}

/**
 *
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised_<R, E, A>(fa: IO<R, E, A>, supervisor: Supervisor<any>): IO<R, E, A> {
  return new Supervise(fa, supervisor)
}

/**
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst supervised_
 */
export function supervised(supervisor: Supervisor<any>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => supervised_(fa, supervisor)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Sequential Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 *
 * @trace call
 */
export const pure: <R = unknown, E = never, A = never>(a: A) => IO<R, E, A> = succeed

/*
 * -------------------------------------------------------------------------------------------------
 * Sequential Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @trace call
 */
export function cross_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, fb: IO<R1, E1, B>): IO<R1 & R, E1 | E, readonly [A, B]> {
  const trace = accessCallTrace()
  return traceFrom(trace, crossWith_)(fa, fb, tuple)
}

/**
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst cross_
 * @trace call
 */
export function cross<R1, E1, B>(fb: IO<R1, E1, B>): <R, E, A>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, readonly [A, B]> {
  const trace = accessCallTrace()
  return (fa) => traceCall(cross_, trace)(fa, fb)
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 *
 * @trace call
 */
export function ap_<R, E, A, R1, E1, B>(fab: IO<R1, E1, (a: A) => B>, fa: IO<R, E, A>): IO<R1 & R, E1 | E, B> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst ap_
 * @trace call
 */
export function ap<R, E, A>(fa: IO<R, E, A>): <R1, E1, B>(fab: IO<R1, E1, (a: A) => B>) => IO<R1 & R, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * @trace call
 */
export function crossFirst_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, fb: IO<R1, E1, B>): IO<R1 & R, E1 | E, A> {
  return chain_(fa, (a) => map_(fb, () => a))
}

/**
 * @dataFirst crossFirst_
 * @trace call
 */
export function crossFirst<R1, E1, B>(fb: IO<R1, E1, B>): <R, E, A>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 *
 * @trace call
 */
export function crossSecond_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, fb: IO<R1, E1, B>): IO<R1 & R, E1 | E, B> {
  return chain_(fa, () => fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst crossSecond_
 * @trace call
 */
export function crossSecond<R1, E1, B>(fb: IO<R1, E1, B>): <R, E, A>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

/**
 * @trace 2
 */
export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: IO<R, E, A>,
  fb: IO<R1, E1, B>,
  f: (a: A, b: B) => C
): IO<R1 & R, E1 | E, C> {
  return chain_(fa, (ra) =>
    map_(
      fb,
      traceAs(f, (rb) => f(ra, rb))
    )
  )
}

/**
 * @dataFirst crossWith_
 * @trace 1
 */
export function crossWith<A, R1, E1, B, C>(
  fb: IO<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function bimap_<R, E, A, E1, B>(pab: IO<R, E, A>, f: (e: E) => E1, g: (a: A) => B): IO<R, E1, B> {
  return matchIO_(pab, traceAs(f, flow(f, fail)), traceAs(g, flow(g, succeed)))
}

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @dataFirst bimap_
 * @trace 0
 * @trace 1
 */
export function bimap<E, E1, A, B>(f: (e: E) => E1, g: (a: A) => B): <R>(pab: IO<R, E, A>) => IO<R, E1, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @trace 1
 */
export function mapError_<R, E, A, E1>(fea: IO<R, E, A>, f: (e: E) => E1): IO<R, E1, A> {
  return matchCauseIO_(fea, traceAs(f, flow(C.map(f), halt)), succeed)
}

/**
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 *
 * @dataFirst mapError_
 * @trace 0
 */
export function mapError<E, E1>(f: (e: E) => E1): <R, A>(fea: IO<R, E, A>) => IO<R, E1, A> {
  return (fea) => mapError_(fea, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonadExcept
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an `IO` that submerges an `Either` into the `IO`.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function subsumeEither<R, E, E1, A>(ma: IO<R, E, E.Either<E1, A>>): IO<R, E | E1, A> {
  const trace = accessCallTrace()
  return chain_(ma, traceFrom(trace, E.match(fail, succeed)))
}

/**
 * Folds an `IO` that may fail with `E` or succeed with `A` into one that never fails but succeeds with `Either<E, A>`
 *
 * @trace call
 */
export function either<R, E, A>(ma: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  const trace = accessCallTrace()
  return traceFrom(trace, match_)(ma, E.left, E.right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A more powerful version of `matchIO_` that allows recovering from any kind of failure except interruptions.
 *
 * @trace 1
 * @trace 2
 */
export function matchCauseIO_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Match(ma, onFailure, onSuccess)
}

/**
 * A more powerful version of `matchIO` that allows recovering from any kind of failure except interruptions.
 *
 * @dataFirst matchCauseIO_
 * @trace 0
 * @trace 1
 */
export function matchCauseIO<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => new Match(ma, onFailure, onSuccess)
}

/**
 * @trace 1
 * @trace 2
 */
export function matchIO_<R, R1, R2, E, E1, E2, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return matchCauseIO_(
    ma,
    traceAs(onFailure, (cause) => E.match_(C.failureOrCause(cause), onFailure, halt)),
    onSuccess
  )
}

/**
 * @dataFirst matchIO_
 * @trace 0
 * @trace 1
 */
export function matchIO<R1, R2, E, E1, E2, A, A1, A2>(
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => matchIO_(ma, onFailure, onSuccess)
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match_`.
 *
 * @trace 1
 * @trace 2
 */
export function match_<R, E, A, B, C>(
  fa: IO<R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): IO<R, never, B | C> {
  return matchIO_(fa, traceAs(onFailure, flow(onFailure, succeed)), traceAs(onSuccess, flow(onSuccess, succeed)))
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match`.
 *
 * @dataFirst match_
 * @trace 0
 * @trace 1
 */
export function match<E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: IO<R, E, A>) => IO<R, never, B | C> {
  return (ma) => match_(ma, onFailure, onSuccess)
}

/**
 * A more powerful version of `match_` that allows recovering from any kind of failure except interruptions.
 *
 * @trace 1
 * @trace 2
 */
export function matchCause_<R, E, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): IO<R, never, A1 | A2> {
  return matchCauseIO_(ma, traceAs(onFailure, flow(onFailure, succeed)), traceAs(onSuccess, flow(onSuccess, pure)))
}

/**
 * A more powerful version of `match` that allows recovering from any kind of failure except interruptions.
 *
 * @dataFirst matchCause_
 * @trace 0
 * @trace 1
 */
export function matchCause<E, A, A1, A2>(
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): <R>(ma: IO<R, E, A>) => IO<R, never, A1 | A2> {
  return (ma) => matchCause_(ma, onFailure, onSuccess)
}

/**
 * A version of `foldM` that gives you the (optional) trace of the error.
 *
 * @trace 1
 * @trace 2
 */
export function matchTraceIO_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  onFailure: (e: E, trace: O.Option<Trace>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return matchCauseIO_(
    ma,
    traceAs(
      onFailure,
      flow(
        C.failureTraceOrCause,
        E.match(([e, trace]) => onFailure(e, trace), halt)
      )
    ),
    onSuccess
  )
}

/**
 * A version of `foldM` that gives you the (optional) trace of the error.
 *
 * @dataFirst matchTraceIO_
 * @trace 0
 * @trace 1
 */
export function matchTraceIO<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: E, trace: O.Option<Trace>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => matchTraceIO_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor IO
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 *
 * @trace 1
 */
export function map_<R, E, A, B>(fa: IO<R, E, A>, f: (a: A) => B): IO<R, E, B> {
  return chain_(fa, (a) => succeed(f(a)))
}

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 *
 * @dataFirst map_
 * @trace 0
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: IO<R, E, A>) => IO<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 *
 * @trace 1
 */
export function chain_<R, E, A, R1, E1, B>(ma: IO<R, E, A>, f: (a: A) => IO<R1, E1, B>): IO<R & R1, E | E1, B> {
  return new Chain(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst chain_
 * @trace 0
 */
export function chain<A, R1, E1, B>(f: (a: A) => IO<R1, E1, B>): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, B> {
  return (ma) => chain_(ma, f)
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @trace 1
 * @trace 2
 */
export function bitap_<R, E, A, R1, E1, R2, E2>(
  fa: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
): IO<R & R1 & R2, E | E1 | E2, A> {
  return matchCauseIO_(
    fa,
    (c) =>
      E.match_(
        C.failureOrCause(c),
        (e) => chain_(onFailure(e), () => halt(c)),
        (_) => halt(c)
      ),
    (a) => pipe(onSuccess(a), crossSecond(succeed(a)))
  )
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @dataFirst bitap_
 * @trace 0
 * @trace 1
 */
export function bitap<E, A, R1, E1, R2, E2>(
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
): <R>(fa: IO<R, E, A>) => IO<R & R1 & R2, E | E1 | E2, A> {
  return (fa) => bitap_(fa, onFailure, onSuccess)
}

/**
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<R, E, R1, E1, A>(ffa: IO<R, E, IO<R1, E1, A>>): IO<R & R1, E | E1, A> {
  return chain_(ffa, identity)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 *
 * @trace 1
 */
export function tap_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, f: (a: A) => IO<R1, E1, B>): IO<R1 & R, E1 | E, A> {
  return chain_(
    fa,
    traceAs(f, (a) =>
      pipe(
        f(a),
        map(() => a)
      )
    )
  )
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst tap_
 * @trace 0
 */
export function tap<A, R1, E1, B>(f: (a: A) => IO<R1, E1, B>): <R, E>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, A> {
  return (fa) => tap_(fa, f)
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 *
 * @trace 1
 */
export function tapError_<R, E, A, R1, E1>(fa: IO<R, E, A>, f: (e: E) => IO<R1, E1, any>) {
  return matchCauseIO_(
    fa,
    (c) =>
      E.match_(
        C.failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    pure
  )
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 *
 * @dataFirst tapError_
 * @trace 0
 */
export function tapError<E, R1, E1>(f: (e: E) => IO<R1, E1, any>): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => tapError_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace 0
 */
export function asks<R, A>(f: (_: R) => A): URIO<R, A> {
  return new Read(traceAs(f, (_: R) => new Succeed(f(_))))
}

/**
 * Effectfully accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace 0
 */
export function asksIO<R0, R, E, A>(f: (r: R0) => IO<R, E, A>): IO<R & R0, E, A> {
  return new Read(f)
}

/**
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace call
 */
export function giveAll_<R, E, A>(ma: IO<R, E, A>, r: R): FIO<E, A> {
  const trace = accessCallTrace()
  return new Give(ma, r, trace)
}

/**
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @dataFirst giveAll_
 * @trace call
 */
export function giveAll<R>(r: R): <E, A>(ma: IO<R, E, A>) => IO<unknown, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(giveAll_, trace)(ma, r)
}

/**
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace 1
 */
export function gives_<R0, R, E, A>(ma: IO<R, E, A>, f: (r0: R0) => R) {
  return asksIO(traceAs(f, (r0: R0) => giveAll_(ma, f(r0))))
}

/**
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @dataFirst gives_
 * @trace 0
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: IO<R, E, A>) => IO<R0, E, A> {
  return (ma) => gives_(ma, f)
}

/**
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace call
 */
export function give_<E, A, R = unknown, R0 = unknown>(ma: IO<R & R0, E, A>, r: R): IO<R0, E, A> {
  const trace = accessCallTrace()
  return traceFrom(trace, gives_)(ma, (r0) => ({ ...r0, ...r }))
}

/**
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @dataFirst give_
 * @trace call
 */
export function give<R = unknown>(r: R): <E, A, R0 = unknown>(ma: IO<R & R0, E, A>) => IO<R0, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(give_, trace)(ma, r)
}

/**
 * @trace call
 */
export function ask<R>(): IO<R, never, R> {
  const trace = accessCallTrace()
  return asks(traceFrom(trace, (_: R) => _))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @trace call
 */
export function unit(): UIO<void> {
  const trace = accessCallTrace()
  return traceCall(succeed, trace)(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Do
 * -------------------------------------------------------------------------------------------------
 */

const of: UIO<{}> = succeed({})
export { of as do }

/**
 * @trace 2
 */
export function chainS_<R, E, K, N extends string, R1, E1, A1>(
  mk: IO<R, E, K>,
  name: Exclude<N, keyof K>,
  f: (_: K) => IO<R1, E1, A1>
): IO<R & R1, E | E1, { [k in N | keyof K]: k extends keyof K ? K[k] : A1 }> {
  return chain_(
    mk,
    traceAs(f, (a) =>
      pipe(
        f(a),
        map((b) => Object.assign(a, { [name]: b }) as any)
      )
    )
  )
}

/**
 * @trace 1
 */
export function chainS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => IO<R, E, A>
): <R2, E2>(
  mk: IO<R2, E2, K>
) => IO<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> {
  return chain(
    traceAs(f, (a) =>
      pipe(
        f(a),
        map((b) => Object.assign(a, { [name]: b }) as any)
      )
    )
  )
}

/**
 * @trace call
 */
export function toS_<R, E, A, N extends string>(ma: IO<R, E, A>, name: N): IO<R, E, { [k in N]: A }> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, (a) => ({ [name]: a } as any))
  )
}

/**
 * @trace call
 */
export function toS<N extends string>(name: N): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, { [k in N]: A }> {
  const trace = accessCallTrace()
  return (fa) =>
    map_(
      fa,
      traceFrom(trace, (a) => ({ [name]: a } as any))
    )
}

/**
 * @trace 2
 */
export function pureS_<R, E, K, N extends string, A>(
  mk: IO<R, E, K>,
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): IO<R, E, { [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return chainS_(mk, name, traceAs(f, flow(f, succeed)))
}

/**
 * @trace 1
 */
export function pureS<K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) {
  return chainS(name, traceAs(f, flow(f, succeed)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function absorbWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => unknown) {
  return pipe(ma, sandbox, matchIO(traceAs(f, flow(C.squash(f), fail)), pure))
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst absorbWith_
 * @trace 0
 */
export function absorbWith<E>(f: (e: E) => unknown): <R, A>(ma: IO<R, E, A>) => IO<R, unknown, A> {
  return (ma) => absorbWith_(ma, f)
}

/**
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function as_<R, E, A, B>(ma: IO<R, E, A>, b: B): IO<R, E, B> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, () => b)
  )
}

/**
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function as<B>(b: B): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(as_, trace)(ma, b)
}

/**
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function asLazy_<R, E, A, B>(ma: IO<R, E, A>, b: () => B): IO<R, E, B> {
  return map_(
    ma,
    traceAs(b, () => b())
  )
}

/**
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst asLazy_
 * @trace 0
 */
export function asLazy<B>(b: () => B): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, B> {
  return (ma) => asLazy_(ma, b)
}

/**
 * Maps the success value of this effect to an optional value.
 *
 * @trace call
 */
export function asSome<R, E, A>(ma: IO<R, E, A>): IO<R, E, Option<A>> {
  const trace = accessCallTrace()
  return traceCall(map_, trace)(ma, O.some)
}

/**
 * Maps the error value of this IO to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function asSomeError<R, E, A>(ma: IO<R, E, A>): IO<R, O.Option<E>, A> {
  const trace = accessCallTrace()
  return mapError_(
    ma,
    traceFrom(trace, (e) => O.some(e))
  )
}

/**
 * Ignores the result of the IO, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export function asUnit<R, E>(ma: IO<R, E, any>): IO<R, E, void> {
  return chain_(ma, () => unit())
}

/**
 * Recovers from the specified error
 *
 * @trace 3
 */
function catch_<N extends keyof E, K extends E[N] & string, R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => IO<R1, E1, A1>
): IO<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return catchAll_(
    ma,
    traceAs(f, (e) => {
      if (tag in e && e[tag] === k) {
        return f(e as any)
      }
      return fail(e as any)
    })
  )
}

/**
 * Recovers from the specified error
 *
 * @dataFirst catch_
 * @trace 2
 */
function _catch<N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => IO<R1, E1, A1>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, Exclude<E, { [n in N]: K }> | E1, A | A1> {
  return (ma) => catch_(ma, tag, k, f)
}
export { _catch as catch }

/**
 * Recovers from the specified error
 *
 * @trace 2
 */
export function catchTag_<K extends E['_tag'] & string, R, E extends { _tag: string }, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => IO<R1, E1, A1>
): IO<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catch_(ma, '_tag', k, f)
}

/**
 * Recovers from the specified error
 *
 * @dataFirst catchTag_
 * @trace 1
 */
export function catchTag<K extends E['_tag'] & string, E extends { _tag: string }, R1, E1, A1>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => IO<R1, E1, A1>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return (ma) => catchTag_(ma, k, f)
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function catchAll_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, f: (e: E) => IO<R1, E1, A1>): IO<R & R1, E1, A | A1> {
  return matchIO_(ma, f, (x) => succeed(x))
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst catchAll_
 * @trace 0
 */
export function catchAll<E, R1, E1, A1>(
  f: (e: E) => IO<R1, E1, A1>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A1 | A> {
  return (ma) => catchAll_(ma, f)
}

/**
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function catchAllCause_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, f: (_: Cause<E>) => IO<R1, E1, A1>) {
  return matchCauseIO_(ma, f, pure)
}

/**
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst catchAllCause_
 * @trace 0
 */
export function catchAllCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => IO<R1, E1, A1>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A1 | A> {
  return (ma) => catchAllCause_(ma, f)
}

/**
 * Recovers from some or all of the error cases.
 *
 * @trace 1
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return matchCauseIO_(
    ma,
    traceAs(
      f,
      (cause): IO<R1, E | E1, A1> =>
        pipe(
          cause,
          C.failureOrCause,
          E.match(
            flow(
              f,
              O.getOrElse(() => halt(cause))
            ),
            halt
          )
        )
    ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchSome_
 * @trace 0
 */
export function catchSome<E, R1, E1, A1>(
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (fa) => catchSome_(fa, f)
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @trace 1
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: Cause<E>) => O.Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return matchCauseIO_(
    ma,
    traceAs(
      f,
      (c): IO<R1, E1 | E, A1> =>
        O.match_(
          f(c),
          () => halt(c),
          (a) => a
        )
    ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @dataFirst catchSomeCause_
 * @trace 0
 */
export function catchSomeCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => O.Option<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (ma) => catchSomeCause_(ma, f)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function catchSomeDefect_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return catchAll_(unrefineWith_(ma, f, fail), (s): IO<R1, E | E1, A1> => s)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst catchSomeDefect_
 * @trace 0
 */
export function catchSomeDefect<R1, E1, A1>(
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (ma) => catchSomeDefect_(ma, f)
}

/**
 * @trace call
 */
export function cause<R, E, A>(ma: IO<R, E, A>): IO<R, never, Cause<E>> {
  const trace = accessCallTrace()
  return matchCauseIO_(
    ma,
    traceFrom(trace, flow(succeed)),
    traceFrom(trace, () => succeed(C.empty))
  )
}

/**
 * @trace call
 */
export function causeAsError<R, E, A>(ma: IO<R, E, A>): IO<R, Cause<E>, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(ma, traceFrom(trace, flow(fail)), traceFrom(trace, flow(succeed)))
}

/**
 * Checks the interrupt status, and produces the IO returned by the
 * specified callback.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 */
export function checkInterruptible<R, E, A>(f: (i: InterruptStatus) => IO<R, E, A>): IO<R, E, A> {
  return new GetInterrupt(f)
}

/**
 * @trace 1
 * @trace 2
 */
export function collect_<R, E, A, E1, A1>(ma: IO<R, E, A>, f: () => E1, pf: (a: A) => Option<A1>): IO<R, E | E1, A1> {
  return collectIO_(ma, f, traceAs(pf, flow(pf, O.map(succeed))))
}

/**
 * @dataFirst collect_
 * @trace 0
 * @trace 1
 */
export function collect<A, E1, A1>(
  f: () => E1,
  pf: (a: A) => Option<A1>
): <R, E>(ma: IO<R, E, A>) => IO<R, E1 | E, A1> {
  return (ma) => collect_(ma, f, pf)
}

/**
 * @trace call
 */
export function collectAll<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreach_(as, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function collectAllUnit<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnit_(as, traceFrom(trace, flow(identity)))
}

/**
 * @trace 1
 * @trace 2
 */
export function collectIO_<R, E, A, R1, E1, A1, E2>(
  ma: IO<R, E, A>,
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1 | E2, A1> {
  return chain_(
    ma,
    traceAs(
      pf,
      (a): IO<R1, E1 | E2, A1> =>
        pipe(
          pf(a),
          O.getOrElse(() => fail(f()))
        )
    )
  )
}

/**
 * @dataFirst collectIO_
 * @trace 0
 * @trace 1
 */
export function collectIO<A, R1, E1, A1, E2>(
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E2 | E, A1> {
  return (ma) => collectIO_(ma, f, pf)
}

/**
 * @trace call
 */
export function compose_<R, E, A, R0, E1>(me: IO<R, E, A>, that: IO<R0, E1, R>): IO<R0, E1 | E, A> {
  const trace = accessCallTrace()
  return chain_(
    that,
    traceFrom(trace, (r) => giveAll_(me, r))
  )
}

/**
 * @dataFirst compose_
 * @trace call
 */
export function compose<R, R0, E1>(that: IO<R0, E1, R>): <E, A>(me: IO<R, E, A>) => IO<R0, E1 | E, A> {
  const trace = accessCallTrace()
  return (me) => traceCall(compose_, trace)(me, that)
}

/**
 * @trace call
 */
export function andThen_<R, E, A, E1, B>(ra: IO<R, E, A>, ab: IO<A, E1, B>): IO<R, E | E1, B> {
  const trace = accessCallTrace()
  return pipe(ra, chain(traceFrom(trace, (a) => giveAll_(ab, a))))
}

/**
 * @dataFirst andThen_
 * @trace call
 */
export function andThen<A, E1, B>(ab: IO<A, E1, B>): <R, E>(ra: IO<R, E, A>) => IO<R, E | E1, B> {
  const trace = accessCallTrace()
  return (ra) => traceCall(andThen_, trace)(ra, ab)
}

export function condIO_<R, R1, E, A>(b: boolean, onTrue: URIO<R, A>, onFalse: URIO<R1, E>): IO<R & R1, E, A> {
  return b ? onTrue : chain_(onFalse, fail)
}

/**
 * @dataFirst condIO_
 */
export function condIO<R, A, R1, E>(onTrue: URIO<R, A>, onFalse: URIO<R1, E>): (b: boolean) => IO<R & R1, E, A> {
  return (b) => condIO_(b, onTrue, onFalse)
}

/**
 * Constructs an IO based on information about the current fiber, such as
 * its identity.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 */
export function descriptorWith<R, E, A>(f: (d: FiberDescriptor) => IO<R, E, A>): IO<R, E, A> {
  return new CheckDescriptor(f)
}

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @category Combinators,
 * @since 1.0.0
 *
 * @trace call
 */
export function descriptor(): IO<unknown, never, FiberDescriptor> {
  const trace = accessCallTrace()
  return descriptorWith(traceFrom(trace, flow(succeed)))
}

/**
 * @trace call
 */
export function duplicate<R, E, A>(wa: IO<R, E, A>): IO<R, E, IO<R, E, A>> {
  const trace = accessCallTrace()
  return extend_(wa, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function errorAsCause<R, E, A>(ma: IO<R, Cause<E>, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return matchIO_(ma, traceFrom(trace, flow(halt)), traceFrom(trace, flow(succeed)))
}

/**
 * @trace call
 */
export function eventually<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  const trace = accessCallTrace()
  return orElse_(
    ma,
    traceFrom(trace, () => traceCall(eventually, trace)(ma))
  )
}

/**
 * @trace 1
 */
export function extend_<R, E, A, B>(wa: IO<R, E, A>, f: (wa: IO<R, E, A>) => B): IO<R, E, B> {
  return matchIO_(
    wa,
    (e) => fail(e),
    traceAs(f, (_) => succeed(f(wa)))
  )
}

/**
 * @dataFirst extend_
 * @trace 0
 */
export function extend<R, E, A, B>(f: (wa: IO<R, E, A>) => B): (wa: IO<R, E, A>) => IO<R, E, B> {
  return (wa) => extend_(wa, f)
}

/**
 * Returns an effect that evaluates the given `Eval`.
 *
 * @trace call
 */
export function evaluate<A>(a: Eval<A>): UIO<A> {
  const trace = accessCallTrace()
  return succeedLazy(traceFrom(trace, () => a.value))
}

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @trace 1
 */
export function filter_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>> {
  return pipe(
    as,
    I.foldl(succeed(Ch.builder<A>()) as IO<R, E, Ch.ChunkBuilder<A>>, (ma, a) =>
      crossWith_(
        ma,
        f(a),
        traceAs(f, (builder, p) => {
          if (p) {
            builder.append(a)
          }
          return builder
        })
      )
    ),
    map((b) => b.result())
  )
}

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @dataFirst filter_
 * @trace 0
 */
export function filter<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filter_(as, f)
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @trace 1
 */
export function filterNot_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>> {
  return filter_(
    as,
    traceAs(
      f,
      flow(
        f,
        map((b) => !b)
      )
    )
  )
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @dataFirst filterNot_
 * @trace 0
 */
export function filterNot<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filterNot_(as, f)
}

/**
 * Applies `or` if the predicate fails.
 *
 * @trace call
 */
export function filterOrElse_<R, E, A, B extends A, R1, E1, A1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  or: (a: Exclude<A, B>) => IO<R1, E1, A1>
): IO<R & R1, E | E1, B | A1>
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1>
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: unknown
): IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return chain_(
    fa,
    (a): IO<R1, E1, A | A1> =>
      predicate(a) ? traceCall(succeed, trace)(a) : defer(traceFrom(trace, () => (or as (a: A) => IO<R1, E1, A1>)(a)))
  )
}

/**
 * Applies `or` if the predicate fails.
 *
 * @dataFirst filterOrElse_
 * @trace call
 */
export function filterOrElse<A, B extends A, R1, E1, A1>(
  refinement: Refinement<A, B>,
  or: (a: Exclude<A, B>) => IO<R1, E1, A1>
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>
export function filterOrElse<A, R1, E1, A1>(
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>
export function filterOrElse<A, R1, E1, A1>(
  predicate: Predicate<A>,
  or: unknown
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrElse_, trace)(fa, predicate, or as (a: A) => IO<R1, E1, A1>)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @trace call
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): IO<R, E, A>
export function filterOrDie_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, dieWith: (a: A) => unknown): IO<R, E, A>
export function filterOrDie_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, dieWith: unknown): IO<R, E, A> {
  const trace = accessCallTrace()
  return filterOrElse_(fa, predicate, traceFrom(trace, flow(dieWith as (a: A) => unknown, die)))
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @dataFirst filterOrDie_
 * @trace call
 */
export function filterOrDie<A, B extends A>(
  refinement: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDie<A>(
  predicate: Predicate<A>,
  dieWith: (a: A) => unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDie<A>(predicate: Predicate<A>, dieWith: unknown): <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrDie_, trace)(fa, predicate, dieWith as (a: A) => unknown)
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 *
 * @trace call
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): IO<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
): IO<R, E, A>
export function filterOrDieMessage_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, message: unknown) {
  const trace = accessCallTrace()
  return traceCall(filterOrDie_, trace)(fa, predicate, (a) => new Error((message as (a: A) => string)(a)))
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 *
 * @dataFirst filterOrDieMessage_
 * @trace call
 */
export function filterOrDieMessage<A, B extends A>(
  refinement: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDieMessage<A>(
  predicate: Predicate<A>,
  message: (a: A) => string
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDieMessage<A>(
  predicate: Predicate<A>,
  message: unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrDieMessage_, trace)(fa, predicate, message as (a: A) => string)
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @trace call
 */
export function filterOrFail_<R, E, A, B extends A, E1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): IO<R, E | E1, B>
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A>
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: unknown
): IO<R, E | E1, A> {
  const trace = accessCallTrace()
  return traceCall(filterOrElse_, trace)(fa, predicate, flow(failWith as (a: A) => E1, fail))
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @dataFirst filterOrFail_
 * @trace call
 */
export function filterOrFail<A, B extends A, E1>(
  refinement: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, B>
export function filterOrFail<A, E1>(
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A>
export function filterOrFail<A, E1>(
  predicate: Predicate<A>,
  failWith: unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrFail_, trace)(fa, predicate, failWith as (a: A) => E1)
}

/**
 * Returns an `IO` that yields the value of the first
 * `IO` to succeed.
 *
 * @trace call
 */
export function firstSuccess<R, E, A>(mas: NonEmptyArray<IO<R, E, A>>): IO<R, E, A> {
  const trace = accessCallTrace()
  return A.foldl_(NEA.tail(mas), NEA.head(mas), (b, a) =>
    orElse_(
      b,
      traceFrom(trace, () => a)
    )
  )
}

/**
 * @trace 1
 */
export function chainError_<R, R1, E, E1, A>(ma: IO<R, E, A>, f: (e: E) => IO<R1, never, E1>): IO<R & R1, E1, A> {
  return swapWith_(ma, chain(f))
}

/**
 * @dataFirst chainError_
 * @trace 0
 */
export function chainError<E, R1, E1>(f: (e: E) => IO<R1, never, E1>): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A> {
  return (ma) => chainError_(ma, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function foreachUnit_<R, E, A, A1>(as: Iterable<A>, f: (a: A) => IO<R, E, A1>): IO<R, E, void> {
  return I.foldMap_(
    P.Monoid<IO<R, E, void>>(
      (x, y) =>
        chain_(
          x,
          traceAs(f, () => y)
        ),
      unit()
    )
  )(as, f as (a: A) => IO<R, E, any>)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foreachUnit_
 * @trace 0
 */
export function foreachUnit<A, R, E, A1>(f: (a: A) => IO<R, E, A1>): (as: Iterable<A>) => IO<R, E, void> {
  return (as) => foreachUnit_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Chunk<B>> {
  return pipe(
    as,
    I.foldl(succeed(Ch.builder()) as IO<R, E, Ch.ChunkBuilder<B>>, (b, a) =>
      crossWith_(b, defer(traceAs(f, () => f(a))), (builder, r) => {
        builder.append(r)
        return builder
      })
    ),
    map((b) => b.result())
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foreach_
 * @trace 0
 */
export function foreach<R, E, A, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, Chunk<B>> {
  return (as) => foreach_(as, f)
}

/**
 * Folds an `Iterable<A>` using an effectful function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 2
 */
export function foldl_<A, B, R, E>(as: Iterable<A>, b: B, f: (b: B, a: A) => IO<R, E, B>): IO<R, E, B> {
  return I.foldl_(as, succeed(b) as IO<R, E, B>, (acc, el) =>
    chain_(
      acc,
      traceAs(f, (a) => f(a, el))
    )
  )
}

/**
 * Folds an `Iterable<A>` using an effectful function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foldl_
 * @trace 1
 */
export function foldl<R, E, A, B>(b: B, f: (b: B, a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, B> {
  return (as) => foldl_(as, b, f)
}

/**
 * Combines an array of `IO`s using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap_<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 1
     */
    <R, E, A>(as: ReadonlyArray<IO<R, E, A>>, f: (a: A) => M): IO<R, E, M> =>
      foldl_(as, M.nat, (x, a) =>
        pipe(
          a,
          map(
            traceAs(
              f,
              flow(f, (y) => M.combine_(x, y))
            )
          )
        )
      )
  )
}

/**
 * Combines an array of `IO`s using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foldMap_
 */
export function foldMap<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M) =>
      <R, E>(as: ReadonlyArray<IO<R, E, A>>): IO<R, E, M> =>
        foldMap_(M)(as, f)
  )
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 2
 */
export function foldr_<A, B, R, E>(as: Iterable<A>, b: UIO<B>, f: (a: A, b: IO<R, E, B>) => IO<R, E, B>): IO<R, E, B> {
  const iterator        = as[Symbol.iterator]()
  const go: IO<R, E, B> = defer(() => {
    const { value: current, done } = iterator.next()
    if (done) {
      return b
    } else {
      return f(current, go)
    }
  })
  return go
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foldr_
 * @trace 1
 */
export function foldr<A, B, R, E>(
  b: UIO<B>,
  f: (a: A, b: IO<R, E, B>) => IO<R, E, B>
): (i: Iterable<A>) => IO<R, E, B> {
  return (i) => foldr_(i, b, f)
}

/**
 * Repeats this effect forever (until the first failure).
 *
 * @trace call
 */
export function forever<R, E, A>(ma: IO<R, E, A>): IO<R, E, never> {
  const trace = accessCallTrace()
  return pipe(ma, crossSecond(yieldNow), chain(traceFrom(trace, () => forever(ma))))
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 *
 * @trace call
 */
export function fork<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return new Fork(ma, O.none(), O.none(), trace)
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 *
 * @trace call
 */
export function forkReport(reportFailure: FailureReporter): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return (ma) => new Fork(ma, O.none(), O.some(reportFailure), trace)
}

/**
 * Unwraps the optional success of an `IO`, but can fail with a `None` value.
 *
 * @trace call
 */
export function get<R, E, A>(ma: IO<R, E, O.Option<A>>): IO<R, O.Option<E>, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(
    ma,
    traceFrom(trace, flow(C.map(O.some), halt)),
    traceFrom(
      trace,
      O.match(() => fail(O.none()), pure)
    )
  )
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function getOrElse_<R, E, A, B>(ma: IO<R, E, Option<A>>, orElse: () => B): IO<R, E, A | B> {
  return pipe(ma, map(traceAs(orElse, flow(O.getOrElse(orElse)))))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst getOrElse_
 * @trace 0
 */
export function getOrElse<B>(orElse: () => B): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R, E, B | A> {
  return (ma) => getOrElse_(ma, orElse)
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function getOrElseIO_<R, E, A, R1, E1, B>(
  ma: IO<R, E, Option<A>>,
  orElse: IO<R1, E1, B>
): IO<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return chain_(ma as IO<R, E, Option<A | B>>, traceFrom(trace, flow(O.map(succeed), O.getOrElse(constant(orElse)))))
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst getOrElseIO_
 * @trace call
 */
export function getOrElseIO<R1, E1, B>(
  orElse: IO<R1, E1, B>
): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R & R1, E1 | E, B | A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(getOrElseIO_, trace)(ma, orElse)
}

/**
 * Lifts an Option into an IO, if the option is `None` it fails with NoSuchElementError.
 *
 * @trace 0
 */
export function getOrFail<A>(option: Option<A>): FIO<NoSuchElementError, A> {
  return getOrFailWith_(
    option,
    traceAs(option, () => new NoSuchElementError('IO.getOrFail'))
  )
}

/**
 * Lifts an Option into an IO. If the option is `None`, fail with `onNone`.
 *
 * @trace 0
 */
export function getOrFailWith_<E, A>(option: Option<A>, onNone: () => E): FIO<E, A> {
  return defer(traceAs(option, () => O.match_(option, () => fail(onNone()), succeed)))
}

/**
 * Lifts an Option into an IO. If the option is `None`, fail with `onNone`.
 *
 * @dataFirst getOrFailWith_
 */
export function getOrFailWith<E>(onNone: () => E) {
  return (
    /**
     * @trace 0
     */
    <A>(option: Option<A>): FIO<E, A> => getOrFailWith_(option, onNone)
  )
}

/**
 * Lifts an Option into a IO, if the option is `None` it fails with Unit.
 *
 * @trace 0
 */
export function getOrFailUnit<A>(option: Option<A>): FIO<void, A> {
  return getOrFailWith_(option, () => undefined)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function ifIO_<R, E, R1, E1, A1, R2, E2, A2>(
  mb: IO<R, E, boolean>,
  onTrue: IO<R1, E1, A1>,
  onFalse: IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  const trace = accessCallTrace()
  return chain_(
    mb,
    traceFrom(trace, (b) => (b ? (onTrue as IO<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse))
  )
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst ifIO_
 * @trace call
 */
export function ifIO<R1, E1, A1, R2, E2, A2>(
  onTrue: IO<R1, E1, A1>,
  onFalse: IO<R2, E2, A2>
): <R, E>(mb: IO<R, E, boolean>) => IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  const trace = accessCallTrace()
  return (mb) => traceCall(ifIO_, trace)(mb, onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function ifIOLazy_<R, E, R1, E1, A1, R2, E2, A2>(
  mb: IO<R, E, boolean>,
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return chain_(mb, (b) =>
    b
      ? defer(traceAs(onTrue, () => onTrue() as IO<R & R1 & R2, E | E1 | E2, A1 | A2>))
      : defer(traceAs(onFalse, () => onFalse()))
  )
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst ifIOLazy_
 * @trace 0
 * @trace 1
 */
export function ifIOLazy<R1, E1, A1, R2, E2, A2>(
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): <R, E>(b: IO<R, E, boolean>) => IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return (b) => ifIOLazy_(b, onTrue, onFalse)
}

/**
 * @trace call
 */
export function if_<R, E, A, R1, E1, A1>(
  b: boolean,
  onTrue: IO<R, E, A>,
  onFalse: IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return traceCall(ifIO_, trace)(succeed(b), onTrue, onFalse)
}

/**
 * @trace call
 */
function _if<R, E, A, R1, E1, A1>(
  onTrue: IO<R, E, A>,
  onFalse: IO<R1, E1, A1>
): (b: boolean) => IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return (b) => traceCall(if_, trace)(b, onTrue, onFalse)
}

export { _if as if }

/**
 * @trace 1
 * @trace 2
 */
export function ifLazy_<R, E, A, R1, E1, A1>(
  b: () => boolean,
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return ifIOLazy_(succeedLazy(b), onTrue, onFalse)
}

/**
 * @dataFirst if_
 * @trace 0
 * @trace 1
 */
export function ifLazy<R, E, A, R1, E1, A1>(
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): (b: () => boolean) => IO<R & R1, E | E1, A | A1> {
  return (b) => ifLazy_(b, onTrue, onFalse)
}

/**
 * Folds a `IO` to a boolean describing whether or not it is a failure
 *
 * @trace call
 */
export function isFailure<R, E, A>(ma: IO<R, E, A>): IO<R, never, boolean> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => true),
    traceFrom(trace, () => false)
  )
}

/**
 * Folds a `IO` to a boolean describing whether or not it is a success
 *
 * @trace call
 */
export function isSuccess<R, E, A>(ma: IO<R, E, A>): IO<R, never, boolean> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => false),
    traceFrom(trace, () => true)
  )
}

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 *
 * @trace 2
 */
export function iterate_<R, E, A>(initial: A, cont: (a: A) => boolean, body: (a: A) => IO<R, E, A>): IO<R, E, A> {
  return cont(initial)
    ? chain_(
        body(initial),
        traceAs(body, (a) => iterate_(a, cont, body))
      )
    : succeed(initial)
}

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 *
 * @dataFirst iterate_
 * @trace 1
 */
export function iterate<R, E, A>(cont: (b: A) => boolean, body: (b: A) => IO<R, E, A>): (initial: A) => IO<R, E, A> {
  return (initial) => iterate_(initial, cont, body)
}

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 *
 * @trace call
 */
export function join_<R, E, A, R1, E1, A1>(io: IO<R, E, A>, that: IO<R1, E1, A1>): IO<E.Either<R, R1>, E | E1, A | A1> {
  const trace = accessCallTrace()
  return asksIO(
    traceFrom(
      trace,
      (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, A | A1> =>
        E.match_(
          _,
          (r) => giveAll_(io, r),
          (r1) => giveAll_(that, r1)
        )
    )
  )
}

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 *
 * @dataFirst join_
 * @trace call
 */
export function join<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(io: IO<R, E, A>) => IO<E.Either<R, R1>, E | E1, A | A1> {
  const trace = accessCallTrace()
  return (io) => traceCall(join_, trace)(io, that)
}

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 *
 * @trace call
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  mb: IO<R1, E1, A1>
): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  const trace = accessCallTrace()
  return asksIO(
    traceFrom(
      trace,
      (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
        E.match_(
          _,
          (r) => map_(giveAll_(ma, r), E.left),
          (r1) => map_(giveAll_(mb, r1), E.right)
        )
    )
  )
}

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 *
 * @dataFirst joinEither_
 * @trace call
 */
export function joinEither<R1, E1, A1>(
  mb: IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(joinEither_, trace)(ma, mb)
}

/**
 *  Returns an IO with the value on the left part.
 *
 *  @trace 0
 */
export function left<A>(a: () => A): UIO<E.Either<A, never>> {
  return chain_(succeedLazy(a), flow(E.left, pure))
}

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```typescript
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 *
 * @trace 3
 */
export function loop_<A, R, E, B>(
  initial: A,
  cont: (a: A) => boolean,
  inc: (b: A) => A,
  body: (b: A) => IO<R, E, B>
): IO<R, E, ReadonlyArray<B>> {
  if (cont(initial)) {
    return chain_(
      body(initial),
      traceAs(body, (a) =>
        pipe(
          loop_(inc(initial), cont, inc, body),
          map((as) => [a, ...as])
        )
      )
    )
  } else {
    return pure([])
  }
}

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 *
 * @dataFirst loop_
 * @trace 3
 */
export function loopUnit_<A, R, E>(
  initial: A,
  cont: (a: A) => boolean,
  inc: (a: A) => A,
  body: (a: A) => IO<R, E, any>
): IO<R, E, void> {
  if (cont(initial)) {
    return pipe(
      body(initial),
      chain(() => loop_(inc(initial), cont, inc, body)),
      asUnit
    )
  } else {
    return unit()
  }
}

/**
 * @trace 1
 */
export function mapTryCatch_<R, E, A, E1, B>(
  io: IO<R, E, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E1
): IO<R, E | E1, B> {
  return chain_(
    io,
    traceAs(f, (a) => tryCatch_(() => f(a), onThrow))
  )
}

/**
 * @dataFirst mapTryCatch_
 * @trace 0
 */
export function mapTryCatch<A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) {
  return <R, E>(io: IO<R, E, A>): IO<R, E | E1, B> => mapTryCatch_(io, f, onThrow)
}

/**
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function mapErrorCause_<R, E, A, E1>(ma: IO<R, E, A>, f: (cause: Cause<E>) => Cause<E1>): IO<R, E1, A> {
  return matchCauseIO_(ma, traceAs(f, flow(f, halt)), pure)
}

/**
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst mapErrorCause_
 * @trace 0
 */
export function mapErrorCause<E, E1>(f: (cause: Cause<E>) => Cause<E1>) {
  return <R, A>(ma: IO<R, E, A>): IO<R, E1, A> => mapErrorCause_(ma, f)
}

/**
 * @trace call
 */
export function merge<R, E, A>(io: IO<R, E, A>): IO<R, never, A | E> {
  const trace = accessCallTrace()
  return matchIO_(io, traceFrom(trace, flow(succeed)), traceFrom(trace, flow(succeed)))
}

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 *
 * @trace 2
 */
export function mergeAll_<R, E, A, B>(fas: Iterable<IO<R, E, A>>, b: B, f: (b: B, a: A) => B): IO<R, E, B> {
  return I.foldl_(fas, pure(b) as IO<R, E, B>, (b, a) => crossWith_(b, a, f))
}

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 *
 * @dataFirst mergeAll_
 * @trace 1
 */
export function mergeAll<A, B>(b: B, f: (b: B, a: A) => B) {
  return <R, E>(fas: Iterable<IO<R, E, A>>): IO<R, E, B> => mergeAll_(fas, b, f)
}

/**
 * @trace call
 */
export function onLeft<C>(): <R, E, A>(io: IO<R, E, A>) => IO<E.Either<R, C>, E, E.Either<A, C>> {
  const trace = accessCallTrace()
  return (io) => traceCall(joinEither_, trace)(io, ask<C>())
}

/**
 * @trace call
 */
export function onRight<C>(): <R, E, A>(io: IO<R, E, A>) => IO<E.Either<C, R>, E, E.Either<C, A>> {
  const trace = accessCallTrace()
  return (io) => traceCall(joinEither_, trace)(ask<C>(), io)
}

/**
 * @trace call
 */
export function option<R, E, A>(io: IO<R, E, A>): URIO<R, Option<A>> {
  const trace = accessCallTrace()
  return match_(
    io,
    traceFrom(trace, () => O.none()),
    traceFrom(trace, (a) => O.some(a))
  )
}

/**
 * Converts an option on errors into an option on values.
 *
 * @trace call
 */
export function optional<R, E, A>(ma: IO<R, Option<E>, A>): IO<R, E, Option<A>> {
  const trace = accessCallTrace()
  return matchIO_(
    ma,
    traceFrom(
      trace,
      O.match(() => pure(O.none()), fail)
    ),
    flow(O.some, pure)
  )
}

/**
 * @trace call
 */
export function orDie<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  const trace = accessCallTrace()
  return orDieWith_(ma, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function orDieKeep<R, E, A>(ma: IO<R, E, A>): IO<R, unknown, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(ma, traceFrom(trace, flow(C.chain(C.die), halt)), succeed)
}

/**
 * @trace 1
 */
export function orDieWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => unknown): IO<R, never, A> {
  return matchIO_(ma, traceAs(f, flow(f, die)), succeed)
}

/**
 * @dataFirst orDieWith_
 * @trace 0
 */
export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: IO<R, E, A>) => IO<R, never, A> {
  return (ma) => orDieWith_(ma, f)
}

/**
 * @trace 1
 */
export function orElse_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, that: () => IO<R1, E1, A1>): IO<R & R1, E1, A | A1> {
  return tryOrElse_(ma, that, pure)
}

/**
 * @dataFirst orElse_
 * @trace 0
 */
export function orElse<R1, E1, A1>(that: () => IO<R1, E1, A1>): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A1 | A> {
  return (ma) => tryOrElse_(ma, that, pure)
}

/**
 * @trace 1
 */
export function orElseEither_<R, E, A, R1, E1, A1>(
  self: IO<R, E, A>,
  that: () => IO<R1, E1, A1>
): IO<R & R1, E1, E.Either<A, A1>> {
  return tryOrElse_(
    self,
    traceAs(that, () => map_(that(), E.right)),
    (a) => succeed(E.left(a))
  )
}

/**
 * @dataFirst orElseEither_
 * @trace 0
 */
export function orElseEither<R1, E1, A1>(
  that: () => IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1, E.Either<A, A1>> {
  return (ma) => orElseEither_(ma, that)
}

/**
 * @trace 1
 */
export function orElseFail_<R, E, A, E1>(ma: IO<R, E, A>, e: () => E1): IO<R, E1, A> {
  return orElse_(
    ma,
    traceAs(e, () => fail(e()))
  )
}

/**
 * @dataFirst orElseFail_
 * @trace 0
 */
export function orElseFail<E1>(e: () => E1): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => orElseFail_(fa, e)
}

/**
 * @trace 1
 */
export function orElseOption_<R, E, A, R1, E1, A1>(
  ma: IO<R, Option<E>, A>,
  that: () => IO<R1, Option<E1>, A1>
): IO<R & R1, Option<E | E1>, A | A1> {
  return catchAll_(
    ma,
    traceAs(
      that,
      O.match(that, (e) => fail(O.some<E | E1>(e)))
    )
  )
}

/**
 * @dataFirst orElseOption_
 * @trace 0
 */
export function orElseOption<R1, E1, A1>(
  that: () => IO<R1, Option<E1>, A1>
): <R, E, A>(ma: IO<R, Option<E>, A>) => IO<R & R1, Option<E1 | E>, A1 | A> {
  return (ma) => orElseOption_(ma, that)
}

/**
 * @trace 1
 */
export function orElseSucceed_<R, E, A, A1>(ma: IO<R, E, A>, a: () => A1): IO<R, E, A | A1> {
  return orElse_(
    ma,
    traceAs(a, () => pure(a()))
  )
}

/**
 * @dataFirst orElseSucceed_
 * @trace 0
 */
export function orElseSucceed<A1>(a: () => A1): <R, E, A>(self: IO<R, E, A>) => IO<R, E, A1 | A> {
  return (self) => orElseSucceed_(self, a)
}

/**
 * Exposes all parallel errors in a single call
 * @trace call
 */
export function parallelErrors<R, E, A>(io: IO<R, E, A>): IO<R, ReadonlyArray<E>, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(
    io,
    (cause) => {
      const f = C.failures(cause)
      if (f.length === 0) {
        return traceCall(halt, trace)(cause as Cause<never>)
      } else {
        return traceCall(fail, trace)(f)
      }
    },
    succeed
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 *
 * @trace 1
 */
export function partition_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(foreach_(as, traceAs(f, flow(f, either))), I.partitionMap(identity))
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 *
 * @dataFirst partition_
 * @trace 0
 */
export function partition<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (fas: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (fas) => partition_(fas, f)
}

/**
 * Returns an IO that semantically runs the IO on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function result<R, E, A>(ma: IO<R, E, A>): IO<R, never, Exit<E, A>> {
  const trace = accessCallTrace()
  return new Match(
    ma,
    traceFrom(trace, (cause) => succeed(Ex.halt(cause))),
    traceFrom(trace, (a) => succeed(Ex.succeed(a)))
  )
}

/**
 * Attach a wrapping trace pointing to this location in case of error.
 *
 * Useful when joining fibers to make the resulting trace mention
 * the `join` point, otherwise only the traces of joined fibers are
 * included.
 */
export function refailWithTrace<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return matchCauseIO_(ma, (cause) => haltWithTrace((trace) => C.traced(cause, trace())), succeed)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @trace 1
 */
export function refineOrDie_<R, E, A, E1>(fa: IO<R, E, A>, pf: (e: E) => Option<E1>): IO<R, E1, A> {
  return refineOrDieWith_(fa, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @dataFirst refineOrDie_
 * @trace 0
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrDie_(fa, pf)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @trace call
 */
export function refineOrDieWith_<R, E, A, E1>(
  fa: IO<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): IO<R, E1, A> {
  const trace = accessCallTrace()
  return catchAll_(
    fa,
    traceFrom(trace, (e) => O.match_(pf(e), () => die(f(e)), fail))
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `Error`.
 *
 * @dataFirst refineOrDieWith_
 * @trace call
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(refineOrDieWith_, trace)(fa, pf, f)
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function reject_<R, E, A, E1>(fa: IO<R, E, A>, pf: (a: A) => Option<E1>): IO<R, E | E1, A> {
  return rejectIO_(
    fa,
    traceAs(pf, (a) => O.map_(pf(a), fail))
  )
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst reject_
 * @trace 0
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>): <R, E>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => reject_(fa, pf)
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function rejectIO_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  pf: (a: A) => Option<IO<R1, E1, E1>>
): IO<R & R1, E | E1, A> {
  return chain_(
    fa,
    traceAs(pf, (a) => O.match_(pf(a), () => pure(a), chain(fail)))
  )
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst rejectIO_
 * @trace 0
 */
export function rejectIO<R1, E1, A>(
  pf: (a: A) => Option<IO<R1, E1, E1>>
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (fa) => rejectIO_(fa, pf)
}

/**
 * @internal
 */
function _repeatN<R, E, A>(ma: IO<R, E, A>, n: number, __trace: string | undefined): IO<R, E, A> {
  return chain_(
    ma,
    traceAs(__trace, (a) => (n <= 0 ? succeed(a) : _repeatN(ma, n - 1, __trace)))
  )
}
/**
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function repeatN_<R, E, A>(ma: IO<R, E, A>, n: number): IO<R, E, A> {
  const trace = accessCallTrace()
  return _repeatN(ma, n, trace)
}

/**
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst repeatN_
 * @trace call
 */
export function repeatN(n: number): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(repeatN_, trace)(ma, n)
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 *
 * @trace 1
 */
export function repeatUntil_<R, E, A>(ma: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatUntilIO_(ma, traceAs(f, flow(f, succeed)))
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 *
 * @dataFirst repeatUntil_
 * @trace 0
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => repeatUntil_(ma, f)
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 *
 * @trace 1
 */
export function repeatUntilIO_<R, E, A, R1, E1>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return chain_(
    ma,
    traceAs(f, (a) => chain_(f(a), (b) => (b ? pure(a) : repeatUntilIO_(ma, f))))
  )
}

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 *
 * @dataFirst repeatUntilIO_
 * @trace 0
 */
export function repeatUntilIO<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ma) => repeatUntilIO_(ma, f)
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 *
 * @trace 1
 */
export function repeatWhile_<R, E, A>(ma: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatWhileIO_(ma, traceAs(f, flow(f, succeed)))
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 *
 * @dataFirst repeatWhile_
 * @trace 0
 */
export function repeatWhile<A>(f: (a: A) => boolean): <R, E>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => repeatWhile_(ma, f)
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 *
 * @trace 1
 */
export function repeatWhileIO_<R, E, A, R1, E1>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return chain_(
    ma,
    traceAs(f, (a) => chain_(f(a), (b) => (b ? repeatWhileIO_(ma, f) : succeed(a))))
  )
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 *
 * @dataFirst repeatWhileIO_
 * @trace 0
 */
export function repeatWhileIO<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ma) => repeatWhileIO_(ma, f)
}

export function replicate_<R, E, A>(ma: IO<R, E, A>, n: number): ReadonlyArray<IO<R, E, A>> {
  return A.map_(A.range(0, n), () => ma)
}

export function replicate(n: number): <R, E, A>(ma: IO<R, E, A>) => ReadonlyArray<IO<R, E, A>> {
  return (ma) => replicate_(ma, n)
}

/**
 * @trace 1
 */
export function require_<R, E, A>(ma: IO<R, E, O.Option<A>>, error: () => E): IO<R, E, A> {
  return chain_(
    ma,
    traceAs(
      error,
      O.match(() => chain_(succeedLazy(error), fail), succeed)
    )
  )
}

/**
 * @trace 0
 * @dataFirst require_
 */
function _require<E>(error: () => E): <R, A>(ma: IO<R, E, O.Option<A>>) => IO<R, E, A> {
  return (ma) => require_(ma, error)
}

export { _require as require }

/**
 * Recover from the unchecked failure of the `IO`. (opposite of `orDie`)
 *
 * @trace call
 */
export function resurrect<R, E, A>(io: IO<R, E, A>): IO<R, unknown, A> {
  const trace = accessCallTrace()
  return unrefineWith_(io, traceFrom(trace, O.some), identity)
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @trace 1
 */
export function retryUntil_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean): IO<R, E, A> {
  return retryUntilIO_(fa, traceAs(f, flow(f, succeed)))
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 *
 * @dataFirst retryUntil_
 * @trace 0
 */
export function retryUntil<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryUntil_(fa, f)
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 *
 * @trace 1
 */
export function retryUntilIO_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(
    fa,
    traceAs(f, (e) => chain_(f(e), (b) => (b ? fail(e) : retryUntilIO_(fa, f))))
  )
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 *
 * @dataFirst retryUntilIO_
 * @trace 0
 */
export function retryUntilIO<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryUntilIO_(fa, f)
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @trace 1
 */
export function retryWhile_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean) {
  return retryWhileIO_(fa, traceAs(f, flow(f, succeed)))
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @dataFirst retryWhile_
 * @trace 0
 */
export function retryWhile<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryWhile_(fa, f)
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 *
 * @trace 1
 */
export function retryWhileIO_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(
    fa,
    traceAs(f, (e) => chain_(f(e), (b) => (b ? retryWhileIO_(fa, f) : fail(e))))
  )
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 *
 * @dataFirst retryWhileIO_
 * @trace 0
 */
export function retryWhileIO<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryWhileIO_(fa, f)
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function tapCause_<R2, A2, R, E, E2>(
  ma: IO<R2, E2, A2>,
  f: (e: Cause<E2>) => IO<R, E, any>
): IO<R2 & R, E | E2, A2> {
  return matchCauseIO_(
    ma,
    traceAs(f, (c) => chain_(f(c), () => halt(c))),
    succeed
  )
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst tapCause_
 * @trace 0
 */
export function tapCause<R, E, E1>(
  f: (e: Cause<E1>) => IO<R, E, any>
): <R1, A1>(ma: IO<R1, E1, A1>) => IO<R1 & R, E | E1, A1> {
  return (ma) => tapCause_(ma, f)
}

/**
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function sandbox<R, E, A>(fa: IO<R, E, A>): IO<R, Cause<E>, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(fa, traceFrom(trace, flow(fail)), traceFrom(trace, flow(succeed)))
}

/**
 * @trace call
 */
export function sandboxWith_<R, E, A, E1>(
  ma: IO<R, E, A>,
  f: (_: IO<R, Cause<E>, A>) => IO<R, Cause<E1>, A>
): IO<R, E1, A> {
  const trace = accessCallTrace()
  return traceCall(unsandbox, trace)(f(sandbox(ma)))
}

/**
 * @dataFirst sandboxWith_
 * @trace call
 */
export function sandboxWith<R, E, A, E1>(
  f: (_: IO<R, Cause<E>, A>) => IO<R, Cause<E1>, A>
): (ma: IO<R, E, A>) => IO<R, E1, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(sandboxWith_, trace)(ma, f)
}

/**
 * @trace call
 */
export function summarized_<R, E, A, R1, E1, B, C>(
  ma: IO<R, E, A>,
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): IO<R & R1, E | E1, readonly [C, A]> {
  const trace = accessCallTrace()
  return traceCall(
    gen,
    trace
  )(function* (_) {
    const start = yield* _(summary)
    const value = yield* _(ma)
    const end   = yield* _(summary)
    return tuple(f(start, end), value)
  })
}

/**
 * @trace call
 */
export function summarized<R1, E1, B, C>(
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(self: IO<R, E, A>) => IO<R & R1, E1 | E, readonly [C, A]> {
  const trace = accessCallTrace()
  return (self) => traceCall(summarized_, trace)(self, summary, f)
}

/**
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function swap<R, E, A>(pab: IO<R, E, A>): IO<R, A, E> {
  const trace = accessCallTrace()
  return matchIO_(pab, traceFrom(trace, flow(succeed)), traceFrom(trace, flow(fail)))
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function swapWith_<R, E, A, R1, E1, A1>(fa: IO<R, E, A>, f: (ma: IO<R, A, E>) => IO<R1, A1, E1>) {
  const trace = accessCallTrace()
  return traceCall(swap, trace)(f(swap(fa)))
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst swapWith_
 * @trace call
 */
export function swapWith<R, E, A, R1, E1, A1>(
  f: (ma: IO<R, A, E>) => IO<R1, A1, E1>
): (fa: IO<R, E, A>) => IO<R1, E1, A1> {
  const trace = accessCallTrace()
  return (fa) => traceCall(swapWith_, trace)(fa, f)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @trace call
 */
export function timedWith_<R, E, A, R1, E1>(ma: IO<R, E, A>, msTime: IO<R1, E1, number>) {
  const trace = accessCallTrace()
  return traceCall(summarized_, trace)(ma, msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @dataFirst timedWith_
 * @trace call
 */
export function timedWith<R1, E1>(
  msTime: IO<R1, E1, number>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, readonly [number, A]> {
  const trace = accessCallTrace()
  return (ma) => traceCall(timedWith_, trace)(ma, msTime)
}

/**
 * @trace 1
 * @trace 2
 */
export function tryOrElse_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Match(
    ma,
    traceAs(that, (cause) => O.match_(C.keepDefects(cause), that, halt)),
    onSuccess
  )
}

/**
 * @dataFirst tryOrElse_
 * @trace 0
 * @trace 1
 */
export function tryOrElse<A, R1, E1, A1, R2, E2, A2>(
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => tryOrElse_(ma, that, onSuccess)
}

/**
 * When this IO succeeds with a cause, then this method returns a new
 * IO that either fails with the cause that this IO succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @trace call
 */
export function uncause<R, E>(ma: IO<R, never, C.Cause<E>>): IO<R, E, void> {
  const trace = accessCallTrace()
  return chain_(
    ma,
    traceFrom(trace, (a) => (C.isEmpty(a) ? unit() : halt(a)))
  )
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function unrefine_<R, E, A, E1>(fa: IO<R, E, A>, pf: (u: unknown) => Option<E1>) {
  return unrefineWith_(fa, pf, identity)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst unrefine_
 * @trace 0
 */
export function unrefine<E1>(pf: (u: unknown) => Option<E1>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => unrefine_(fa, pf)
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function unrefineWith_<R, E, A, E1, E2>(
  fa: IO<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2
): IO<R, E1 | E2, A> {
  return catchAllCause_(
    fa,
    traceAs(
      pf,
      (cause): IO<R, E1 | E2, A> =>
        pipe(
          cause,
          C.find((c) => (C.died(c) ? pf(c.value) : O.none())),
          O.match(() => pipe(cause, C.map(f), halt), fail)
        )
    )
  )
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst unrefineWith_
 * @trace 0
 * @trace 1
 */
export function unrefineWith<E, E1, E2>(pf: (u: unknown) => Option<E1>, f: (e: E) => E2) {
  return <R, A>(ma: IO<R, E, A>): IO<R, E1 | E2, A> => unrefineWith_(ma, pf, f)
}

/**
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function unsandbox<R, E, A>(ma: IO<R, Cause<E>, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return mapErrorCause_(ma, traceFrom(trace, flow(C.flatten)))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 *
 * @trace call
 */
export function whenIO_<R, E, A, R1, E1>(ma: IO<R, E, A>, mb: IO<R1, E1, boolean>) {
  const trace = accessCallTrace()
  return chain_(
    mb,
    traceFrom(trace, (a) => (a ? asUnit(ma) : unit()))
  )
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 *
 * @dataFirst whenIO_
 * @trace call
 */
export function whenIO<R, E>(mb: IO<R, E, boolean>): <R1, E1, A>(ma: IO<R1, E1, A>) => IO<R & R1, E | E1, void> {
  const trace = accessCallTrace()
  return (ma) => traceCall(whenIO_, trace)(ma, mb)
}

/**
 * @trace 1
 */
export function when_<R, E, A>(ma: IO<R, E, A>, b: () => boolean) {
  return whenIO_(ma, succeedLazy(b))
}

/**
 * @dataFirst when_
 * @trace 0
 */
export function when(b: () => boolean): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, void> {
  return (ma) => when_(ma, b)
}

/**
 * @trace call
 */
export function zipEnvFirst<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [R, A]> {
  const trace = accessCallTrace()
  return traceCall(cross_, trace)(ask<R>(), io)
}

/**
 * @trace call
 */
export function zipEnvSecond<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  const trace = accessCallTrace()
  return traceCall(cross_, trace)(io, ask<R>())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Service
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps the success value of this effect to a service.
 */
export function asService_<R, E, T>(ma: IO<R, E, T>, tag: Tag<T>): IO<R, E, Has<T>> {
  return map_(ma, tag.of)
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService<T>(tag: Tag<T>): <R, E>(ma: IO<R, E, T>) => IO<R, E, Has<T>> {
  return (ma) => asService_(ma, tag)
}

/**
 * Accesses the specified services in the environment of the effect.
 */
export function askServices<SS extends Record<string, Tag<any>>>(s: SS): IO<HasStruct<SS>, never, ServicesStruct<SS>> {
  return asks((r) => R.map_(s, (tag) => tag.read(r as Has<any>)) as any)
}

/**
 * Accesses the specified services in the environment of the effect.
 */
export function askServicesT<SS extends ReadonlyArray<Tag<any>>>(...s: SS): IO<HasTuple<SS>, never, ServicesTuple<SS>> {
  return asks((r) => A.map_(s, (tag) => tag.read(r as Has<any>)) as any)
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesIO<SS extends Record<string, Tag<any>>>(
  s: SS
): <R, E, A>(f: (a: ServicesStruct<SS>) => IO<R, E, A>) => IO<R & HasStruct<SS>, E, A> {
  return (f) => asksIO((r: HasStruct<SS>) => f(R.map_(s, (v) => v.read(r as Has<any>)) as any))
}

export function asksServicesTIO<SS extends ReadonlyArray<Tag<any>>>(
  ...s: SS
): <R, E, A>(f: (...a: ServicesTuple<SS>) => IO<R, E, A>) => IO<R & HasTuple<SS>, E, A> {
  return (f) => asksIO((r: HasTuple<SS>) => f(...(A.map_(s, (v) => v.read(r as Has<any>)) as any)))
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(f: (a: ServicesStruct<SS>) => B) => URIO<HasStruct<SS>, B> {
  return (f) => asks((r: HasStruct<SS>) => f(R.map_(s, (v) => v.read(r as Has<any>)) as any))
}

export function asksServicesT<SS extends ReadonlyArray<Tag<any>>>(
  ...s: SS
): <A>(f: (...a: ServicesTuple<SS>) => A) => URIO<HasTuple<SS>, A> {
  return (f) => asks((r: HasTuple<SS>) => f(...(A.map_(s, (v) => v.read(r as Has<any>)) as any)))
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceIO<T>(s: Tag<T>): <R, E, B>(f: (a: T) => IO<R, E, B>) => IO<R & Has<T>, E, B> {
  return (f) => asksIO((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => IO<Has<T>, never, B> {
  return (f) => asksServiceIO(s)((a) => pure(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): IO<Has<T>, never, T> {
  return asksServiceIO(s)(succeed)
}

export function giveServicesS_<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E, A>(io: IO<R & HasStruct<SS>, E, A>, services: ServicesStruct<SS>): IO<R, E, A> =>
    asksIO((r: R) =>
      giveAll_(
        io,
        Object.assign(
          {},
          r,
          R.ifoldl_(tags, {} as any, (b, k, tag) => mergeEnvironments(tag, b, services[k]))
        )
      )
    )
}

/**
 * Provides the IO with the required services
 */
export function giveServicesS<SS extends Record<string, Tag<any>>>(s: SS) {
  return (services: ServicesStruct<SS>) =>
    <R, E, A>(io: IO<R & HasStruct<SS>, E, A>): IO<R, E, A> =>
      giveServicesS_(s)(io, services)
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesSIO_<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E, A, R1, E1>(
    io: IO<R & HasStruct<SS>, E, A>,
    services: IO<R1, E1, ServicesStruct<SS>>
  ): IO<R & R1, E | E1, A> =>
    asksIO((r: R & R1) =>
      chain_(services, (svcs) =>
        giveAll_(
          io,
          Object.assign(
            {},
            r,
            R.ifoldl_(tags, {} as any, (b, k, tag) => mergeEnvironments(tag, b, svcs[k]))
          )
        )
      )
    )
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesSIO<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E>(services: IO<R, E, ServicesStruct<SS>>) =>
    <R1, E1, A>(io: IO<R1 & HasStruct<SS>, E1, A>): IO<R & R1, E | E1, A> =>
      giveServicesSIO_(tags)(io, services)
}

/**
 * Provides the IO with the required services
 */
export function giveServicesT_<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R, E, A>(io: IO<R & HasTuple<SS>, E, A>, ...services: ServicesTuple<SS>): IO<R, E, A> =>
    asksIO((r: R) =>
      giveAll_(
        io,
        Object.assign(
          {},
          r,
          A.ifoldl_(tags, {} as any, (b, i, tag) => mergeEnvironments(tag, b, services[i]))
        )
      )
    )
}

/**
 * Provides the IO with the required services
 */
export function giveServicesT<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return (...services: ServicesTuple<SS>) =>
    <R, E, A>(io: IO<R & HasTuple<SS>, E, A>): IO<R, E, A> =>
      giveServicesT_<SS>(...tags)<R, E, A>(io, ...services)
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesTIO_<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R, E, A, R1, E1>(
    io: IO<R & HasTuple<SS>, E, A>,
    services: IO<R1, E1, ServicesTuple<SS>>
  ): IO<R & R1, E | E1, A> =>
    asksIO((r: R & R1) =>
      chain_(services, (svcs) =>
        giveAll_(
          io,
          Object.assign(
            {},
            r,
            A.ifoldl_(tags, {} as any, (b, i, tag) => mergeEnvironments(tag, b, svcs[i]))
          )
        )
      )
    )
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesTIO<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R1, E1>(services: IO<R1, E1, ServicesTuple<SS>>) =>
    <R, E, A>(io: IO<R & HasTuple<SS>, E, A>): IO<R1 & R, E1 | E, A> =>
      giveServicesTIO_<SS>(...tags)(io, services)
}

/**
 * Provides the IO with the required service
 */
export function giveService_<T>(tag: Tag<T>) {
  return <R, E, A>(ma: IO<R & Has<T>, E, A>, service: T): IO<R, E, A> => giveServiceIO_(tag)(ma, pure(service))
}

/**
 * Provides the IO with the required service
 */
export function giveService<T>(tag: Tag<T>) {
  return (service: T) =>
    <R, E, A>(ma: IO<R & Has<T>, E, A>): IO<R, E, A> =>
      giveService_(tag)(ma, service)
}

/**
 * Effectfully provides the IO with the required service
 */
export function giveServiceIO_<T>(tag: Tag<T>) {
  return <R, E, A, R1, E1>(ma: IO<R & Has<T>, E, A>, service: IO<R1, E1, T>): IO<R & R1, E | E1, A> =>
    asksIO((r: R & R1) => chain_(service, (t) => giveAll_(ma, mergeEnvironments(tag, r, t))))
}

/**
 * Effectfully provides the IO with the required service
 */
export function giveServiceIO<T>(tag: Tag<T>) {
  return <R1, E1>(service: IO<R1, E1, T>) =>
    <R, E, A>(ma: IO<R & Has<T>, E, A>): IO<R1 & R, E1 | E, A> =>
      giveServiceIO_(tag)(ma, service)
}

/**
 * Replaces the service in the environment
 */
export function updateService_<T>(
  tag: Tag<T>
): <R1, E1, A1>(ma: IO<R1, E1, A1>, f: (service: T) => T) => IO<R1 & Has<T>, E1, A1> {
  return (ma, f) => asksServiceIO(tag)((service) => giveServiceIO_(tag)(ma, pure(f(service))))
}

/**
 * Replaces the service in the environment
 */
export function updateService<T>(
  tag: Tag<T>
): (f: (service: T) => T) => <R, E, A>(ma: IO<R, E, A>) => IO<R & Has<T>, E, A> {
  return (f) => (ma) => asksServiceIO(tag)((service) => giveServiceIO_(tag)(ma, pure(f(service))))
}

/**
 * Effectfully replaces the service in the environment
 */
export function updateServiceIO_<T>(
  tag: Tag<T>
): <R, E, R1, E1, A1>(ma: IO<R1, E1, A1>, f: (service: T) => IO<R, E, T>) => IO<R & R1 & Has<T>, E | E1, A1> {
  return (ma, f) => asksServiceIO(tag)((t) => giveServiceIO_(tag)(ma, f(t)))
}

/**
 * Effectfully replaces the service in the environment
 */
export function updateServiceIO<T>(
  tag: Tag<T>
): <R, E>(f: (service: T) => IO<R, E, T>) => <R1, E1, A1>(ma: IO<R1, E1, A1>) => IO<R & R1 & Has<T>, E1 | E, A1> {
  return (f) => (ma) => asksServiceIO(tag)((t) => giveServiceIO_(tag)(ma, f(t)))
}

/**
 * Effectfully accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on Services' companion objects.
 */
export function serviceWith<T>(_: Tag<T>): <R, E, A>(f: (service: T) => IO<R & Has<T>, E, A>) => IO<R & Has<T>, E, A> {
  return (f) => asksServiceIO(_)(f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

export class GenIO<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly T: IO<R, E, A>, readonly _trace?: string) {}

  *[Symbol.iterator](): Generator<GenIO<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (E.isEither(_)) {
    return new GenIO(
      fromEitherLazy(() => _),
      adapter['$trace']
    )
  }
  if (O.isOption(_)) {
    return new GenIO(__ ? (_._tag === 'None' ? fail(__()) : pure(_.value)) : getOrFail(_), adapter['$trace'])
  }
  if (isTag(_)) {
    return new GenIO(askService(_), adapter['$trace'])
  }
  if (S.isSync(_)) {
    return new GenIO(fromSync(_), adapter['$trace'])
  }
  return new GenIO(_, adapter['$trace'])
}

/**
 * @trace call
 */
export function gen<T extends GenIO<any, any, any>, A>(
  f: (i: {
    /**
     * @trace call
     */
    <A>(_: Tag<A>): GenIO<Has<A>, never, A>
    /**
     * @trace call
     */
    <E, A>(_: Option<A>, onNone: () => E): GenIO<unknown, E, A>
    /**
     * @trace call
     */
    <A>(_: Option<A>): GenIO<unknown, NoSuchElementError, A>
    /**
     * @trace call
     */
    <E, A>(_: E.Either<E, A>): GenIO<unknown, E, A>
    /**
     * @trace call
     */
    <R, E, A>(_: IO<R, E, A>): GenIO<R, E, A>
    /**
     * @trace call
     */
    <R, E, A>(_: Sync<R, E, A>): GenIO<R, E, A>
  }) => Generator<T, A, any>
): IO<P._R<T>, P._E<T>, A>
export function gen(...args: any[]): any {
  const trace = accessCallTrace()
  const _gen  = <T extends GenIO<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): IO<P._R<T>, P._E<T>, A> =>
    defer(
      traceFrom(trace, () => {
        const iterator = f(adapter as any)
        const state    = iterator.next()

        const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): IO<any, any, A> => {
          if (state.done) {
            return pure(state.value)
          }
          const f = (val: any) => {
            const next = iterator.next(val)
            return run(next)
          }
          if (state.value._trace) {
            // eslint-disable-next-line functional/immutable-data
            f['$trace'] = state.value._trace
          }
          return chain_(state.value.T, f)
        }

        return run(state)
      })
    )
  if (args.length === 0) {
    return (f: any) => _gen(f)
  }
  return _gen(args[0])
}

/*
 * -------------------------------------------------------------------------------------------------
 * Derive
 * -------------------------------------------------------------------------------------------------
 */

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
      ? ((...args: ARGS) => IO<R, E, A>) extends T[k]
        ? k
        : never
      : never
  }[keyof T]
>

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
  }[keyof T]
>

export type ShapePu<T> = Omit<
  T,
  | {
      [k in keyof T]: T[k] extends (...args: any[]) => any ? k : never
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
    }[keyof T]
>

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>
> = {
  [k in Fns]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
    ? (...args: ARGS) => IO<R & Has<T>, E, A>
    : never
} &
  {
    [k in Cns]: T[k] extends IO<infer R, infer E, infer A> ? IO<R & Has<T>, E, A> : never
  } &
  {
    [k in Values]: IO<Has<T>, never, T[k]>
  }

export function deriveLifted<T>(
  H: Tag<T>
): <
  Fns extends keyof ShapeFn<T> = never,
  Cns extends keyof ShapeCn<T> = never,
  Values extends keyof ShapePu<T> = never
>(
  functions: Fns[],
  constants: Cns[],
  values: Values[]
) => DerivedLifted<T, Fns, Cns, Values> {
  return (functions, constants, values) => {
    const mut_ret = {} as any

    for (const k of functions) {
      mut_ret[k] = (...args: any[]) => asksServiceIO(H)((h) => h[k](...args))
    }

    for (const k of constants) {
      mut_ret[k] = asksServiceIO(H)((h) => h[k])
    }

    for (const k of values) {
      mut_ret[k] = asksService(H)((h) => h[k])
    }

    return mut_ret as any
  }
}

export type DerivedAsksIO<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => IO<R_, E_, A_>) => IO<R_ & Has<T>, E_, A_>
}

export function deriveAsksIO<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAsksIO<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksServiceIO(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}

export type DerivedAsks<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => IO<Has<T>, never, A_>
}

export function deriveAsks<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAsks<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksService(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}
