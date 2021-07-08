import type { Cause } from './Cause'
import type { Exit } from './Exit'
import type { FiberId } from './Fiber/FiberId'
import type { FIO } from './IO/core'
import type { Option } from './Option'

import * as E from './Either'
import { asyncInterruptEither, interruptAs as interruptAsIO, uninterruptibleMask } from './IO/combinators/interrupt'
import * as I from './IO/core'
import * as O from './Option'
import * as P from './prelude'
import { AtomicReference } from './util/support/AtomicReference'

export class Promise<E, A> {
  constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {}
}

export const URI = 'Promise'

export type URI = typeof URI

export type State<E, A> = Done<E, A> | Pending<E, A>

export class Done<E, A> {
  readonly _tag = 'Done'
  constructor(readonly value: FIO<E, A>) {}
}

export class Pending<E, A> {
  readonly _tag = 'Pending'
  constructor(readonly joiners: ReadonlyArray<(_: FIO<E, A>) => void>) {}
}

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function fulfill_<R, E, A>(promise: Promise<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean> {
  return uninterruptibleMask(({ restore }) => I.chain_(I.result(restore(io)), (exit) => done_(promise, exit)))
}

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @dataFirst fulfill_
 */
export function fulfill<R, E, A>(io: I.IO<R, E, A>): (promise: Promise<E, A>) => I.IO<R, never, boolean> {
  return (promise) => fulfill_(promise, io)
}

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an IO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an IO see
 * `Promise.complete`.
 */
export function fulfillWith_<E, A>(promise: Promise<E, A>, io: FIO<E, A>): I.UIO<boolean> {
  return I.succeedLazy(() => {
    const state = promise.state.get
    switch (state._tag) {
      case 'Done': {
        return false
      }
      case 'Pending': {
        promise.state.set(new Done(io))
        state.joiners.forEach((f) => {
          f(io)
        })
        return true
      }
    }
  })
}

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an IO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an IO see
 * `Promise.complete`.
 *
 * @dataFirst fulfillWith_
 */
export function fulfillWith<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>): I.UIO<boolean> => fulfillWith_(promise, io)
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die_<E, A>(promise: Promise<E, A>, defect: unknown): I.UIO<boolean> {
  return fulfillWith_(promise, I.die(defect))
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst die_
 */
export function die(defect: unknown) {
  return <E, A>(promise: Promise<E, A>) => die_(promise, defect)
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done_<E, A>(promise: Promise<E, A>, exit: Exit<E, A>): I.UIO<boolean> {
  return fulfillWith_(promise, I.done(exit))
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst done_
 */
export function done<E, A>(exit: Exit<E, A>): (promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => done_(promise, exit)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail_<E, A>(promise: Promise<E, A>, e: E): I.UIO<boolean> {
  return fulfillWith_(promise, I.fail(e))
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst fail_
 */
export function fail<E>(e: E): <A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => fail_(promise, e)
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt_<E, A>(promise: Promise<E, A>, cause: Cause<E>): I.UIO<boolean> {
  return fulfillWith_(promise, I.halt(cause))
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @dataFirst halt_
 */
export function halt<E>(cause: Cause<E>): <A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => halt_(promise, cause)
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>): I.UIO<boolean> {
  return P.pipe(
    I.fiberId(),
    I.chain((id) => fulfillWith_(promise, interruptAsIO(id)))
  )
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export function interruptAs_<E, A>(promise: Promise<E, A>, id: FiberId): I.UIO<boolean> {
  return fulfillWith_(promise, interruptAsIO(id))
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 *
 * @dataFirst interruptAs_
 */
export function interruptAs(id: FiberId): <E, A>(promise: Promise<E, A>) => I.UIO<boolean> {
  return (promise) => interruptAs_(promise, id)
}

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: Promise<E, A>): I.UIO<boolean> {
  return I.succeedLazy(() => promise.state.get._tag === 'Done')
}

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return I.chain_(I.fiberId(), (id) => makeAs<E, A>(id))
}

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberId) {
  return I.succeedLazy(() => unsafeMake<E, A>(fiberId))
}

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(promise: Promise<E, A>): I.UIO<Option<FIO<E, A>>> {
  return I.succeedLazy(() => {
    const state = promise.state.get

    switch (state._tag) {
      case 'Done': {
        return O.some(state.value)
      }
      case 'Pending': {
        return O.none()
      }
    }
  })
}

/**
 * Completes the promise with the specified value.
 */
export function succeed_<A, E>(promise: Promise<E, A>, a: A) {
  return fulfillWith_(promise, I.succeed(a))
}

/**
 * Completes the promise with the specified value.
 *
 * @dataFirst succeed_
 */
export function succeed<A>(a: A) {
  return <E>(promise: Promise<E, A>) => succeed_(promise, a)
}

export function unsafeDone_<E, A>(promise: Promise<E, A>, io: FIO<E, A>) {
  const state = promise.state.get
  if (state._tag === 'Pending') {
    promise.state.set(new Done(io))
    Array.from(state.joiners)
      .reverse()
      .forEach((f) => {
        f(io)
      })
  }
}

/**
 * Unsafe version of done
 */
export function unsafeDone<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>) => unsafeDone_(promise, io)
}

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(promise: Promise<E, A>): I.IO<unknown, E, A> {
  return asyncInterruptEither<unknown, E, A>((k) => {
    let result
    let retry = true
    while (retry) {
      const oldState = promise.state.get
      let newState
      switch (oldState._tag) {
        case 'Done': {
          newState = oldState
          result   = E.right(oldState.value)
          break
        }
        case 'Pending': {
          newState = new Pending([k, ...oldState.joiners])
          result   = E.left(interruptJoiner(promise, k))
          break
        }
      }
      retry = !promise.state.compareAndSet(oldState, newState)
    }
    return result as any
  }, promise.blockingOn)
}

export { wait as await }

function interruptJoiner<E, A>(promise: Promise<E, A>, joiner: (a: FIO<E, A>) => void): I.Canceler<unknown> {
  return I.succeedLazy(() => {
    let retry = true
    while (retry) {
      const oldState = promise.state.get
      let newState
      switch (oldState._tag) {
        case 'Pending': {
          newState = new Pending(oldState.joiners.filter((j) => j !== joiner))
          break
        }
        case 'Done': {
          newState = oldState
          break
        }
      }
      retry = !promise.state.compareAndSet(oldState, newState)
    }
  })
}
