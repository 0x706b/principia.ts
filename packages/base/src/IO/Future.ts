import type { Maybe } from '../Maybe'
import type { Cause } from './Cause'
import type { Exit } from './Exit'
import type { FiberId } from './Fiber/FiberId'
import type { FIO } from './IO/core'

import * as E from '../Either'
import { pipe } from '../function'
import * as M from '../Maybe'
import { AtomicReference } from '../util/support/AtomicReference'
import { asyncInterruptEither, interruptAs as interruptAsIO, uninterruptibleMask } from './IO/combinators/interrupt'
import * as I from './IO/core'

export class Future<E, A> {
  constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {}
}

export const URI = 'Future'

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
 * Completes the future with the result of the specified effect. If the
 * future has already been completed, the method will produce false.
 *
 * Note that `Future.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function fulfill_<R, E, A>(future: Future<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean> {
  return uninterruptibleMask(({ restore }) => I.chain_(I.result(restore(io)), (exit) => done_(future, exit)))
}

/**
 * Completes the future with the result of the specified effect. If the
 * future has already been completed, the method will produce false.
 *
 * Note that `Future.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @dataFirst fulfill_
 */
export function fulfill<R, E, A>(io: I.IO<R, E, A>): (future: Future<E, A>) => I.IO<R, never, boolean> {
  return (future) => fulfill_(future, io)
}

/**
 * Completes the future with the specified effect. If the future has
 * already been completed, the method will produce false.
 *
 * Note that since the future is completed with an IO, the effect will
 * be evaluated each time the value of the future is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Future` is that the
 * future can be completed with exactly one effect. For a version that
 * completes the future with the result of an IO see
 * `Future.complete`.
 */
export function fulfillWith_<E, A>(future: Future<E, A>, io: FIO<E, A>): I.UIO<boolean> {
  return I.succeedLazy(() => {
    const state = future.state.get
    switch (state._tag) {
      case 'Done': {
        return false
      }
      case 'Pending': {
        future.state.set(new Done(io))
        state.joiners.forEach((f) => {
          f(io)
        })
        return true
      }
    }
  })
}

/**
 * Completes the future with the specified effect. If the future has
 * already been completed, the method will produce false.
 *
 * Note that since the future is completed with an IO, the effect will
 * be evaluated each time the value of the future is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Future` is that the
 * future can be completed with exactly one effect. For a version that
 * completes the future with the result of an IO see
 * `Future.complete`.
 *
 * @dataFirst fulfillWith_
 */
export function fulfillWith<E, A>(io: FIO<E, A>) {
  return (future: Future<E, A>): I.UIO<boolean> => fulfillWith_(future, io)
}

/**
 * Kills the future with the specified error, which will be propagated to all
 * fibers waiting on the value of the future.
 */
export function halt_<E, A>(future: Future<E, A>, defect: unknown): I.UIO<boolean> {
  return fulfillWith_(future, I.halt(defect))
}

/**
 * Kills the future with the specified error, which will be propagated to all
 * fibers waiting on the value of the future.
 *
 * @dataFirst halt_
 */
export function halt(defect: unknown) {
  return <E, A>(future: Future<E, A>) => halt_(future, defect)
}

/**
 * Exits the future with the specified exit, which will be propagated to all
 * fibers waiting on the value of the future.
 */
export function done_<E, A>(future: Future<E, A>, exit: Exit<E, A>): I.UIO<boolean> {
  return fulfillWith_(future, I.fromExit(exit))
}

/**
 * Exits the future with the specified exit, which will be propagated to all
 * fibers waiting on the value of the future.
 *
 * @dataFirst done_
 */
export function done<E, A>(exit: Exit<E, A>): (future: Future<E, A>) => I.UIO<boolean> {
  return (future) => done_(future, exit)
}

/**
 * Fails the future with the specified error, which will be propagated to all
 * fibers waiting on the value of the future.
 */
export function fail_<E, A>(future: Future<E, A>, e: E): I.UIO<boolean> {
  return fulfillWith_(future, I.fail(e))
}

/**
 * Fails the future with the specified error, which will be propagated to all
 * fibers waiting on the value of the future.
 *
 * @dataFirst fail_
 */
export function fail<E>(e: E): <A>(future: Future<E, A>) => I.UIO<boolean> {
  return (future) => fail_(future, e)
}

