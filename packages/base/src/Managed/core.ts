// tracing: off

import type { Cause } from '../Cause'
import type { Chunk } from '../Chunk/core'
import type { Exit } from '../Exit'
import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/trace'
import type { Has, Tag } from '../Has'
import type * as P from '../prelude'
import type { ReadonlyRecord } from '../Record'
import type { Finalizer, ReleaseMap } from './ReleaseMap'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as A from '../Array/core'
import * as C from '../Cause/core'
import * as Ch from '../Chunk/core'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import * as Ex from '../Exit/core'
import { flow, identity as identityFn, pipe } from '../function'
import { isTag } from '../Has'
import * as Iter from '../Iterable'
import * as O from '../Option'
import * as R from '../Record'
import * as Ref from '../Ref/core'
import { tuple } from '../tuple'
import * as I from './internal/io'
import { add, addIfOpen, noopFinalizer, release, updateAll } from './ReleaseMap'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const ManagedTypeId = Symbol('@principia/base/Managed')
export type ManagedTypeId = typeof ManagedTypeId

export class Managed<R, E, A> {
  readonly [ManagedTypeId]: ManagedTypeId = ManagedTypeId;
  readonly [I._R]: (_: R) => void;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A
  constructor(readonly io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>) {}

  ['>>=']<R1, E1, B>(f: (a: A) => Managed<R1, E1, B>): Managed<R & R1, E | E1, B> {
    return chain_(this, f)
  }
  ['*>']<R1, E1, A1>(fb: Managed<R1, E1, A1>): Managed<R & R1, E | E1, A1> {
    return crossSecond_(this, fb)
  }
  ['<*']<R1, E1, A1>(fb: Managed<R1, E1, A1>): Managed<R & R1, E | E1, A> {
    return crossFirst_(this, fb)
  }
  ['<$>']<B>(f: (a: A) => B): Managed<R, E, B> {
    return map_(this, f)
  }
  ['$>']<B>(b: () => B): Managed<R, E, B> {
    return asLazy_(this, b)
  }
  ['>>>']<E1, B>(fb: Managed<A, E1, B>): Managed<R, E | E1, B> {
    return pipeTo_(this, fb)
  }
  ['<<<']<R1, E1>(fb: Managed<R1, E1, R>): Managed<R1, E | E1, A> {
    return compose_(this, fb)
  }
}

export type UManaged<A> = Managed<unknown, never, A>
export type URManaged<R, A> = Managed<R, never, A>
export type FManaged<E, A> = Managed<unknown, E, A>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lift a pure value into an IO
 *
 * @trace call
 */
export function succeed<E = never, A = never>(a: A): Managed<unknown, E, A> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(I.succeed(a))
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 *
 * @trace call
 */
export function fromIO<R, E, A>(effect: I.IO<R, E, A>) {
  const trace = accessCallTrace()
  return new Managed<R, E, A>(
    I.map_(I.asksIO(traceFrom(trace, (_: readonly [R, ReleaseMap]) => I.giveAll_(effect, _[0]))), (a) => [
      noopFinalizer,
      a
    ])
  )
}

/**
 * @trace call
 */
export function fromIOUninterruptible<R, E, A>(ma: I.IO<R, E, A>): Managed<R, E, A> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(I.uninterruptible(ma))
}

/**
 * Imports a synchronous side-effect into a Managed
 *
 * @trace 0
 */
export function succeedLazy<A>(effect: () => A): Managed<unknown, never, A> {
  return fromIO(I.succeedLazy(effect))
}

/**
 * @trace 0
 */
function _try<A>(effect: () => A): Managed<unknown, unknown, A> {
  return fromIO(I.try(effect))
}

export { _try as try }

/**
 * Imports a synchronous side-effect that may throw into a Managed
 *
 * @trace 0
 * @trace 1
 */
export function tryCatch_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): Managed<unknown, E, A> {
  return fromIO(I.tryCatch_(thunk, onThrow))
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 *
 * @dataFirst tryCatch_
 * @trace 0
 */
export function tryCatch<E>(onThrow: (error: unknown) => E) {
  return (
    /**
     * @trace 0
     */
    <A>(thunk: () => A): Managed<unknown, E, A> => tryCatch_(thunk, onThrow)
  )
}

/**
 * @trace 0
 */
export function defer<R, E, A>(managed: () => Managed<R, E, A>): Managed<R, E, A> {
  return flatten(succeedLazy(managed))
}

/**
 * @trace 0
 */
export function failLazy<E = never, A = never>(e: () => E): Managed<unknown, E, A> {
  return fromIO(I.failLazy(e))
}

/**
 * Returns a Managed that models failure with the specified error. The moral equivalent of throw for pure code.
 *
 * @trace call
 */
export function fail<E = never, A = never>(e: E): Managed<unknown, E, A> {
  const trace = accessCallTrace()
  return fromIO(traceCall(I.fail, trace)(e))
}

/**
 * @trace 0
 */
export function haltLazy<E = never, A = never>(cause: () => Cause<E>): Managed<unknown, E, A> {
  return haltWithTrace(cause)
}

/**
 * Returns a Managed that models failure with the specified `Cause`.
 *
 * @trace call
 */
export function halt<E = never, A = never>(cause: Cause<E>): Managed<unknown, E, A> {
  const trace = accessCallTrace()
  return fromIO(traceCall(I.halt, trace)(cause))
}

/**
 * @trace 0
 */
export function haltWithTrace<E = never, A = never>(cause: (_: () => Trace) => Cause<E>): Managed<unknown, E, A> {
  return fromIO(I.haltWithTrace(cause))
}

/**
 * @trace 0
 */
export function dieLazy(e: () => unknown): Managed<unknown, never, never> {
  return fromIO(I.dieLazy(e))
}

/**
 * Returns a Managed that dies with the specified error
 *
 * @trace call
 */
export function die(e: unknown): Managed<unknown, never, never> {
  const trace = accessCallTrace()
  return traceCall(halt, trace)(C.die(e))
}

/**
 * Creates an effect that only executes the provided finalizer as its
 * release action.
 *
 * @trace call
 */
export function finalizer<R>(f: I.URIO<R, unknown>): Managed<R, never, void> {
  const trace = accessCallTrace()
  return finalizerExit(traceFrom(trace, (_) => f))
}

/**
 * Creates an effect that only executes the provided function as its
 * release action.
 *
 * @trace 0
 */
export function finalizerExit<R>(f: (exit: Ex.Exit<unknown, unknown>) => I.URIO<R, unknown>): Managed<R, never, void> {
  return bracketExit_(
    I.unit(),
    traceAs(f, (_, exit) => f(exit))
  )
}

/**
 * Creates an IO that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 *
 * @trace call
 */
export function finalizerRef(initial: Finalizer) {
  const trace = accessCallTrace()
  return traceCall(bracketExit_, trace)(
    Ref.make(initial),
    traceFrom(trace, (ref, exit) => I.chain_(ref.get, (f) => f(exit)))
  )
}

/**
 * Returns the identity effectful function, which performs no effects
 *
 * @trace call
 */
export function identity<R>(): Managed<R, never, R> {
  return asks(identityFn)
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 *
 * @dataFirst bracket_
 * @trace 0
 */
export function bracket<R1, A>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return bracketExit(release)
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 *
 * @trace 1
 */
export function bracket_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return bracketExit_(acquire, release)
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 *
 * @dataFirst bracketExit_
 * @trace call
 * @trace 0
 */
export function bracketExit<R1, A>(
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (acquire) => traceCall(bracketExit_, trace)(acquire, release)
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 *
 * @trace call
 * @trace 1
 */
export function bracketExit_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return new Managed<R & R1, E, A>(
    I.uninterruptible(
      I.gen(function* (_) {
        const r  = yield* _(I.ask<readonly [R & R1, ReleaseMap]>())
        const a  = yield* traceCall(_, trace)(I.giveAll_(acquire, r[0]))
        const rm = yield* traceCall(_, release['$trace'])(add(r[1], (ex) => I.giveAll_(release(a, ex), r[0])))
        return tuple(rm, a)
      })
    )
  )
}

/**
 * Creates a `Managed` from a `Reservation` produced by an IO. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 *
 * @trace call
 */
export function makeReserve<R, E, R2, E2, A>(reservation: I.IO<R, E, Reservation<R2, E2, A>>) {
  const trace = accessCallTrace()
  return new Managed<R & R2, E | E2, A>(
    I.uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const [r, releaseMap] = yield* _(I.ask<readonly [R & R2, ReleaseMap]>())
          const reserved        = yield* _(I.giveAll_(reservation, r))
          const releaseKey      = yield* _(addIfOpen(releaseMap, (x) => I.giveAll_(reserved.release(x), r)))
          const finalizerAndA   = yield* _(
            I.defer(() => {
              switch (releaseKey._tag) {
                case 'None': {
                  return I.interrupt
                }
                case 'Some': {
                  return pipe(
                    reserved.acquire,
                    I.gives(([r]: readonly [R & R2, ReleaseMap]) => r),
                    restore,
                    I.map((a): readonly [Finalizer, A] => tuple((e) => release(releaseMap, releaseKey.value, e), a))
                  )
                }
              }
            })
          )
          return finalizerAndA
        })
      )
    )
  )
}

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
  /**
   * @trace 1
   */
  static of = <R, E, A, R2>(acquire: I.IO<R, E, A>, release: (exit: Exit<any, any>) => I.IO<R2, never, any>) =>
    new Reservation<R & R2, E, A>(acquire, release)

  private constructor(
    readonly acquire: I.IO<R, E, A>,
    readonly release: (exit: Exit<any, any>) => I.IO<R, never, any>
  ) {}
}

