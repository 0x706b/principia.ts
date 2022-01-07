// tracing: off

import type { Conc } from '../collection/immutable/Conc'
import type { NonEmptyArray } from '../collection/immutable/NonEmptyArray'
import type { Eval } from '../Eval'
import type { Platform } from '../Fiber'
import type { FiberDescriptor, InterruptStatus } from '../Fiber/core'
import type { FiberContext } from '../Fiber/FiberContext'
import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/Trace'
import type { Has, Tag } from '../Has'
import type * as HKT from '../HKT'
import type { Maybe } from '../Maybe'
import type { Monoid } from '../Monoid'
import type { Predicate } from '../Predicate'
/*
 * import type { Foldable, HasStruct, HasTuple, ServicesStruct, ServicesTuple, Traversable, Witherable } from '../prelude'
 */
import type * as P from '../prelude'
import type { Refinement } from '../Refinement'
import type { Supervisor } from '../Supervisor'
import type { Sync } from '../Sync'
import type { IOF } from '.'
import type { Cause } from './Cause'
import type { Exit } from './Exit/core'
import type { FailureReporter, FIO, IO, UIO, URIO } from './primitives'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as A from '../collection/immutable/Array/core'
import * as Ch from '../collection/immutable/Conc/core'
import * as NEA from '../collection/immutable/NonEmptyArray'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import * as Ev from '../Eval'
import { RuntimeException } from '../Exception'
import { none, showFiberId } from '../Fiber/FiberId'
import { constant, constVoid, flow, identity, pipe } from '../function'
import { isTag, mergeEnvironments } from '../Has'
import * as I from '../Iterable'
import * as M from '../Maybe'
import { Applicative } from '../prelude'
import * as R from '../Record'
import * as S from '../Sync'
import { tuple } from '../tuple/core'
import * as C from './Cause'
import * as Ex from './Exit/core'
import * as Primitives from './primitives'

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
export function succeed<A>(value: A): IO<unknown, never, A> {
  return new Primitives.Succeed(value, accessCallTrace())
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
export function succeedLazy<A>(lazyValue: () => A): UIO<A> {
  return new Primitives.SucceedLazy(lazyValue)
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
export function succeedLazyWith<A>(effect: (platform: Platform<unknown>, fiberId: FiberId) => A): UIO<A> {
  return new Primitives.SucceedLazyWith(effect)
}

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow: UIO<void> = new Primitives.Yield()

/**
 * Imports an asynchronous side-effect into an IO. The side-effect
 * has the option of returning the value synchronously, which is useful in
 * cases where it cannot be determined if the effect is synchronous or
 * asynchronous until the side-effect is actually executed. The effect also
 * has the option of returning a canceler, which will be used by the runtime
 * to cancel the asynchronous effect if the fiber executing the effect is
 * interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called
 * at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @trace 0
 */
export function asyncInterrupt<R, E, A>(
  register: (cb: (resolve: IO<R, E, A>) => void) => E.Either<Primitives.Canceler<R>, IO<R, E, A>>,
  blockingOn: FiberId = none
): IO<R, E, A> {
  return new Primitives.Async(register, blockingOn)
}

/**
 * Imports an asynchronous side-effect into a `IO`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function async<R, E, A>(
  register: (resolve: (_: IO<R, E, A>) => void) => void,
  blockingOn: FiberId = none
): IO<R, E, A> {
  return asyncMaybe(
    traceAs(register, (cb) => {
      register(cb)
      return M.nothing()
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
export function asyncMaybe<R, E, A>(
  register: (resolve: (_: IO<R, E, A>) => void) => M.Maybe<IO<R, E, A>>,
  blockingOn: FiberId = none
): IO<R, E, A> {
  return asyncInterrupt(
    (cb) =>
      pipe(
        register(cb),
        M.match(() => E.left(unit()), E.right)
      ),
    blockingOn
  )
}

/**
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`.
 *
 * @trace 0
 */
function try_<A>(effect: () => A): FIO<unknown, A> {
  return succeedLazy(() => {
    try {
      return effect()
    } catch (u) {
      throw new Primitives.IOError(C.fail(u))
    }
  })
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
export function tryCatch<E, A>(effect: () => A, onThrow: (error: unknown) => E): FIO<E, A> {
  return succeedLazy(() => {
    try {
      return effect()
    } catch (u) {
      throw new Primitives.IOError(C.fail(onThrow(u)))
    }
  })
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(try(io))`.
 *
 * @trace 0
 */
export function deferTry<R, E, A>(io: () => IO<R, E, A>): IO<R, unknown, A> {
  return defer(() => {
    try {
      return io()
    } catch (u) {
      throw new Primitives.IOError(C.fail(u))
    }
  })
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
  return deferWith((platform, id) => {
    try {
      return io(platform, id)
    } catch (u) {
      throw new Primitives.IOError(C.fail(u))
    }
  })
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
export function deferTryCatch<R, E, A, E1>(io: () => IO<R, E, A>, onThrow: (error: unknown) => E1): IO<R, E | E1, A> {
  return defer(() => {
    try {
      return io()
    } catch (u) {
      throw new Primitives.IOError(C.fail(onThrow(u)))
    }
  })
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
export function deferTryCatchWith<R, E, A, E1>(
  io: (platform: Platform<unknown>, id: FiberId) => IO<R, E, A>,
  onThrow: (error: unknown) => E1
): IO<R, E | E1, A> {
  return deferWith((platform, id) => {
    try {
      return io(platform, id)
    } catch (u) {
      throw new Primitives.IOError(C.fail(onThrow(u)))
    }
  })
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
  return new Primitives.Defer(io)
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
  return new Primitives.DeferWith(io)
}

/**
 * Returns the `FiberId` of the `Fiber` on which this `IO` is running
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fiberId: IO<unknown, never, FiberId> = descriptorWith((d) => succeed(d.id))

/**
 * Checks the current `Platform`
 */
export function platform<R, E, A>(f: (p: Platform<unknown>) => IO<R, E, A>): IO<R, E, A> {
  return new Primitives.GetPlatform(f)
}

/**
 * Creates a `IO` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 * @trace call
 */
export function failCause<E>(cause: C.Cause<E>): FIO<E, never> {
  const trace = accessCallTrace()
  return new Primitives.Fail(traceFrom(trace, () => cause))
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 * This version takes in a lazily-evaluated trace that can be attached to the `Cause`
 * via `Cause.Traced`.
 *
 * @trace 0
 */
export function failCauseWithTrace<E>(cause: (_: () => Trace) => Cause<E>): FIO<E, never> {
  return new Primitives.Fail(cause)
}

/**
 * Returns an effect that models failure with the specified lazily-evaluated `Cause`.
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function failCauseLazy<E = never, A = never>(cause: () => Cause<E>): FIO<E, A> {
  return failCauseWithTrace(cause)
}

/**
 * Creates a `IO` that has failed with value `e`. The moral equivalent of `throw`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace call
 */
export function fail<E = never, A = never>(e: E): FIO<E, A> {
  const trace = accessCallTrace()
  return failCauseWithTrace(traceFrom(trace, (trace) => C.traced(C.fail(e), trace())))
}

/**
 * Creates a `IO` that has failed with lazily-evaluated value `e`. The moral equivalent of `throw`
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function failLazy<E = never, A = never>(e: () => E): FIO<E, A> {
  return failCauseWithTrace(traceAs(e, (trace) => C.traced(C.fail(e()), trace())))
}

/**
 * Creates an `IO` that halts with the specified defect
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace call
 */
export function halt(e: unknown): UIO<never> {
  const trace = accessCallTrace()
  return failCauseWithTrace(traceFrom(trace, (trace) => C.traced(C.halt(e), trace())))
}

/**
 * Creates an `IO` that halts with the specified lazily-evaluated defect.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @category Constructors
 * @since 1.0.0
 *
 * @trace 0
 */
export function haltLazy<E = never, A = never>(e: () => unknown): IO<unknown, E, A> {
  return failCauseWithTrace(traceAs(e, (trace) => C.traced(C.halt(e()), trace())))
}

/**
 * Returns an IO that halts with a `RuntimeException` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function haltMessage(message: string): FIO<never, never> {
  return halt(new RuntimeException(message))
}

/**
 * Creates a `IO` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 * @trace call
 */
export function fromExit<E, A>(exit: Exit<E, A>): FIO<E, A> {
  const trace = accessCallTrace()
  return Ex.match_(exit, (cause) => traceCall(failCause, trace)(cause), succeed)
}

/**
 * Creates a `IO` from a lazily-evaluated exit value
 *
 * @category Constructors
 * @since 1.0.0
 * @trace 0
 */
export function fromExitLazy<E, A>(exit: () => Exit<E, A>): FIO<E, A> {
  return defer(traceAs(exit, () => Ex.match_(exit(), failCause, succeed)))
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
  return succeedLazy(traceFrom(trace, () => Ev.run(ma)))
}

/**
 * Lifts a `Maybe` into an `IO` but preserves the error as a `Maybe` in the error channel, making it easier to compose
 * in some scenarios.
 *
 * @trace 0
 */
export function fromMaybeLazy<A>(maybe: () => Maybe<A>): FIO<Maybe<never>, A> {
  return chain_(
    succeedLazy(maybe),
    M.match(() => fail(M.nothing()), succeed)
  )
}

/**
 * @trace call
 */
export function fromMaybe<A = never>(maybe: Maybe<A>): IO<unknown, Maybe<never>, A> {
  const trace = accessCallTrace()
  return M.match_(maybe, () => traceCall(fail, trace)(M.nothing()), succeed)
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 *
 * @trace 0
 * @trace 1
 */
export function fromPromiseCatch<E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): FIO<E, A> {
  return async((resolve) => {
    promise().then(flow(succeed, resolve)).catch(flow(onReject, fail, resolve))
  })
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
export function fromPromiseHalt<A>(promise: () => Promise<A>): FIO<never, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(halt, resolve))
  })
}

/**
 * Lifts a `Sync` computation into an `IO`
 *
 * @trace call
 */
export function fromSync<R, E, A>(effect: Sync<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return asksIO(traceAs(trace, (_: R) => pipe(effect, S.giveAll(_), S.runExit, fromExit)))
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
  return new Primitives.Supervise(fa, supervisor)
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
export function apFirst_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, fb: IO<R1, E1, B>): IO<R1 & R, E1 | E, A> {
  return chain_(fa, (a) => map_(fb, () => a))
}

/**
 * @dataFirst apFirst_
 * @trace call
 */
export function apFirst<R1, E1, B>(fb: IO<R1, E1, B>): <R, E, A>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, A> {
  return (fa) => apFirst_(fa, fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 *
 * @trace call
 */
export function apSecond_<R, E, A, R1, E1, B>(fa: IO<R, E, A>, fb: IO<R1, E1, B>): IO<R1 & R, E1 | E, B> {
  return chain_(fa, () => fb)
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst apSecond_
 * @trace call
 */
export function apSecond<R1, E1, B>(fb: IO<R1, E1, B>): <R, E, A>(fa: IO<R, E, A>) => IO<R1 & R, E1 | E, B> {
  return (fa) => apSecond_(fa, fb)
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
  return matchCauseIO_(fea, traceAs(f, flow(C.map(f), failCause)), succeed)
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
  return new Primitives.Match(ma, onFailure, onSuccess)
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
  return (ma) => new Primitives.Match(ma, onFailure, onSuccess)
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
    traceAs(onFailure, (cause) => E.match_(C.failureOrCause(cause), onFailure, failCause)),
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
  onFailure: (e: E, trace: M.Maybe<Trace>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return matchCauseIO_(
    ma,
    traceAs(
      onFailure,
      flow(
        C.failureTraceOrCause,
        E.match(([e, trace]) => onFailure(e, trace), failCause)
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
  onFailure: (e: E, trace: M.Maybe<Trace>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => matchTraceIO_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
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
  return new Primitives.Chain(ma, f)
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
        (e) => chain_(onFailure(e), () => failCause(c)),
        (_) => failCause(c)
      ),
    (a) => pipe(onSuccess(a), apSecond(succeed(a)))
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
        (e) => chain_(f(e), () => failCause(c)),
        (_) => failCause(c)
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

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 */
export function tapErrorCause_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: Cause<E>) => IO<R1, E1, any>
): IO<R & R1, E | E1, A> {
  return matchCauseIO_(fa, (c) => apSecond_(f(c), failCause(c)), succeed)
}

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 */
export function tapErrorCause<E, R1, E1>(
  f: (e: Cause<E>) => IO<R1, E1, any>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => tapErrorCause_(fa, f)
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
  return new Primitives.Asks(traceAs(f, (_: R) => new Primitives.Succeed(f(_))))
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
  return new Primitives.Asks(f)
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
export function give_<R, E, A>(ma: IO<R, E, A>, r: R): FIO<E, A> {
  const trace = accessCallTrace()
  return new Primitives.Give(ma, r, trace)
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
 * @dataFirst give_
 * @trace call
 */
export function give<R>(r: R): <E, A>(ma: IO<R, E, A>) => IO<unknown, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(give_, trace)(ma, r)
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
  return asksIO(traceAs(f, (r0: R0) => give_(ma, f(r0))))
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
 * leaving the remainder `R0` and combining it Nonematically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @trace call
 */
export function giveSome_<E, A, R = unknown, R0 = unknown>(ma: IO<R & R0, E, A>, r: R): IO<R0, E, A> {
  const trace = accessCallTrace()
  return traceFrom(trace, gives_)(ma, (r0) => ({ ...r0, ...r }))
}

/**
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0` and combining it Nonematically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 *
 * @dataFirst giveSome_
 * @trace call
 */
export function giveSome<R = unknown>(r: R): <E, A, R0 = unknown>(ma: IO<R & R0, E, A>) => IO<R0, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(giveSome_, trace)(ma, r)
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
  return pipe(ma, sandbox, matchIO(traceAs(f, flow(C.squash(showFiberId)(f), fail)), pure))
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
 * Returns the logical conjunction of the `Boolean` value returned by this
 * effect and the `Boolean` value returned by the specified effect. This
 * operator has "short circuiting" behavior so if the value returned by this
 * effect is false the specified effect will not be evaluated.
 *
 * @trace call
 */
export function and_<R, E, R1, E1>(ma: IO<R, E, boolean>, mb: IO<R1, E1, boolean>): IO<R & R1, E | E1, boolean> {
  const trace = accessCallTrace()
  return chain_(
    ma,
    traceFrom(trace, (b) => (b ? mb : succeed(false)))
  )
}

/**
 * Returns the logical conjunction of the `Boolean` value returned by this
 * effect and the `Boolean` value returned by the specified effect. This
 * operator has "short circuiting" behavior so if the value returned by this
 * effect is false the specified effect will not be evaluated.
 *
 * @dataFirst and_
 * @trace call
 */
export function and<R1, E1>(mb: IO<R1, E1, boolean>): <R, E>(ma: IO<R, E, boolean>) => IO<R & R1, E | E1, boolean> {
  return (ma) => and_(ma, mb)
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
export function asJust<R, E, A>(ma: IO<R, E, A>): IO<R, E, Maybe<A>> {
  const trace = accessCallTrace()
  return traceCall(map_, trace)(ma, M.just)
}

/**
 * Maps the error value of this IO to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function asJustError<R, E, A>(ma: IO<R, E, A>): IO<R, M.Maybe<E>, A> {
  const trace = accessCallTrace()
  return mapError_(
    ma,
    traceFrom(trace, (e) => M.just(e))
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
export function catchJust_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (e: E) => M.Maybe<IO<R1, E1, A1>>
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
              M.getOrElse(() => failCause(cause))
            ),
            failCause
          )
        )
    ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchJust_
 * @trace 0
 */
export function catchJust<E, R1, E1, A1>(
  f: (e: E) => M.Maybe<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (fa) => catchJust_(fa, f)
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @trace 1
 */
export function catchJustCause_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: Cause<E>) => M.Maybe<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return matchCauseIO_(
    ma,
    traceAs(
      f,
      (c): IO<R1, E1 | E, A1> =>
        M.match_(
          f(c),
          () => failCause(c),
          (a) => a
        )
    ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @dataFirst catchJustCause_
 * @trace 0
 */
export function catchJustCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => M.Maybe<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (ma) => catchJustCause_(ma, f)
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
export function catchJustDefect_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: unknown) => Maybe<IO<R1, E1, A1>>
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
 * @dataFirst catchJustDefect_
 * @trace 0
 */
export function catchJustDefect<R1, E1, A1>(
  f: (_: unknown) => Maybe<IO<R1, E1, A1>>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (ma) => catchJustDefect_(ma, f)
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
 * @trace 1
 */
export function mapEither_<R, E, A, E1, B>(ma: IO<R, E, A>, f: (a: A) => E.Either<E1, B>): IO<R, E | E1, B> {
  return chain_(
    ma,
    traceAs(f, (a) => fromEither(f(a)))
  )
}

/**
 * @trace 0
 * @dataFirst mapEither_
 */
export function mapEither<A, E1, B>(f: (a: A) => E.Either<E1, B>): <R, E>(ma: IO<R, E, A>) => IO<R, E | E1, B> {
  return (ma) => mapEither_(ma, f)
}

/**
 * @trace 1
 */
export function mapMaybe_<R, E, A, B>(ma: IO<R, E, A>, f: (a: A) => M.Maybe<B>): IO<R, M.Maybe<E>, B> {
  return chain_(
    mapError_(ma, M.just),
    traceAs(f, (a) => fromMaybe(f(a)))
  )
}

/**
 * @trace 0
 * @dataFirst mapMaybe_
 */
export function mapMaybe<A, B>(f: (a: A) => M.Maybe<B>): <R, E>(ma: IO<R, E, A>) => IO<R, M.Maybe<E>, B> {
  return (ma) => mapMaybe_(ma, f)
}

/**
 * @trace 1
 */
export function mapSync_<R, E, A, R1, E1, B>(ma: IO<R, E, A>, f: (a: A) => Sync<R1, E1, B>): IO<R & R1, E | E1, B> {
  return chain_(
    ma,
    traceAs(f, (a) => fromSync(f(a)))
  )
}

/**
 * @trace 0
 * @dataFirst mapSync_
 */
export function mapSync<A, R1, E1, B>(f: (a: A) => Sync<R1, E1, B>): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E | E1, B> {
  return (ma) => mapSync_(ma, f)
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
  return new Primitives.GetInterrupt(f)
}

/**
 * @trace 1
 * @trace 2
 */
export function collect_<R, E, A, E1, A1>(ma: IO<R, E, A>, f: () => E1, pf: (a: A) => Maybe<A1>): IO<R, E | E1, A1> {
  return collectIO_(ma, f, traceAs(pf, flow(pf, M.map(succeed))))
}

/**
 * @dataFirst collect_
 * @trace 0
 * @trace 1
 */
export function collect<A, E1, A1>(f: () => E1, pf: (a: A) => Maybe<A1>): <R, E>(ma: IO<R, E, A>) => IO<R, E1 | E, A1> {
  return (ma) => collect_(ma, f, pf)
}

/**
 * @trace call
 */
export function sequenceIterable<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, Conc<A>> {
  const trace = accessCallTrace()
  return foreach_(as, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function sequenceIterableUnit<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, void> {
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
  pf: (a: A) => Maybe<IO<R1, E1, A1>>
): IO<R & R1, E | E1 | E2, A1> {
  return chain_(
    ma,
    traceAs(
      pf,
      (a): IO<R1, E1 | E2, A1> =>
        pipe(
          pf(a),
          M.getOrElse(() => fail(f()))
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
  pf: (a: A) => Maybe<IO<R1, E1, A1>>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E2 | E, A1> {
  return (ma) => collectIO_(ma, f, pf)
}

/**
 * @trace call
 */
export function compose_<R, E, A, E1, B>(ra: IO<R, E, A>, ab: IO<A, E1, B>): IO<R, E | E1, B> {
  const trace = accessCallTrace()
  return pipe(ra, chain(traceFrom(trace, (a) => give_(ab, a))))
}

/**
 * @dataFirst compose_
 * @trace call
 */
export function compose<A, E1, B>(ab: IO<A, E1, B>): <R, E>(ra: IO<R, E, A>) => IO<R, E | E1, B> {
  const trace = accessCallTrace()
  return (ra) => traceCall(compose_, trace)(ra, ab)
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
  return new Primitives.GetDescriptor(f)
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
 * Returns an IO that, if this IO _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this IO
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the IO's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 *
 * @trace call
 */
export function ensuring_<R, E, A, R1>(ma: IO<R, E, A>, finalizer: IO<R1, never, any>): IO<R & R1, E, A> {
  return new Primitives.Ensuring(ma, finalizer)
}

/**
 * Returns an IO that, if this IO _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this IO
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the IO's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 * @trace call
 */
export function ensuring<R1>(finalizer: IO<R1, never, any>): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(ensuring_, trace)(ma, finalizer)
}

/**
 * @trace call
 */
export function errorAsCause<R, E, A>(ma: IO<R, Cause<E>, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return matchIO_(ma, traceFrom(trace, flow(failCause)), traceFrom(trace, flow(succeed)))
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
  return succeedLazy(traceFrom(trace, () => Ev.run(a)))
}

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @trace 1
 */
export function filter_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>> {
  return pipe(
    as,
    I.foldl(succeed(Ch.builder<A>()) as IO<R, E, Ch.ConcBuilder<A>>, (ma, a) =>
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
export function filter<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Conc<A>> {
  return (as) => filter_(as, f)
}

/**
 * @trace 1
 */
export function ifilterMap_<A, R, E, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => IO<R, E, M.Maybe<B>>
): IO<R, E, Conc<B>> {
  return defer(() => {
    const bs: Array<B> = []
    return pipe(
      as,
      iforeachUnit((i, a) =>
        map_(f(i, a), (b) => {
          if (M.isJust(b)) {
            bs.push(b.value)
          }
        })
      ),
      map(() => Ch.from(bs))
    )
  })
}

/**
 * @trace 0
 */
export function ifilterMap<A, R, E, B>(
  f: (i: number, a: A) => IO<R, E, M.Maybe<B>>
): (as: Iterable<A>) => IO<R, E, Conc<B>> {
  return (as) => ifilterMap_(as, f)
}

/**
 * @trace 1
 */
export function filterMap_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, M.Maybe<B>>): IO<R, E, Conc<B>> {
  return ifilterMap_(
    as,
    traceAs(f, (_, a) => f(a))
  )
}

/**
 * @trace 0
 */
export function filterMap<A, R, E, B>(f: (a: A) => IO<R, E, M.Maybe<B>>): (as: Iterable<A>) => IO<R, E, Conc<B>> {
  return (as) => filterMap_(as, f)
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @trace 1
 */
export function filterNot_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>> {
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
export function filterNot<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Conc<A>> {
  return (as) => filterNot_(as, f)
}

export function wither_<F extends HKT.HKT, C = HKT.None>(W: P.Witherable<F, C>) {
  return <K, Q, W, X, I, S, R, E, A, R1, E1, B>(
    wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => IO<R1, E1, M.Maybe<B>>
  ): IO<R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>> => W.wither_(_Applicative)(wa, f)
}

/**
 * @dataFirst wither_
 */
export function wither<F extends HKT.HKT, C = HKT.None>(W: P.Witherable<F, C>) {
  const witherW_ = wither_(W)
  return <A, R1, E1, B>(f: (a: A) => IO<R1, E1, M.Maybe<B>>) =>
    <K, Q, W, X, I, S, R, E>(
      wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): IO<R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>> =>
      witherW_(wa, f)
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
 * Halts with specified `unknown` if the predicate fails.
 *
 * @trace call
 */
export function filterOrHalt_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  haltWith: (a: Exclude<A, B>) => unknown
): IO<R, E, A>
export function filterOrHalt_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  haltWith: (a: A) => unknown
): IO<R, E, A>
export function filterOrHalt_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, haltWith: unknown): IO<R, E, A> {
  const trace = accessCallTrace()
  return filterOrElse_(fa, predicate, traceFrom(trace, flow(haltWith as (a: A) => unknown, halt)))
}

/**
 * Halts with specified `unknown` if the predicate fails.
 *
 * @dataFirst filterOrHalt_
 * @trace call
 */
export function filterOrHalt<A, B extends A>(
  refinement: Refinement<A, B>,
  haltWith: (a: Exclude<A, B>) => unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrHalt<A>(
  predicate: Predicate<A>,
  haltWith: (a: A) => unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrHalt<A>(predicate: Predicate<A>, haltWith: unknown): <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrHalt_, trace)(fa, predicate, haltWith as (a: A) => unknown)
}

/**
 * Halts with an `Error` having the specified message
 * if the predicate fails.
 *
 * @trace call
 */
export function filterOrHaltMessage_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): IO<R, E, A>
export function filterOrHaltMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
): IO<R, E, A>
export function filterOrHaltMessage_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, message: unknown) {
  const trace = accessCallTrace()
  return traceCall(filterOrHalt_, trace)(fa, predicate, (a) => new Error((message as (a: A) => string)(a)))
}

/**
 * Halts with an `Error` having the specified message
 * if the predicate fails.
 *
 * @dataFirst filterOrHaltMessage_
 * @trace call
 */
export function filterOrHaltMessage<A, B extends A>(
  refinement: Refinement<A, B>,
  message: (a: Exclude<A, B>) => string
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrHaltMessage<A>(
  predicate: Predicate<A>,
  message: (a: A) => string
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrHaltMessage<A>(
  predicate: Predicate<A>,
  message: unknown
): <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(filterOrHaltMessage_, trace)(fa, predicate, message as (a: A) => string)
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

function iforeachUnitLoop<A, R, E, B>(
  iterator: Iterator<A>,
  f: (i: number, a: A) => IO<R, E, B>,
  i = 0
): IO<R, E, void> {
  const next = iterator.next()
  return next.done
    ? unit()
    : chain_(
        f(i, next.value),
        traceAs(f, () => iforeachUnitLoop(iterator, f, i + 1))
      )
}

export function iforeachUnit_<A, R, E, B>(as: Iterable<A>, f: (i: number, a: A) => IO<R, E, B>): IO<R, E, void> {
  return defer(() => iforeachUnitLoop(as[Symbol.iterator](), f))
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
 * @dataFirst iforeachUnit_
 * @trace 0
 */
export function iforeachUnit<A, R, E, A1>(f: (i: number, a: A) => IO<R, E, A1>): (as: Iterable<A>) => IO<R, E, void> {
  return (as) => iforeachUnit_(as, f)
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
export function foreachUnit_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>): IO<R, E, void> {
  return defer(() => iforeachUnitLoop(as[Symbol.iterator](), (_, a) => f(a)))
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
 * returns the results in a new `Conc<B>`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function iforeach_<A, R, E, B>(as: Iterable<A>, f: (i: number, a: A) => IO<R, E, B>): IO<R, E, Conc<B>> {
  return defer(() => {
    const acc: Array<B> = []
    return map_(
      iforeachUnit_(as, (i, a) =>
        map_(f(i, a), (b) => {
          acc.push(b)
        })
      ),
      () => Ch.from(acc)
    )
  })
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
 * @dataFirst iforeach_
 * @trace 0
 */
export function iforeach<R, E, A, B>(f: (i: number, a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, Conc<B>> {
  return (as) => iforeach_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Conc<B>`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Conc<B>> {
  return defer(() => {
    const acc: Array<B> = []
    return map_(
      iforeachUnit_(as, (_, a) =>
        map_(f(a), (b) => {
          acc.push(b)
        })
      ),
      () => Ch.from(acc)
    )
  })
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
export function foreach<R, E, A, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, Conc<B>> {
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
 * Performs an effectful left-associative fold on an arbitrary `Foldable`
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlF_<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  return <K, Q, W, X, I, S, R, E, A, R1, E1, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (b: B, a: A) => IO<R1, E1, B>
  ): IO<R1, E1, B> =>
    F.foldl_(fa, succeed(b) as IO<R1, E1, B>, (acc, a) =>
      chain_(
        acc,
        traceAs(f, (b) => f(b, a))
      )
    )
}

/**
 * Performs an effectful left-associative fold on an arbitrary `Foldable`
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst foldlF_
 */
export function foldlF<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  const foldlFF_ = foldlF_(F)
  return <A, R1, E1, B>(b: B, f: (b: B, a: A) => IO<R1, E1, B>) =>
    <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): IO<R1, E1, B> =>
      foldlFF_(fa, b, f)
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
    <R, E, A>(as: Iterable<IO<R, E, A>>, f: (a: A) => M): IO<R, E, M> =>
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
      <R, E>(as: Iterable<IO<R, E, A>>): IO<R, E, M> =>
        foldMap_(M)(as, f)
  )
}

/**
 * Performs an effectful left-associative fold on an arbitrary `Foldable`,
 * combining each value with the provided `Monoid`
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldMapF_<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  return <M>(M: Monoid<M>) =>
    <K, Q, W, X, I, S, R, E, R1, E1, A>(
      fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      f: (a: A) => IO<R1, E1, M>
    ): IO<R1, E1, M> =>
      F.foldl_(fa, succeed(M.nat) as IO<R1, E1, M>, (b, a) =>
        pipe(
          b,
          chain((m0) =>
            pipe(
              f(a),
              map((m1) => M.combine_(m0, m1))
            )
          )
        )
      )
}

/**
 * Performs an effectful left-associative fold on an arbitrary `Foldable`,
 * combining each value with the provided `Monoid`
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst foldMapF_
 */
export function foldMapF<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  const foldMapFF_ = foldMapF_(F)
  return <M>(M: Monoid<M>) => {
    const foldMapFFM_ = foldMapFF_(M)
    return <A, R1, E1>(f: (a: A) => IO<R1, E1, M>) =>
      <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): IO<R1, E1, M> =>
        foldMapFFM_(fa, f)
  }
}

function foldrLoop<A, B, R, E>(
  iterator: Iterator<A>,
  b: UIO<B>,
  f: (a: A, b: IO<R, E, B>) => IO<R, E, B>
): IO<R, E, B> {
  const next = iterator.next()
  return next.done ? b : f(next.value, foldrLoop(iterator, b, f))
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
  return foldrLoop(as[Symbol.iterator](), b, f)
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
 * Performs an effectful right-associative fold on an arbitrary `Foldable`
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldrF_<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  return <K, Q, W, X, I, S, R, E, A, R1, E1, B>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    b: UIO<B>,
    f: (a: A, b: IO<R1, E1, B>) => IO<R1, E1, B>
  ): IO<R1, E1, B> => Ev.run(F.foldr_(fa, Ev.now(b as IO<R1, E1, B>), (a, b) => Ev.now(f(a, flatten(fromEval(b))))))
}

/**
 * Performs an effectful right-associative fold on an arbitrary `Foldable`
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst foldrF_
 */
export function foldrF<F extends HKT.HKT, C = HKT.None>(F: P.Foldable<F, C>) {
  const foldrFF_ = foldrF_(F)
  return <A, R1, E1, B>(b: UIO<B>, f: (a: A, b: IO<R1, E1, B>) => IO<R1, E1, B>) =>
    <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): IO<R1, E1, B> =>
      foldrFF_(fa, b, f)
}

/**
 * Repeats this effect forever (until the first failure).
 *
 * @trace call
 */
export function forever<R, E, A>(ma: IO<R, E, A>): IO<R, E, never> {
  const trace = accessCallTrace()
  return pipe(ma, apSecond(yieldNow), chain(traceFrom(trace, () => forever(ma))))
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
 * fibers leak. This behavior is called "None supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 *
 * @trace call
 */
export function fork<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return new Primitives.Fork(ma, M.nothing(), M.nothing(), trace)
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
 * fibers leak. This behavior is called "None supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 *
 * @trace call
 */
export function forkReport(reportFailure: FailureReporter): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return (ma) => new Primitives.Fork(ma, M.nothing(), M.just(reportFailure), trace)
}

/**
 * Unwraps the optional success of an `IO`, but can fail with a `Nothing` value.
 *
 * @trace call
 */
export function get<R, E, A>(ma: IO<R, E, M.Maybe<A>>): IO<R, M.Maybe<E>, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(
    ma,
    traceFrom(trace, flow(C.map(M.just), failCause)),
    traceFrom(
      trace,
      M.match(() => fail(M.nothing()), pure)
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
export function getOrElse_<R, E, A, B>(ma: IO<R, E, Maybe<A>>, orElse: () => B): IO<R, E, A | B> {
  return pipe(ma, map(traceAs(orElse, flow(M.getOrElse(orElse)))))
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
export function getOrElse<B>(orElse: () => B): <R, E, A>(ma: IO<R, E, Maybe<A>>) => IO<R, E, B | A> {
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
  ma: IO<R, E, Maybe<A>>,
  orElse: IO<R1, E1, B>
): IO<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return chain_(ma as IO<R, E, Maybe<A | B>>, traceFrom(trace, flow(M.map(succeed), M.getOrElse(constant(orElse)))))
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
): <R, E, A>(ma: IO<R, E, Maybe<A>>) => IO<R & R1, E1 | E, B | A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(getOrElseIO_, trace)(ma, orElse)
}

/**
 * Lifts a Maybe into an IO, if the option is `Nothing` it fails with NoSuchElementError.
 *
 * @trace call
 */
export function getOrFail<A>(maybe: Maybe<A>): FIO<NoSuchElementError, A> {
  const trace = accessCallTrace()
  return getOrFailWith_(
    maybe,
    traceFrom(trace, () => new NoSuchElementError('IO.getOrFail'))
  )
}

/**
 * Lifts a Maybe into an IO. If the option is `Nothing`, fail with `onNothing`.
 *
 * @trace call
 * @trace 1
 */
export function getOrFailWith_<E, A>(option: Maybe<A>, onNothing: () => E): FIO<E, A> {
  const trace = accessCallTrace()
  return defer(traceFrom(trace, () => M.match_(option, () => failLazy(onNothing), succeed)))
}

/**
 * Lifts a Maybe into an IO. If the Maybe is `Nothing`, fail with `onNothing`.
 *
 * @dataFirst getOrFailWith_
 * @trace 0
 */
export function getOrFailWith<E>(onNothing: () => E) {
  return <A>(option: Maybe<A>): FIO<E, A> => getOrFailWith_(option, onNothing)
}

/**
 * Lifts a Maybe into a IO, if the Maybe is `Nothing` it fails with Unit.
 *
 * @trace call
 */
export function getOrFailUnit<A>(option: Maybe<A>): FIO<void, A> {
  return getOrFailWith_(option, () => undefined)
}

/**
 * Returns the identity effectful function, which performs no effects
 *
 * @trace call
 */
export function id<R>(): IO<R, never, R> {
  const trace = accessCallTrace()
  return asks(traceFrom(trace, identity))
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

export function ignore<R, E, A>(fa: IO<R, E, A>): URIO<R, void> {
  return pipe(fa, match(constVoid, constVoid))
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
          (r) => give_(io, r),
          (r1) => give_(that, r1)
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
          (r) => map_(give_(ma, r), E.left),
          (r1) => map_(give_(mb, r1), E.right)
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
    traceAs(f, (a) => tryCatch(() => f(a), onThrow))
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
  return matchCauseIO_(ma, traceAs(f, flow(f, failCause)), pure)
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
 * Returns the logical negation of the `Boolean` value returned by this
 * effect.
 *
 * @trace call
 */
export function not<R, E>(ma: IO<R, E, boolean>): IO<R, E, boolean> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, (b) => !b)
  )
}

/**
 * @trace call
 */
export function maybe<R, E, A>(io: IO<R, E, A>): URIO<R, Maybe<A>> {
  const trace = accessCallTrace()
  return match_(
    io,
    traceFrom(trace, () => M.nothing()),
    traceFrom(trace, (a) => M.just(a))
  )
}

/**
 * Converts an option on errors into an option on values.
 *
 * @trace call
 */
export function optional<R, E, A>(ma: IO<R, Maybe<E>, A>): IO<R, E, Maybe<A>> {
  const trace = accessCallTrace()
  return matchIO_(
    ma,
    traceFrom(
      trace,
      M.match(() => pure(M.nothing()), fail)
    ),
    flow(M.just, pure)
  )
}

/**
 * Returns the logical disjunction of the `Boolean` value returned by this
 * effect and the `Boolean` value returned by the specified effect. This
 * operator has "short circuiting" behavior so if the value returned by this
 * effect is true the specified effect will not be evaluated.
 *
 * @trace call
 */
export function or_<R, E, R1, E1>(ma: IO<R, E, boolean>, mb: IO<R1, E1, boolean>): IO<R & R1, E | E1, boolean> {
  const trace = accessCallTrace()
  return chain_(
    ma,
    traceFrom(trace, (b) => (b ? succeed(true) : mb))
  )
}

/**
 * Returns the logical disjunction of the `Boolean` value returned by this
 * effect and the `Boolean` value returned by the specified effect. This
 * operator has "short circuiting" behavior so if the value returned by this
 * effect is true the specified effect will not be evaluated.
 *
 * @dataFirst or_
 * @trace call
 */
export function or<R1, E1>(mb: IO<R1, E1, boolean>): <R, E>(ma: IO<R, E, boolean>) => IO<R & R1, E | E1, boolean> {
  const trace = accessCallTrace()
  return (ma) => traceCall(or_, trace)(ma, mb)
}

/**
 * @trace call
 */
export function orHalt<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  const trace = accessCallTrace()
  return orHaltWith_(ma, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function orHaltKeep<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  const trace = accessCallTrace()
  return matchCauseIO_(ma, traceFrom(trace, flow(C.chain(C.halt), failCause)), succeed)
}

/**
 * @trace 1
 */
export function orHaltWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => unknown): IO<R, never, A> {
  return matchIO_(ma, traceAs(f, flow(f, halt)), succeed)
}

/**
 * @dataFirst orHaltWith_
 * @trace 0
 */
export function orHaltWith<E>(f: (e: E) => unknown): <R, A>(ma: IO<R, E, A>) => IO<R, never, A> {
  return (ma) => orHaltWith_(ma, f)
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
export function orElseMaybe_<R, E, A, R1, E1, A1>(
  ma: IO<R, Maybe<E>, A>,
  that: () => IO<R1, Maybe<E1>, A1>
): IO<R & R1, Maybe<E | E1>, A | A1> {
  return catchAll_(
    ma,
    traceAs(
      that,
      M.match(that, (e) => fail(M.just<E | E1>(e)))
    )
  )
}

/**
 * @dataFirst orElseMaybe_
 * @trace 0
 */
export function orElseMaybe<R1, E1, A1>(
  that: () => IO<R1, Maybe<E1>, A1>
): <R, E, A>(ma: IO<R, Maybe<E>, A>) => IO<R & R1, Maybe<E1 | E>, A1 | A> {
  return (ma) => orElseMaybe_(ma, that)
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
        return traceCall(failCause, trace)(cause as Cause<never>)
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
  return map_(foreach_(as, traceAs(f, flow(f, either))), I.separate)
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

export function wilt_<F extends HKT.HKT, C = HKT.None>(W: P.Witherable<F, C>) {
  return <K, Q, W, X, I, S, R, E, A, R1, E1, B>(
    wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => IO<R1, E1, B>
  ): IO<R1, never, readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, E1>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]> =>
    W.wilt_(_Applicative)(wa, flow(f, either))
}

/**
 * @dataFirst wilt_
 */
export function wilt<F extends HKT.HKT, C = HKT.None>(W: P.Witherable<F, C>) {
  const wiltW_ = wilt_(W)
  return <A, R1, E1, B>(f: (a: A) => IO<R1, E1, B>) =>
    <K, Q, W, X, I, S, R, E>(
      wa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): IO<
      R1,
      never,
      readonly [HKT.Kind<F, C, K, Q, W, X, I, S, R, E, E1>, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>]
    > =>
      wiltW_(wa, f)
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
  return new Primitives.Match(
    ma,
    traceFrom(trace, (cause) => succeed(Ex.failCause(cause))),
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
  return matchCauseIO_(ma, (cause) => failCauseWithTrace((trace) => C.traced(cause, trace())), succeed)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @trace 1
 */
export function refineOrHalt_<R, E, A, E1>(fa: IO<R, E, A>, pf: (e: E) => Maybe<E1>): IO<R, E1, A> {
  return refineOrHaltWith_(fa, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @dataFirst refineOrHalt_
 * @trace 0
 */
export function refineOrHalt<E, E1>(pf: (e: E) => Maybe<E1>): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrHalt_(fa, pf)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @trace call
 */
export function refineOrHaltWith_<R, E, A, E1>(
  fa: IO<R, E, A>,
  pf: (e: E) => Maybe<E1>,
  f: (e: E) => unknown
): IO<R, E1, A> {
  const trace = accessCallTrace()
  return catchAll_(
    fa,
    traceFrom(trace, (e) => M.match_(pf(e), () => halt(f(e)), fail))
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `Error`.
 *
 * @dataFirst refineOrHaltWith_
 * @trace call
 */
export function refineOrHaltWith<E, E1>(
  pf: (e: E) => Maybe<E1>,
  f: (e: E) => unknown
): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(refineOrHaltWith_, trace)(fa, pf, f)
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
export function reject_<R, E, A, E1>(fa: IO<R, E, A>, pf: (a: A) => Maybe<E1>): IO<R, E | E1, A> {
  return rejectIO_(
    fa,
    traceAs(pf, (a) => M.map_(pf(a), fail))
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
export function reject<A, E1>(pf: (a: A) => Maybe<E1>): <R, E>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
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
  pf: (a: A) => Maybe<IO<R1, E1, E1>>
): IO<R & R1, E | E1, A> {
  return chain_(
    fa,
    traceAs(pf, (a) => M.match_(pf(a), () => pure(a), chain(fail)))
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
  pf: (a: A) => Maybe<IO<R1, E1, E1>>
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
export function require_<R, E, A>(ma: IO<R, E, M.Maybe<A>>, error: () => E): IO<R, E, A> {
  return chain_(
    ma,
    traceAs(
      error,
      M.match(() => chain_(succeedLazy(error), fail), succeed)
    )
  )
}

/**
 * @trace 0
 * @dataFirst require_
 */
function _require<E>(error: () => E): <R, A>(ma: IO<R, E, M.Maybe<A>>) => IO<R, E, A> {
  return (ma) => require_(ma, error)
}

export { _require as require }

/**
 * Recover from the unchecked failure of the `IO`. (opposite of `orHalt`)
 *
 * @trace call
 */
export function resurrect<R, E, A>(io: IO<R, E, A>): IO<R, unknown, A> {
  const trace = accessCallTrace()
  return unrefineWith_(io, traceFrom(trace, M.just), identity)
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
    traceAs(f, (c) => chain_(f(c), () => failCause(c))),
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

const _Applicative = Applicative<IOF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure
})

/**
 * Maps an arbitrary `Traversable` to an effectful computation
 */
export function traverse_<F extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<F, C>
): <K, Q, W, X, I, S, R, E, A, R1, E1, B>(
  ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
  f: (a: A) => IO<R1, E1, B>
) => IO<R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>> {
  const traverseIO_ = T.traverse_(_Applicative)
  return (ta, f) => traverseIO_(ta, f)
}

/**
 * Maps an arbitrary `Traversable` to an effectful computation
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst traverse_
 */
export function traverse<F extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<F, C>
): <A, R1, E1, B>(
  f: (a: A) => IO<R1, E1, B>
) => <K, Q, W, X, I, S, R, E>(
  ta: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => IO<R1, E1, HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>> {
  const traverseT__ = traverse_(T)
  return (f) => (ta) => traverseT__(ta, f)
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
  return matchCauseIO_(
    ma,
    traceAs(that, (cause) => M.match_(C.keepDefects(cause), that, failCause)),
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
    traceFrom(trace, (a) => (C.isEmpty(a) ? unit() : failCause(a)))
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
export function unrefine_<R, E, A, E1>(fa: IO<R, E, A>, pf: (u: unknown) => Maybe<E1>) {
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
export function unrefine<E1>(pf: (u: unknown) => Maybe<E1>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
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
  pf: (u: unknown) => Maybe<E1>,
  f: (e: E) => E2
): IO<R, E1 | E2, A> {
  return catchAllCause_(
    fa,
    traceAs(
      pf,
      (cause): IO<R, E1 | E2, A> =>
        pipe(
          cause,
          C.find((c) => (C.halted(c) ? pf(c.value) : M.nothing())),
          M.match(() => pipe(cause, C.map(f), failCause), fail)
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
export function unrefineWith<E, E1, E2>(pf: (u: unknown) => Maybe<E1>, f: (e: E) => E2) {
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
export function services<SS extends Record<string, Tag<any>>>(s: SS): IO<P.HasStruct<SS>, never, P.ServicesStruct<SS>> {
  return asks((r) => R.map_(s, (tag) => tag.read(r as Has<any>)) as any)
}

/**
 * Accesses the specified services in the environment of the effect.
 */
export function servicesT<SS extends ReadonlyArray<Tag<any>>>(
  ...s: SS
): IO<P.HasTuple<SS>, never, P.ServicesTuple<SS>> {
  return asks((r) => A.map_(s, (tag) => tag.read(r as Has<any>)) as any)
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesIO<SS extends Record<string, Tag<any>>>(
  s: SS
): <R, E, A>(f: (a: P.ServicesStruct<SS>) => IO<R, E, A>) => IO<R & P.HasStruct<SS>, E, A> {
  return (f) => asksIO((r: P.HasStruct<SS>) => f(R.map_(s, (v) => v.read(r as Has<any>)) as any))
}

export function asksServicesTIO<SS extends ReadonlyArray<Tag<any>>>(
  ...s: SS
): <R, E, A>(f: (...a: P.ServicesTuple<SS>) => IO<R, E, A>) => IO<R & P.HasTuple<SS>, E, A> {
  return (f) => asksIO((r: P.HasTuple<SS>) => f(...(A.map_(s, (v) => v.read(r as Has<any>)) as any)))
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(f: (a: P.ServicesStruct<SS>) => B) => URIO<P.HasStruct<SS>, B> {
  return (f) => asks((r: P.HasStruct<SS>) => f(R.map_(s, (v) => v.read(r as Has<any>)) as any))
}

export function asksServicesT<SS extends ReadonlyArray<Tag<any>>>(
  ...s: SS
): <A>(f: (...a: P.ServicesTuple<SS>) => A) => URIO<P.HasTuple<SS>, A> {
  return (f) => asks((r: P.HasTuple<SS>) => f(...(A.map_(s, (v) => v.read(r as Has<any>)) as any)))
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
export function service<T>(s: Tag<T>): IO<Has<T>, never, T> {
  return asksServiceIO(s)(succeed)
}

export function giveServices_<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E, A>(io: IO<R & P.HasStruct<SS>, E, A>, services: P.ServicesStruct<SS>): IO<R, E, A> =>
    asksIO((r: R) =>
      give_(
        io,
        Object.assign(
          {},
          r,
          R.ifoldl_(tags, {} as any, (k, b, tag) => mergeEnvironments(tag, b, services[k]))
        )
      )
    )
}

/**
 * Provides the IO with the required services
 */
export function giveServices<SS extends Record<string, Tag<any>>>(s: SS) {
  return (services: P.ServicesStruct<SS>) =>
    <R, E, A>(io: IO<R & P.HasStruct<SS>, E, A>): IO<R, E, A> =>
      giveServices_(s)(io, services)
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesIO_<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E, A, R1, E1>(
    io: IO<R & P.HasStruct<SS>, E, A>,
    services: IO<R1, E1, P.ServicesStruct<SS>>
  ): IO<R & R1, E | E1, A> =>
    asksIO((r: R & R1) =>
      chain_(services, (svcs) =>
        give_(
          io,
          Object.assign(
            {},
            r,
            R.ifoldl_(tags, {} as any, (k, b, tag) => mergeEnvironments(tag, b, svcs[k]))
          )
        )
      )
    )
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesIO<SS extends Record<string, Tag<any>>>(tags: SS) {
  return <R, E>(services: IO<R, E, P.ServicesStruct<SS>>) =>
    <R1, E1, A>(io: IO<R1 & P.HasStruct<SS>, E1, A>): IO<R & R1, E | E1, A> =>
      giveServicesIO_(tags)(io, services)
}

/**
 * Provides the IO with the required services
 */
export function giveServicesT_<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R, E, A>(io: IO<R & P.HasTuple<SS>, E, A>, ...services: P.ServicesTuple<SS>): IO<R, E, A> =>
    asksIO((r: R) =>
      give_(
        io,
        Object.assign(
          {},
          r,
          A.ifoldl_(tags, {} as any, (i, b, tag) => mergeEnvironments(tag, b, services[i]))
        )
      )
    )
}

/**
 * Provides the IO with the required services
 */
export function giveServicesT<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return (...services: P.ServicesTuple<SS>) =>
    <R, E, A>(io: IO<R & P.HasTuple<SS>, E, A>): IO<R, E, A> =>
      giveServicesT_<SS>(...tags)<R, E, A>(io, ...services)
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesTIO_<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R, E, A, R1, E1>(
    io: IO<R & P.HasTuple<SS>, E, A>,
    services: IO<R1, E1, P.ServicesTuple<SS>>
  ): IO<R & R1, E | E1, A> =>
    asksIO((r: R & R1) =>
      chain_(services, (svcs) =>
        give_(
          io,
          Object.assign(
            {},
            r,
            A.ifoldl_(tags, {} as any, (i, b, tag) => mergeEnvironments(tag, b, svcs[i]))
          )
        )
      )
    )
}

/**
 * Effectfully provides the IO with the required services
 */
export function giveServicesTIO<SS extends ReadonlyArray<Tag<any>>>(...tags: SS) {
  return <R1, E1>(services: IO<R1, E1, P.ServicesTuple<SS>>) =>
    <R, E, A>(io: IO<R & P.HasTuple<SS>, E, A>): IO<R1 & R, E1 | E, A> =>
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
    asksIO((r: R & R1) => chain_(service, (t) => give_(ma, mergeEnvironments(tag, r, t))))
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

/**
 * @internal
 */
export const __adapter = (_: any, __?: any) => {
  if (E.isEither(_)) {
    fromEitherLazy(() => _)
  }
  if (M.isMaybe(_)) {
    return __ ? (_._tag === 'Nothing' ? fail(__()) : pure(_.value)) : getOrFail(_)
  }
  if (isTag(_)) {
    return service(_)
  }
  if (S.isSync(_)) {
    return fromSync(_)
  }
  return _
}

const adapter = (_: any, __?: any) => {
  return new GenIO(__adapter(_, __), adapter['$trace'])
}

/**
 * @trace call
 * @gen
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
    <E, A>(_: Maybe<A>, onNothing: () => E): GenIO<unknown, E, A>
    /**
     * @trace call
     */
    <A>(_: Maybe<A>): GenIO<unknown, NoSuchElementError, A>
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
} & {
  [k in Cns]: T[k] extends IO<infer R, infer E, infer A> ? IO<R & Has<T>, E, A> : never
} & {
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
    const ret = {} as any

    for (const k of functions) {
      ret[k] = (...args: any[]) =>
        asksServiceIO(H)((h) => (h[k] as unknown as (...args: unknown[]) => IO<unknown, unknown, unknown>)(...args))
    }

    for (const k of constants) {
      ret[k] = asksServiceIO(H)((h) => h[k] as unknown as IO<unknown, unknown, unknown>)
    }

    for (const k of values) {
      ret[k] = asksService(H)((h) => h[k])
    }

    return ret as any
  }
}

export type DerivedAsksIO<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => IO<R_, E_, A_>) => IO<R_ & Has<T>, E_, A_>
}

export function deriveAsksIO<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAsksIO<T, Gens> {
  return (generics) => {
    const ret = {} as any

    for (const k of generics) {
      ret[k] = (f: any) => asksServiceIO(H)((h) => f(h[k]))
    }

    return ret as any
  }
}

export type DerivedAsks<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => IO<Has<T>, never, A_>
}

export function deriveAsks<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAsks<T, Gens> {
  return (generics) => {
    const ret = {} as any

    for (const k of generics) {
      ret[k] = (f: any) => asksService(H)((h) => f(h[k]))
    }

    return ret as any
  }
}