/**
 * Halts the future with the specified cause, which will be propagated to all
 * fibers waiting on the value of the future.
 */
export function failCause_<E, A>(future: Future<E, A>, cause: Cause<E>): I.UIO<boolean> {
  return fulfillWith_(future, I.failCause(cause))
}

/**
 * Halts the future with the specified cause, which will be propagated to all
 * fibers waiting on the value of the future.
 *
 * @dataFirst failCause_
 */
export function failCause<E>(cause: Cause<E>): <A>(future: Future<E, A>) => I.UIO<boolean> {
  return (future) => failCause_(future, cause)
}

/**
 * Completes the future with interruption. This will interrupt all fibers
 * waiting on the value of the future as by the fiber calling this method.
 */
export function interrupt<E, A>(future: Future<E, A>): I.UIO<boolean> {
  return pipe(
    I.fiberId(),
    I.chain((id) => fulfillWith_(future, interruptAsIO(id)))
  )
}

/**
 * Completes the future with interruption. This will interrupt all fibers
 * waiting on the value of the future as by the specified fiber.
 */
export function interruptAs_<E, A>(future: Future<E, A>, id: FiberId): I.UIO<boolean> {
  return fulfillWith_(future, interruptAsIO(id))
}

/**
 * Completes the future with interruption. This will interrupt all fibers
 * waiting on the value of the future as by the specified fiber.
 *
 * @dataFirst interruptAs_
 */
export function interruptAs(id: FiberId): <E, A>(future: Future<E, A>) => I.UIO<boolean> {
  return (future) => interruptAs_(future, id)
}

/**
 * Checks for completion of this Future. Produces true if this future has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(future: Future<E, A>): I.UIO<boolean> {
  return I.succeedLazy(() => future.state.get._tag === 'Done')
}

/**
 * Makes a new future to be completed by the fiber creating the future.
 */
export function make<E, A>() {
  return I.chain_(I.fiberId(), (id) => makeAs<E, A>(id))
}

/**
 * Makes a new future to be completed by the fiber with the specified id.
 */
export function makeAs<E, A>(fiberId: FiberId) {
  return I.succeedLazy(() => unsafeMake<E, A>(fiberId))
}

/**
 * Checks for completion of this Future. Returns the result effect if this
 * future has already been completed or a `None` otherwise.
 */
export function poll<E, A>(future: Future<E, A>): I.UIO<Maybe<FIO<E, A>>> {
  return I.succeedLazy(() => {
    const state = future.state.get

    switch (state._tag) {
      case 'Done': {
        return M.just(state.value)
      }
      case 'Pending': {
        return M.nothing()
      }
    }
  })
}

/**
 * Completes the future with the specified value.
 */
export function succeed_<A, E>(future: Future<E, A>, a: A) {
  return fulfillWith_(future, I.succeed(a))
}

/**
 * Completes the future with the specified value.
 *
 * @dataFirst succeed_
 */
export function succeed<A>(a: A) {
  return <E>(future: Future<E, A>) => succeed_(future, a)
}

export function unsafeDone_<E, A>(future: Future<E, A>, io: FIO<E, A>) {
  const state = future.state.get
  if (state._tag === 'Pending') {
    future.state.set(new Done(io))
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
  return (future: Future<E, A>) => unsafeDone_(future, io)
}

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new Future<E, A>(new AtomicReference(new Pending([])), [fiberId])
}

/**
 * Retrieves the value of the future, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(future: Future<E, A>): I.IO<unknown, E, A> {
  return asyncInterruptEither<unknown, E, A>((k) => {
    let result
    let retry = true
    while (retry) {
      const oldState = future.state.get
      let newState
      switch (oldState._tag) {
        case 'Done': {
          newState = oldState
          result   = E.right(oldState.value)
          break
        }
        case 'Pending': {
          newState = new Pending([k, ...oldState.joiners])
          result   = E.left(interruptJoiner(future, k))
          break
        }
      }
      retry = !future.state.compareAndSet(oldState, newState)
    }
    return result as any
  }, future.blockingOn)
}

export { wait as await }

function interruptJoiner<E, A>(future: Future<E, A>, joiner: (a: FIO<E, A>) => void): I.Canceler<unknown> {
  return I.succeedLazy(() => {
    let retry = true
    while (retry) {
      const oldState = future.state.get
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
      retry = !future.state.compareAndSet(oldState, newState)
    }
  })
}