/**
 * Make a new reservation
 *
 * @trace 1
 */
export function makeReservation_<R, E, A, R2>(
  acquire: I.IO<R, E, A>,
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): Reservation<R & R2, E, A> {
  return Reservation.of(acquire, release)
}

/**
 * Make a new reservation
 *
 * @dataFirst makeReservation_
 * @trace 0
 */
export function makeReservation<R2>(
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): <R, E, A>(acquire: I.IO<R, E, A>) => Reservation<R & R2, E, A> {
  return (acquire) => Reservation.of(acquire, release)
}

/**
 * Lifts a pure `Reservation<R, E, A>` into `Managed<R, E, A>`. The acquisition step
 * is performed interruptibly.
 *
 * @trace call
 */
export function reserve<R, E, A>(reservation: Reservation<R, E, A>): Managed<R, E, A> {
  const trace = accessCallTrace()
  return traceCall(makeReserve, trace)(I.pure(reservation))
}

/**
 * Lifts an `Either` into a `Managed` value.
 *
 * @trace 0
 */
export function fromEitherLazy<E, A>(ea: () => E.Either<E, A>): Managed<unknown, E, A> {
  return chain_(succeedLazy(ea), E.match(fail, succeed))
}

/**
 * Lifts a function `R => A` into a `Managed<R, never, A>`.
 *
 * @trace 0
 */
export function fromFunction<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return asks(f)
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 *
 * @trace 0
 */
export function fromFunctionIO<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return asksIO(f)
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 *
 * @trace 0
 */
export function fromFunctionManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return asksManaged(f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Sequential Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @trace call
 */
export const pure = succeed

/*
 * -------------------------------------------------------------------------------------------------
 * Sequential Apply Managed
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @dataFirst crossWith_
 * @trace 1
 */
export function crossWith<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @trace 2
 */
export function crossWith_<R, E, A, R1, E1, B, C>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>, f: (a: A, b: B) => C) {
  return chain_(fa, (a) =>
    map_(
      fb,
      traceAs(f, (a2) => f(a, a2))
    )
  )
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @trace call
 */
export function cross_<R, E, A, R1, E1, A1>(fa: Managed<R, E, A>, fb: Managed<R1, E1, A1>) {
  const trace = accessCallTrace()
  return traceFrom(trace, crossWith_)(fa, fb, (a, a2) => [a, a2] as [A, A1])
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @dataFirst cross_
 * @trace call
 */
export function cross<R1, E1, A1>(that: Managed<R1, E1, A1>) {
  const trace = accessCallTrace()
  return <R, E, A>(self: Managed<R, E, A>) => traceCall(cross_, trace)(self, that)
}

/**
 * @trace call
 */
export function ap_<R, E, A, Q, D, B>(fab: Managed<Q, D, (a: A) => B>, fa: Managed<R, E, A>): Managed<Q & R, D | E, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * @dataFirst ap_
 * @trace call
 */
export function ap<R, E, A>(
  fa: Managed<R, E, A>
): <Q, D, B>(fab: Managed<Q, D, (a: A) => B>) => Managed<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * @trace call
 */
export function crossFirst_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

/**
 * @dataFirst crossFirst_
 * @trace call
 */
export function crossFirst<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

/**
 * @trace call
 */
export function crossSecond_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/**
 * @dataFrist crossSecond_
 * @trace call
 */
export function crossSecond<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

export const sequenceS = <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: P.EnforceNonEmptyRecord<MR> & Record<string, Managed<any, any, any>>
): Managed<
  P._R<MR[keyof MR]>,
  P._E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> =>
  map_(
    foreach_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const mut_r = {}
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i]
        mut_r[k]     = v
      }
      return mut_r
    }
  ) as any

