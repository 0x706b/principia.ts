import type { FiberId } from './Fiber/FiberId'
import type { Cause } from './IO/Cause'
import type { FIO } from './IO/core'
import type { Exit } from './IO/Exit'
import type { Maybe } from './Maybe'

import * as E from './Either'
import { pipe } from './function'
import * as I from './IO/core'
import { interruptAs as interruptAsIO, uninterruptibleMask } from './IO/op/interrupt'
import * as M from './Maybe'

export class Future<E, A> {
  constructor(public state: State<E, A>, readonly blockingOn: FiberId) {}
}

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
    switch (future.state._tag) {
      case 'Done': {
        return false
      }
      case 'Pending': {
        const state  = future.state
        future.state = new Done(io)
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
    I.fiberId,
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
  return I.succeedLazy(() => future.state._tag === 'Done')
}

/**
 * Makes a new future to be completed by the fiber creating the future.
 */
export function make<E, A>(): I.IO<unknown, never, Future<E, A>> {
  return I.chain_(I.fiberId, (id) => makeAs<E, A>(id))
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
    switch (future.state._tag) {
      case 'Done': {
        return M.just(future.state.value)
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
  if (future.state._tag === 'Pending') {
    const state  = future.state
    future.state = new Done(io)
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
  return new Future<E, A>(new Pending([]), fiberId)
}

/**
 * Retrieves the value of the future, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(future: Future<E, A>): I.IO<unknown, E, A> {
  return I.asyncInterrupt<unknown, E, A>((k) => {
    switch (future.state._tag) {
      case 'Done': {
        return E.right(future.state.value)
      }
      case 'Pending': {
        future.state = new Pending([k, ...future.state.joiners])
        return E.left(interruptJoiner(future, k))
      }
    }
  }, future.blockingOn)
}

export { wait as await }

function interruptJoiner<E, A>(future: Future<E, A>, joiner: (a: FIO<E, A>) => void): I.Canceler<unknown> {
  return I.succeedLazy(() => {
    switch (future.state._tag) {
      case 'Pending': {
        future.state = new Pending(future.state.joiners.filter((j) => j !== joiner))
        break
      }
      case 'Done': {
        break
      }
    }
  })
}