export const sequenceT = <T extends ReadonlyArray<Managed<any, any, any>>>(
  ...mt: T & {
    0: Managed<any, any, any>
  }
): Managed<
  P._R<T[number]>,
  P._E<T[number]>,
  { [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never }
> => foreach_(mt, identityFn) as any

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @trace 1
 * @trace 2
 */
export function bimap_<R, E, A, B, C>(pab: Managed<R, E, A>, f: (e: E) => B, g: (a: A) => C): Managed<R, B, C> {
  return new Managed(
    I.bimap_(
      pab.io,
      f,
      traceAs(g, ([fin, a]) => [fin, g(a)])
    )
  )
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @dataFirst bimap_
 * @trace 0
 * @trace 1
 */
export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Managed<R, E, A>) => Managed<R, B, C> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @trace 1
 */
export function mapError_<R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> {
  return new Managed(I.mapError_(pab.io, f))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @dataFirst mapError_
 * @trace 0
 */
export function mapError<E, D>(f: (e: E) => D): <R, A>(pab: Managed<R, E, A>) => Managed<R, D, A> {
  return (pab) => mapError_(pab, f)
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 *
 * @trace 1
 */
export function mapErrorCause_<R, E, A, D>(ma: Managed<R, E, A>, f: (e: Cause<E>) => Cause<D>): Managed<R, D, A> {
  return new Managed(I.mapErrorCause_(ma.io, f))
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 *
 * @dataFirst mapErrorCause_
 * @trace 0
 */
export function mapErrorCause<E, D>(f: (e: Cause<E>) => Cause<D>): <R, A>(ma: Managed<R, E, A>) => Managed<R, D, A> {
  return (ma) => mapErrorCause_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fallible
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 *
 * @trace call
 */
export function subsumeEither<R, E, E1, A>(fa: Managed<R, E, E.Either<E1, A>>): Managed<R, E | E1, A> {
  const trace = accessCallTrace()
  return chain_(
    fa,
    traceFrom(trace, (ea) => fromEitherLazy(() => ea))
  )
}

/**
 * @trace call
 */
export function either<R, E, A>(fa: Managed<R, E, A>): Managed<R, never, E.Either<E, A>> {
  const trace = accessCallTrace()
  return match_(fa, traceFrom(trace, flow(E.left)), traceFrom(trace, flow(E.right)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A more powerful version of `matchM` that allows recovering from any kind of failure except interruptions.
 *
 * @trace 1
 * @trace 2
 */
export function matchCauseManaged_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      ma.io,
      I.matchCauseIO(
        traceAs(onFailure, (c) => onFailure(c).io),
        traceAs(onSuccess, ([_, a]) => onSuccess(a).io)
      )
    )
  )
}

/**
 * A more powerful version of `matchManaged` that allows recovering from any kind of failure except interruptions.
 *
 * @dataFirst matchCauseManaged_
 * @trace 0
 * @trace 1
 */
export function matchCauseManaged<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => matchCauseManaged_(ma, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 *
 * @trace 1
 * @trace 2
 */
export function matchManaged_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): Managed<R & R1 & R2, E1 | E2, B | C> {
  return matchCauseManaged_(ma, traceAs(f, flow(C.failureOrCause, E.match(f, halt))), g)
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 *
 * @dataFirst matchManaged_
 * @trace 0
 * @trace 1
 */
export function matchManaged<E, A, R1, E1, B, R2, E2, C>(
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, B | C> {
  return (ma) => matchManaged_(ma, f, g)
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match`.
 *
 * @trace 1
 * @trace 2
 */
export function match_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return matchManaged_(ma, traceAs(onError, flow(onError, succeed)), traceAs(onSuccess, flow(onSuccess, succeed)))
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `match`.
 *
 * @dataFirst match_
 * @trace 0
 * @trace 1
 */
export function match<E, A, B, C>(
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => match_(ma, onError, onSuccess)
}

/**
 * A more powerful version of `match` that allows recovering from any kind of failure except interruptions.
 *
 * @trace 1
 * @trace 2
 */
export function matchCause_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return match_(sandbox(ma), onFailure, onSuccess)
}

/**
 * A more powerful version of `match` that allows recovering from any kind of failure except interruptions.
 *
 * @dataFirst matchCause_
 * @trace 0
 * @trace 1
 */
export function matchCause<E, A, B, C>(
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => matchCause_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @trace 1
 */
export function map_<R, E, A, B>(fa: Managed<R, E, A>, f: (a: A) => B): Managed<R, E, B> {
  return new Managed<R, E, B>(
    I.map_(
      fa.io,
      traceAs(f, ([fin, a]) => [fin, f(a)])
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @dataFirst map_
 * @trace 0
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return (fa) => map_(fa, f)
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @trace 1
 */
export function mapIO_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return new Managed<R & R1, E | E1, B>(
    I.chain_(
      fa.io,
      traceAs(f, ([fin, a]) =>
        I.gives_(
          I.map_(f(a), (b) => [fin, b]),
          ([r]: readonly [R & R1, ReleaseMap]) => r
        )
      )
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @dataFirst mapIO_
 * @trace 0
 */
export function mapIO<R1, E1, A, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => mapIO_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad Managed
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 *
 * @dataFirst chain_
 * @trace 0
 */
export function chain<R1, E1, A, A1>(
  f: (a: A) => Managed<R1, E1, A1>
): <R, E>(self: Managed<R, E, A>) => Managed<R & R1, E1 | E, A1> {
  return (self) => chain_(self, f)
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 *
 * @trace 1
 */
export function chain_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, A1> {
  return new Managed<R & R1, E | E1, A1>(
    I.chain_(
      self.io,
      traceAs(f, ([releaseSelf, a]) =>
        I.map_(f(a).io, ([releaseThat, b]) => [
          (e) =>
            I.chain_(I.result(releaseThat(e)), (e1) =>
              I.chain_(I.result(releaseSelf(e1)), (e2) => I.done(Ex.crossSecond_(e1, e2)))
            ),
          b
        ])
      )
    )
  )
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @trace 1
 */
export function tap_<R, E, A, Q, D>(ma: Managed<R, E, A>, f: (a: A) => Managed<Q, D, any>): Managed<R & Q, E | D, A> {
  return chain_(
    ma,
    traceAs(f, (a) => map_(f(a), () => a))
  )
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @dataFirst tap_
 * @trace 0
 */
export function tap<R1, E1, A>(
  f: (a: A) => Managed<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @trace call
 */
export function flatten<R, E, R1, E1, A>(mma: Managed<R, E, Managed<R1, E1, A>>): Managed<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return chain_(mma, traceFrom(trace, flow(identityFn)))
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @trace call
 */
export function flattenM<R, E, R1, E1, A>(mma: Managed<R, E, I.IO<R1, E1, A>>): Managed<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return mapIO_(mma, traceFrom(trace, flow(identityFn)))
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @trace 1
 * @trace 2
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return matchManaged_(
    ma,
    traceAs(f, (e) => chain_(f(e), () => fail(e))),
    traceAs(g, (a) => map_(g(a), () => a))
  )
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @dataFirst tapBoth_
 * @trace 0
 * @trace 1
 */
export function tapBoth<E, A, R1, E1, R2, E2>(
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E | E1 | E2, A> {
  return (ma) => tapBoth_(ma, f, g)
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @trace 1
 */
export function tapCause_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(
    ma,
    traceAs(f, (c) => chain_(f(c), () => halt(c)))
  )
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @dataFirst tapCause_
 * @trace 0
 */
export function tapCause<E, R1, E1>(
  f: (c: Cause<E>) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapCause_(ma, f)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @trace 1
 */
export function tapError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(ma, f, succeed)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @dataFirst tapError_
 * @trace 0
 */
export function tapError<E, R1, E1>(
  f: (e: E) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapError_(ma, f)
}

/**
 * Like `Managed#tap`, but uses a function that returns an `IO` value rather than a
 * `Managed` value.
 *
 * @trace 1
 */
export function tapIO_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return mapIO_(ma, (a) => I.asLazy_(f(a), () => a))
}

/**
 * Like `Managed#tap`, but uses a function that returns an `IO` value rather than a
 * `Managed` value.
 *
 * @dataFirst tapIO_
 * @trace 0
 */
export function tapIO<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapIO_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Accesses the whole environment of the effect.
 *
 * @trace call
 */
export function ask<R>(): Managed<R, never, R> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(I.ask<R>())
}

/**
 * Create a managed that accesses the environment.
 *
 * @trace 0
 */
export function asks<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return map_(ask<R>(), f)
}

/**
 * Create a managed that accesses the environment.
 *
 * @trace 0
 */
export function asksIO<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return mapIO_(ask<R0>(), f)
}

/**
 * Create a managed that accesses the environment.
 *
 * @trace 0
 */
export function asksManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return chain_(ask<R0>(), f)
}

/**
 * Modify the environment required to run a Managed
 *
 * @trace 1
 */
export function gives_<R, E, A, R0>(ma: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> {
  return new Managed(I.asksIO(traceAs(f, ([r0, rm]: readonly [R0, ReleaseMap]) => I.giveAll_(ma.io, [f(r0), rm]))))
}

/**
 * Modify the environment required to run a Managed
 *
 * @dataFirst gives_
 * @trace 0
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: Managed<R, E, A>) => Managed<R0, E, A> {
  return (ma) => gives_(ma, f)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @trace call
 */
export function giveAll_<R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> {
  const trace = accessCallTrace()
  return gives_(
    ma,
    traceFrom(trace, () => env)
  )
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @dataFirst giveAll_
 * @trace call
 */
export function giveAll<R>(env: R): <E, A>(ma: Managed<R, E, A>) => Managed<unknown, E, A> {
  return (ma) => giveAll_(ma, env)
}

/**
 * @trace call
 */
export function give_<E, A, R = unknown, R0 = unknown>(ma: Managed<R & R0, E, A>, env: R): Managed<R0, E, A> {
  const trace = accessCallTrace()
  return gives_(
    ma,
    traceFrom(trace, (r0) => ({ ...r0, ...env }))
  )
}

/**
 * @dataFirst give_
 * @trace call
 */
export function give<R>(env: R): <R0, E, A>(ma: Managed<R & R0, E, A>) => Managed<R0, E, A> {
  return (ma) => give_(ma, env)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @trace call
 */
export function unit(): Managed<unknown, never, void> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(I.unit())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 *
 * @trace call
 */
export function as_<R, E, A, B>(ma: Managed<R, E, A>, b: B): Managed<R, E, B> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, () => b)
  )
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 *
 * @trace call
 */
export function as<B>(b: B): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(as_, trace)(ma, b)
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 *
 * @trace 1
 */
export function asLazy_<R, E, A, B>(ma: Managed<R, E, A>, b: () => B): Managed<R, E, B> {
  return map_(ma, b)
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 *
 * @dataFirst as_
 * @trace 0
 */
export function asLazy<B>(b: () => B): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, B> {
  return (ma) => asLazy_(ma, b)
}

/**
 * Maps the success value of this effect to an optional value.
 *
 * @trace call
 */
export function asSome<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, O.Option<A>> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, (a) => O.some(a))
  )
}

/**
 * Maps the error value of this effect to an optional value.
 *
 * @trace call
 */
export function asSomeError<R, E, A>(ma: Managed<R, E, A>): Managed<R, O.Option<E>, A> {
  const trace = accessCallTrace()
  return mapError_(
    ma,
    traceFrom(trace, (e) => O.some(e))
  )
}

/**
 * @trace call
 */
export function asUnit<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, void> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, () => undefined)
  )
}

/**
 * Recovers from all errors.
 *
 * @trace 1
 */
export function catchAll_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return matchManaged_(ma, f, succeed)
}

/**
 * Recovers from all errors.
 *
 * @dataFirst catchAll_
 * @trace 0
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAll_(ma, f)
}

/**
 * Recovers from all errors with provided Cause.
 *
 * @trace 1
 */
export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return matchCauseManaged_(ma, f, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 *
 * @dataFirst catchAllCause_
 * @trace 0
 */
export function catchAllCause<E, R1, E1, B>(
  f: (e: Cause<E>) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAllCause_(ma, f)
}

/**
 * Recovers from some or all of the error cases.
 *
 * @trace 1
 */
export function catchSome_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAll_(
    ma,
    traceAs(pf, (e) => O.getOrElse_(pf(e), () => fail<E | E1>(e)))
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @dataFirst catchSome_
 * @trace 0
 */
export function catchSome<E, R1, E1, B>(
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSome_(ma, pf)
}

/**
 * Recovers from some or all of the error Causes.
 *
 * @trace 1
 */
export function catchSomeCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAllCause_(
    ma,
    traceAs(pf, (e) => O.getOrElse_(pf(e), () => halt<E | E1>(e)))
  )
}

/**
 * Recovers from some or all of the error Causes.
 *
 * @dataFirst catchSomeCause_
 * @trace 0
 */
export function catchSomeCause<E, R1, E1, B>(
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSomeCause_(ma, pf)
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 *
 * @trace 2
 */
export function collectManaged_<R, E, A, E1, R2, E2, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): Managed<R & R2, E | E1 | E2, B> {
  return chain_(
    ma,
    traceAs(pf, (a) => O.getOrElse_(pf(a), () => fail<E1 | E2>(e)))
  )
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst collectManaged_
 * @trace 1
 */
export function collectManaged<A, E1, R2, E2, B>(
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R2, E1 | E | E2, B> {
  return (ma) => collectManaged_(ma, e, pf)
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @trace 2
 */
export function collect_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<B>
): Managed<R, E | E1, B> {
  return collectManaged_(ma, e, traceAs(pf, flow(pf, O.map(succeed))))
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst collect_
 * @trace 1
 */
export function collect<A, E1, B>(
  e: E1,
  pf: (a: A) => O.Option<B>
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, B> {
  return (ma) => collect_(ma, e, pf)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @trace call
 */
export function collectAll<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return traceCall(foreach_, trace)(mas, identityFn)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllPar_`.
 *
 * @trace call
 */
export function collectAllUnit<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, void> {
  const trace = accessCallTrace()
  return traceCall(foreachUnit_, trace)(mas, identityFn)
}

/**
 * @trace call
 */
export function pipeTo_<R, E, A, E1, B>(ma: Managed<R, E, A>, mb: Managed<A, E1, B>): Managed<R, E | E1, B> {
  const trace = accessCallTrace()
  return chain_(
    ma,
    traceFrom(trace, (a) => giveAll_(mb, a))
  )
}

/**
 * @trace call
 */
export function pipeTo<A, E1, B>(mb: Managed<A, E1, B>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E | E1, B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(pipeTo_, trace)(ma, mb)
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 *
 * @trace call
 */
export function compose_<R, E, A, R1, E1>(ma: Managed<R, E, A>, mr: Managed<R1, E1, R>): Managed<R1, E | E1, A> {
  const trace = accessCallTrace()
  return pipe(ask<R1>(), chain(traceFrom(trace, (r1) => give_(mr, r1))), chain(traceFrom(trace, (r) => give_(ma, r))))
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 *
 * @trace call
 */
export function compose<R, R1, E1>(mr: Managed<R1, E1, R>): <E, A>(ma: Managed<R, E, A>) => Managed<R1, E | E1, A> {
  return (ma) => compose_(ma, mr)
}

/**
 * Returns a Managed that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 *
 * @trace call
 */
export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  const trace = accessCallTrace()
  return new Managed(traceCall(I.eventually, trace)(ma.io))
}

/**
 * Effectfully map the error channel
 *
 * @trace 1
 */
export function chainError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => URManaged<R1, E1>
): Managed<R & R1, E1, A> {
  return swapWith_(ma, chain(f))
}

/**
 * Effectfully map the error channel
 *
 * @dataFirst chainError_
 * @trace 0
 */
export function chainError<E, R1, E1>(
  f: (e: E) => URManaged<R1, E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A> {
  return (ma) => chainError_(ma, f)
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 *
 * @trace 2
 */
export function foldl_<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => Managed<R, E, B>): Managed<R, E, B> {
  return A.foldl_(Array.from(as), succeed(b) as Managed<R, E, B>, (acc, v) =>
    chain_(
      acc,
      traceAs(f, (a) => f(a, v))
    )
  )
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 *
 * @dataFirst foldl_
 * @trace 1
 */
export function foldl<R, E, A, B>(b: B, f: (b: B, a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, B> {
  return (as) => foldl_(as, b, f)
}

/**
 * Combines an array of `Managed` effects using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap_<M>(M: P.Monoid<M>) {
  /**
   * @trace 1
   */
  return <R, E, A>(mas: Iterable<Managed<R, E, A>>, f: (a: A) => M): Managed<R, E, M> =>
    foldl_(mas, M.nat, (x, ma) =>
      pipe(
        ma,
        map(
          traceAs(
            f,
            flow(f, (y) => M.combine_(x, y))
          )
        )
      )
    )
}

/**
 * Combines an array of `Managed` effects using a `Monoid`
 *
 * @dataFirst foldMap_
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap<M>(M: P.Monoid<M>) {
  return <A>(
      /**
       * @trace 0
       */
      f: (a: A) => M
    ) =>
    <R, E>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, M> =>
      foldMap_(M)(mas, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 *
 * @trace 1
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) {
  return new Managed<R, E, Chunk<B>>(
    I.map_(
      I.foreach_(
        as,
        traceAs(f, (a) => f(a).io)
      ),
      (res) => {
        const fins = Ch.map_(res, (k) => k[0])
        const as   = Ch.map_(res, (k) => k[1])

        return [(e) => I.foreach_(Ch.reverse(fins), (fin) => fin(e)), as]
      }
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @dataFirst foreach_
 * @trace 0
 */
export function foreach<R, E, A, B>(f: (a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreach_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @trace 1
 */
export function foreachUnit_<R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> {
  return new Managed(
    pipe(
      as,
      I.foreach(traceAs(f, (a) => f(a).io)),
      I.map((result) => {
        const fins = Ch.map_(result, (k) => k[0])

        return [(e) => I.foreach_(Ch.reverse(fins), (fin) => fin(e)), undefined]
      })
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @dataFirst foreachUnit_
 * @trace 0
 */
export function foreachUnit<R, E, A>(f: (a: A) => Managed<R, E, unknown>): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnit_(as, f)
}

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 *
 * @trace call
 */
export function get<R, A>(ma: Managed<R, never, O.Option<A>>): Managed<R, O.Option<never>, A> {
  const trace = accessCallTrace()
  return traceCall(
    subsumeEither,
    trace
  )(
    map_(
      ma,
      E.fromOption(() => O.none())
    )
  )
}
/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @trace call
 */
export function ifManaged_<R, E, R1, E1, B, R2, E2, C>(
  mb: Managed<R, E, boolean>,
  onTrue: Managed<R1, E1, B>,
  onFalse: Managed<R2, E2, C>
): Managed<R & R1 & R2, E | E1 | E2, B | C> {
  const trace = accessCallTrace()
  return chain_(
    mb,
    traceFrom(trace, (b) => (b ? (onTrue as Managed<R & R1 & R2, E | E1 | E2, B | C>) : onFalse))
  )
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @dataFirst ifManaged_
 * @trace call
 */
export function ifManaged<R1, E1, B, R2, E2, C>(onTrue: Managed<R1, E1, B>, onFalse: Managed<R2, E2, C>) {
  return <R, E>(mb: Managed<R, E, boolean>): Managed<R & R1 & R2, E | E1 | E2, B | C> => ifManaged_(mb, onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @trace call
 */
export function if_<R, E, A, R1, E1, B>(
  b: boolean,
  onTrue: Managed<R, E, A>,
  onFalse: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return traceCall(ifManaged_, trace)(succeed(b), onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @dataFirst if_
 * @trace call
 */
function _if<R, E, A, R1, E1, B>(onTrue: Managed<R, E, A>, onFalse: Managed<R1, E1, B>) {
  return (b: boolean): Managed<R & R1, E | E1, A | B> => if_(b, onTrue, onFalse)
}
export { _if as if }

/**
 * Ignores the success or failure of a Managed
 *
 * @trace call
 */
export function ignore<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, void> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => {
      /* */
    }),
    traceFrom(trace, () => {
      /* */
    })
  )
}

/**
 * Returns a new managed effect that ignores defects in finalizers.
 *
 * @trace call
 */
export function ignoreReleaseFailures<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, A> {
  const trace = accessCallTrace()
  return new Managed(
    pipe(
      I.ask<readonly [R, ReleaseMap]>(),
      I.tap(
        traceFrom(trace, ([, rm]) =>
          updateAll(
            rm,
            (finalizer) => (exit) =>
              pipe(
                finalizer(exit),
                I.catchAllCause(() => I.unit())
              )
          )
        )
      ),
      I.crossSecond(ma.io)
    )
  )
}

/**
 * Returns a Managed that is interrupted as if by the fiber calling this
 * method.
 *
 * @trace call
 */
export function interrupt(): Managed<unknown, never, never> {
  const trace = accessCallTrace()
  return chain_(
    fromIO(I.descriptorWith((d) => I.succeed(d.id))),
    traceFrom(trace, (id) => halt(C.interrupt(id)))
  )
}

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): Managed<unknown, never, never> {
  return halt(C.interrupt(fiberId))
}

/**
 * Returns whether this managed effect is a failure.
 *
 * @trace call
 */
export function isFailure<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => true),
    traceFrom(trace, () => false)
  )
}

/**
 * Returns whether this managed effect is a success.
 *
 * @trace call
 */
export function isSuccess<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => false),
    traceFrom(trace, () => true)
  )
}

/**
 * Depending on the environment execute this or the other effect
 *
 * @trace call
 */
export function join_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, A | A1> {
  const trace = accessCallTrace()
  return chain_(
    ask<E.Either<R, R1>>(),
    traceFrom(
      trace,
      E.match(
        (r): FManaged<E | E1, A | A1> => giveAll_(ma, r),
        (r1) => giveAll_(that, r1)
      )
    )
  )
}

/**
 * Depending on the environment execute this or the other effect
 *
 * @dataFirst join_
 * @trace call
 */
export function join<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, A1 | A> {
  return (ma) => join_(ma, that)
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @trace call
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  const trace = accessCallTrace()
  return chain_(
    ask<E.Either<R, R1>>(),
    traceFrom(
      trace,
      E.match(
        (r): FManaged<E | E1, E.Either<A, A1>> => giveAll_(map_(ma, E.left), r),
        (r1) => giveAll_(map_(that, E.right), r1)
      )
    )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @dataFirst joinEither_
 * @trace call
 */
export function joinEither<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, E.Either<A, A1>> {
  return (ma) => joinEither_(ma, that)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @trace 1
 */
export function mapTryCatch_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  f: (a: A) => B,
  onThrow: (error: unknown) => E1
): Managed<R, E | E1, B> {
  return matchManaged_(
    ma,
    fail,
    traceAs(f, (a) => tryCatch_(() => f(a), onThrow))
  )
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @dataFirst mapTryCatch_
 * @trace 0
 */
export function mapTryCatch<A, E1, B>(
  f: (a: A) => B,
  onThrow: (error: unknown) => E1
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E | E1, B> {
  return (ma) => mapTryCatch_(ma, f, onThrow)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 *
 * @trace 1
 */
export function mapTry_<R, E, A, B>(ma: Managed<R, E, A>, f: (a: A) => B): Managed<R, unknown, B> {
  return mapTryCatch_(ma, f, identityFn)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 *
 * @dataFirst mapTry_
 * @trace 0
 */
export function mapTry<A, B>(f: (a: A) => B): <R, E>(ma: Managed<R, E, A>) => Managed<R, unknown, B> {
  return (ma) => mapTry_(ma, f)
}

/**
 * Returns a new Managed where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @trace call
 */
export function merge<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E | A> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    traceFrom(trace, (e) => succeed(e)),
    traceFrom(trace, (a) => succeed(a))
  )
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 *
 * @trace 2
 */
export function mergeAll_<R, E, A, B>(mas: Iterable<Managed<R, E, A>>, b: B, f: (b: B, a: A) => B): Managed<R, E, B> {
  return Iter.foldl_(mas, succeed(b) as Managed<R, E, B>, (b, a) => crossWith_(b, a, f))
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 *
 * @dataFirst mergeAll_
 * @trace 1
 */
export function mergeAll<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAll_(mas, b, f)
}

/**
 * Requires the option produced by this value to be `None`.
 *
 * @trace call
 */
export function none<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, O.Option<E>, void> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    traceFrom(trace, flow(O.some, fail)),
    traceFrom(
      trace,
      O.match(
        () => unit(),
        () => fail(O.none())
      )
    )
  )
}

/**
 * Executes this effect, skipping the error but returning optionally the success.
 *
 * @trace call
 */
export function option<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, O.Option<A>> {
  const trace = accessCallTrace()
  return match_(
    ma,
    traceFrom(trace, () => O.none()),
    traceFrom(trace, (a) => O.some(a))
  )
}

/**
 * Converts an option on errors into an option on values.
 *
 * @trace call
 */
export function optional<R, E, A>(ma: Managed<R, O.Option<E>, A>): Managed<R, E, O.Option<A>> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    traceFrom(
      trace,
      O.match(() => succeed(O.none()), fail)
    ),
    traceFrom(trace, flow(O.some, succeed))
  )
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into an unknown`.
 *
 * @trace 1
 */
export function orDieWith_<R, E, A>(ma: Managed<R, E, A>, f: (e: E) => unknown): Managed<R, never, A> {
  return new Managed(I.orDieWith_(ma.io, f))
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into an unknown.
 *
 * @dataFirst orDieWith_
 * @trace 0
 */
export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: Managed<R, E, A>) => Managed<R, never, A> {
  return (ma) => orDieWith_(ma, f)
}

/**
 * Translates effect failure into death of the fiber, making all failures unchecked and
 * not a part of the type of the effect.
 *
 * @trace call
 */
export function orDie<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  const trace = accessCallTrace()
  return orDieWith_(
    ma,
    traceFrom(trace, (e) => e)
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @trace call
 * @trace 1
 */
export function orElse_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    that,
    traceFrom(trace, (a) => succeed(a))
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @dataFirst orElse_
 * @trace call
 * @trace 0
 */
export function orElse<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(orElse_, trace)(ma, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @trace call
 * @trace 1
 */
export function orElseEither_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    traceAs(that, () => map_(that(), E.left)),
    traceFrom(trace, flow(E.right, succeed))
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @dataFirst orElseEither_
 * @trace call
 * @trace 0
 */
export function orElseEither<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, E.Either<B, A>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(orElseEither_, trace)(ma, that)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @trace call
 * @trace 1
 */
export function orElseFail_<R, E, A, E1>(ma: Managed<R, E, A>, e: () => E1): Managed<R, E | E1, A> {
  const trace = accessCallTrace()
  return traceCall(orElse_, trace)(
    ma,
    traceAs(e, () => fail(e()))
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @dataFirst orElseFail_
 * @trace call
 * @trace 0
 */
export function orElseFail<E1>(e: () => E1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(orElseFail_, trace)(ma, e)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @trace 1
 */
export function orElseOptional_<R, E, A, R1, E1, B>(
  ma: Managed<R, O.Option<E>, A>,
  that: () => Managed<R1, O.Option<E1>, B>
): Managed<R & R1, O.Option<E | E1>, A | B> {
  return catchAll_(
    ma,
    traceAs(
      that,
      O.match(
        () => that(),
        (e) => fail(O.some<E | E1>(e))
      )
    )
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @dataFirst orElseOptional_
 * @trace 0
 */
export function orElseOptional<R1, E1, B>(
  that: () => Managed<R1, O.Option<E1>, B>
): <R, E, A>(ma: Managed<R, O.Option<E>, A>) => Managed<R & R1, O.Option<E | E1>, A | B> {
  return (ma) => orElseOptional_(ma, that)
}

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @trace 1
 */
export function orElseSucceed_<R, E, A, A1>(ma: Managed<R, E, A>, that: () => A1): Managed<R, E, A | A1> {
  return orElse_(
    ma,
    traceAs(that, () => succeed(that()))
  )
}

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @dataFirst orElseSucceed_
 * @trace 0
 */
export function orElseSucceed<A1>(that: () => A1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, A1 | A> {
  return (ma) => orElseSucceed_(ma, that)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @trace call
 */
export function refineOrDieWith_<R, E, A, E1>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): Managed<R, E1, A> {
  const trace = accessCallTrace()
  return catchAll_(
    ma,
    traceFrom(trace, (e) => O.match_(pf(e), () => die(f(e)), fail))
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @dataFirst refineOrDieWith_
 * @trace call
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(refineOrDieWith_, trace)(ma, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @trace call
 */
export function refineOrDie_<R, E, A, E1>(ma: Managed<R, E, A>, pf: (e: E) => O.Option<E1>): Managed<R, E1, A> {
  const trace = accessCallTrace()
  return traceCall(refineOrDieWith_, trace)(ma, pf, identityFn)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @dataFirst refineOrDie_
 * @trace call
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(refineOrDie_, trace)(ma, pf)
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @trace 1
 */
export function rejectManaged_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): Managed<R & R1, E | E1, A> {
  return chain_(
    ma,
    traceAs(pf, (a) => O.match_(pf(a), () => succeed(a), chain(fail)))
  )
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @dataFirst rejectManaged_
 * @trace 0
 */
export function rejectManaged<A, R1, E1>(
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => rejectManaged_(ma, pf)
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 *
 * @trace 1
 */
export function reject_<R, E, A, E1>(ma: Managed<R, E, A>, pf: (a: A) => O.Option<E1>): Managed<R, E | E1, A> {
  return rejectManaged_(
    ma,
    traceAs(pf, (a) => O.map_(pf(a), fail))
  )
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 *
 * @dataFirst reject_
 * @trace 0
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => reject_(ma, pf)
}

/**
 * @trace 1
 */
export function require_<R, E, A>(ma: Managed<R, E, O.Option<A>>, error: () => E): Managed<R, E, A> {
  return chain_(
    ma,
    traceAs(
      error,
      O.match(() => chain_(succeedLazy(error), fail), succeed)
    )
  )
}

/**
 * @dataFirst require_
 * @trace 0
 */
function _require<E>(error: () => E): <R, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A> {
  return (ma) => require_(ma, error)
}
export { _require as require }

/**
 * Returns a Managed that semantically runs the Managed on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @trace call
 */
export function result<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, Ex.Exit<E, A>> {
  const trace = accessCallTrace()
  return matchCauseManaged_(
    ma,
    traceFrom(trace, (cause) => succeed(Ex.halt(cause))),
    traceFrom(trace, (a) => succeed(Ex.succeed(a)))
  )
}

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @trace 1
 */
export function someOrElse_<R, E, A, B>(ma: Managed<R, E, O.Option<A>>, onNone: () => B): Managed<R, E, A | B> {
  return map_(
    ma,
    traceAs(onNone, (_) => O.getOrElse_(_, onNone))
  )
}

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @dataFirst someOrElse_
 * @trace 0
 */
export function someOrElse<B>(onNone: () => B): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A | B> {
  return (ma) => someOrElse_(ma, onNone)
}

/**
 * Extracts the optional value, or executes the effect 'default'.
 *
 * @trace call
 */
export function someOrElseManaged_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, O.Option<A>>,
  onNone: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return chain_(
    ma,
    traceFrom(
      trace,
      O.match((): Managed<R1, E1, A | B> => onNone, succeed)
    )
  )
}

/**
 * Extracts the optional value, or executes the effect 'default'.
 *
 * @dataFirst someOrElseManaged_
 * @trace call
 */
export function someOrElseManaged<R1, E1, B>(
  onNone: Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R & R1, E | E1, A | B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(someOrElseManaged_, trace)(ma, onNone)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @trace 1
 */
export function someOrFailWith_<R, E, A, E1>(ma: Managed<R, E, O.Option<A>>, e: () => E1): Managed<R, E | E1, A> {
  return chain_(
    ma,
    traceAs(
      e,
      O.match(() => fail(e()), succeed)
    )
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @dataFirst someOrFailWith_
 * @trace 0
 */
export function someOrFailWith<E1>(e: () => E1): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E | E1, A> {
  return (ma) => someOrFailWith_(ma, e)
}

/**
 * Extracts the optional value, or fails with a NoSuchElementError
 *
 * @trace call
 */
export function someOrFail<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, E | NoSuchElementError, A> {
  const trace = accessCallTrace()
  return someOrFailWith_(
    ma,
    traceFrom(trace, () => new NoSuchElementError('Managed.someOrFail'))
  )
}

/**
 * Swaps the error and result
 *
 * @trace call
 */
export function swap<R, E, A>(ma: Managed<R, E, A>): Managed<R, A, E> {
  const trace = accessCallTrace()
  return matchManaged_(
    ma,
    traceFrom(trace, (e) => succeed(e)),
    traceFrom(trace, (a) => fail(a))
  )
}

/**
 * Swap the error and result, then apply an effectful function to the effect
 *
 * @trace call
 */
export function swapWith_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): Managed<R1, E1, B> {
  const trace = accessCallTrace()
  return traceCall(swap, trace)(f(swap(ma)))
}

/**
 * Swap the error and result, then apply an effectful function to the effect
 *
 * @dataFirst swapWith_
 * @trace call
 */
export function swapWith<R, E, A, R1, E1, B>(
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): (ma: Managed<R, E, A>) => Managed<R1, E1, B> {
  const trace = accessCallTrace()
  return (ma) => traceCall(swapWith_, trace)(ma, f)
}

/**
 * Exposes the full cause of failure of this Managed.
 *
 * @trace call
 */
export function sandbox<R, E, A>(ma: Managed<R, E, A>): Managed<R, Cause<E>, A> {
  const trace = accessCallTrace()
  return new Managed(traceCall(I.sandbox, trace)(ma.io))
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @trace call
 */
export function sandboxWith<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (ma: Managed<R, Cause<E>, A>) => Managed<R1, Cause<E1>, B>
): Managed<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return traceCall(unsandbox, trace)(f(sandbox(ma)))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @trace 1
 */
export function unless_<R, E, A>(ma: Managed<R, E, A>, b: () => boolean): Managed<R, E, void> {
  return defer(traceAs(b, () => (b() ? unit() : asUnit(ma))))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @dataFirst unless_
 * @trace 0
 */
export function unless(b: () => boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => unless_(ma, b)
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @trace call
 */
export function unlessManaged_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  const trace = accessCallTrace()
  return chain_(
    mb,
    traceFrom(trace, (b) => (b ? unit() : asUnit(ma)))
  )
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @dataFirst unlessManaged_
 * @trace call
 */
export function unlessManaged<R1, E1>(
  mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
  const trace = accessCallTrace()
  return (ma) => traceCall(unlessManaged_, trace)(ma, mb)
}

/**
 * The inverse operation of `sandbox`
 *
 * @trace call
 */
export function unsandbox<R, E, A>(ma: Managed<R, Cause<E>, A>): Managed<R, E, A> {
  const trace = accessCallTrace()
  return mapErrorCause_(
    ma,
    traceFrom(trace, (c) => C.flatten(c))
  )
}

/**
 * Unwraps a `Managed` that is inside an `IO`.
 *
 * @trace call
 */
export function unwrap<R, E, R1, E1, A>(fa: I.IO<R, E, Managed<R1, E1, A>>): Managed<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return traceCall(flatten, trace)(fromIO(fa))
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @trace 1
 */
export function when_<R, E, A>(ma: Managed<R, E, A>, b: () => boolean): Managed<R, E, void> {
  return defer(traceAs(b, () => (b() ? asUnit(ma) : unit())))
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @dataFirst when_
 * @trace 0
 */
export function when(b: () => boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => when_(ma, b)
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @trace call
 */
export function whenManaged_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  const trace = accessCallTrace()
  return chain_(
    mb,
    traceFrom(trace, (b) => (b ? asUnit(ma) : unit()))
  )
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @dataFirst whenManaged_
 * @trace call
 */
export function whenManaged<R1, E1>(
  mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
  const trace = accessCallTrace()
  return (ma) => traceCall(whenManaged_, trace)(ma, mb)
}

/**
 * Zips this Managed with its environment
 *
 * @trace call
 */
export function zipEnv<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [A, R]> {
  const trace = accessCallTrace()
  return traceCall(cross_, trace)(ma, ask<R>())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Service
 * -------------------------------------------------------------------------------------------------
 */

export function askService<T>(t: Tag<T>): Managed<Has<T>, never, T> {
  return asks(t.read)
}

export function asksService<T>(t: Tag<T>): <A>(f: (a: T) => A) => Managed<Has<T>, never, A> {
  return (f) => asks(flow(t.read, f))
}

export function asksServiceIO<T>(t: Tag<T>): <R, E, A>(f: (a: T) => I.IO<R, E, A>) => Managed<Has<T> & R, E, A> {
  return (f) => asksIO(flow(t.read, f))
}

export function asksServiceManaged<T>(
  t: Tag<T>
): <R, E, A>(f: (a: T) => Managed<R, E, A>) => Managed<Has<T> & R, E, A> {
  return (f) => asksManaged(flow(t.read, f))
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesIO<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
  E,
  B
> {
  return (f) =>
    asksIO(
      (r: P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
        f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesManaged<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
  E,
  B
> {
  return (f) =>
    asksManaged(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTIO<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
  E,
  B
> {
  return (f) =>
    asksIO(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesTManaged<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
  E,
  B
> {
  return (f) =>
    asksManaged(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  never,
  B
> {
  return (f) =>
    asks(
      (
        r: P.UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
  P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  never,
  B
> {
  return (f) =>
    asks((r: P.UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Maps the success value of this Managed to a service.
 */
export function asService_<R, E, A>(ma: Managed<R, E, A>, tag: Tag<A>): Managed<R, E, Has<A>> {
  return map_(ma, tag.of)
}

/**
 * Maps the success value of this Managed to a service.
 */
export function asService<A>(tag: Tag<A>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E, Has<A>> {
  return (ma) => asService_(ma, tag)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Do
 * -------------------------------------------------------------------------------------------------
 */

const of = succeed({})
export { of as do }

/**
 * @trace 2
 */
export function chainS_<R, E, K, N extends string, R1, E1, A1>(
  mk: Managed<R, E, K>,
  name: Exclude<N, keyof K>,
  f: (_: K) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, { [k in N | keyof K]: k extends keyof K ? K[k] : A1 }> {
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

export function chainS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>
): <R2, E2>(
  mk: Managed<R2, E2, K>
) => Managed<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> {
  return chain((a) =>
    pipe(
      f(a),
      map((b) => Object.assign(a, { [name]: b } as any))
    )
  )
}

/**
 * @trace call
 */
export function toS_<R, E, A, N extends string>(ma: Managed<R, E, A>, name: N): Managed<R, E, { [k in N]: A }> {
  const trace = accessCallTrace()
  return map_(
    ma,
    traceFrom(trace, (a) => ({ [name]: a } as any))
  )
}

/**
 * @trace call
 */
export function toS<N extends string>(name: N): <R, E, A>(fa: Managed<R, E, A>) => Managed<R, E, { [k in N]: A }> {
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
  mk: Managed<R, E, K>,
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): Managed<R, E, { [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return chainS_(mk, name, traceAs(f, flow(f, succeed)))
}

export function pureS<K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): <R2, E2>(mk: Managed<R2, E2, K>) => Managed<R2, E2, { [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return chainS(name, flow(f, succeed))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

export class GenManaged<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly M: Managed<R, E, A>, readonly _trace?: string) {}

  *[Symbol.iterator](): Generator<GenManaged<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenManaged(asksService(_)(identityFn), adapter['$trace'])
  }
  if (E.isEither(_)) {
    return new GenManaged(
      fromEitherLazy(() => _),
      adapter['$trace']
    )
  }
  if (O.isOption(_)) {
    return new GenManaged(
      __ ? (_._tag === 'None' ? fail(__()) : succeed(_.value)) : fromIO(I.getOrFail(_)),
      adapter['$trace']
    )
  }
  if (_ instanceof Managed) {
    return new GenManaged(_, adapter['$trace'])
  }
  return new GenManaged(fromIO(_), adapter['$trace'])
}

/**
 * @trace call
 */
export function gen<T extends GenManaged<any, any, any>, A>(
  f: (i: {
    /**
     * @trace call
     */
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>
    /**
     * @trace call
     */
    <E, A>(_: O.Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    /**
     * @trace call
     */
    <A>(_: O.Option<A>): GenManaged<unknown, NoSuchElementError, A>
    /**
     * @trace call
     */
    <E, A>(_: E.Either<E, A>): GenManaged<unknown, E, A>
    /**
     * @trace call
     */
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    /**
     * @trace call
     */
    <R, E, A>(_: I.IO<R, E, A>): GenManaged<R, E, A>
  }) => Generator<T, A, any>
): Managed<P._R<T>, P._E<T>, A> {
  const trace = accessCallTrace()
  return defer(
    traceFrom(trace, () => {
      const iterator = f(adapter as any)
      const state    = iterator.next()

      function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): Managed<any, any, A> {
        if (state.done) {
          return succeed(state.value)
        }
        const f = (val: any) => {
          const next = iterator.next(val)
          return run(next)
        }
        if (state.value._trace) {
          // eslint-disable-next-line functional/immutable-data
          f['$trace'] = state.value._trace
        }
        return chain_(state.value.M, f)
      }

      return run(state)
    })
  )
}
