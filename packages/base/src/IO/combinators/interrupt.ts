// tracing: off

import type { InterruptStatus } from '../../Fiber/core'
import type { FiberId } from '../../Fiber/FiberId'
import type { Canceler, FIO, IO } from '../core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { left } from '../../Either'
import { join } from '../../Fiber/combinators/join'
import * as F from '../../Fiber/core'
import { emptyFiberId } from '../../Fiber/FiberId'
import { pipe } from '../../function'
import * as C from '../Cause'
import {
  asyncInterrupt,
  chain_,
  checkInterruptible,
  failCause,
  fiberId,
  flatten,
  fromPromiseHalt,
  matchCauseIO_,
  SetInterrupt,
  succeed
} from '../core'
import { forkDaemon } from './core-scope'

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 *
 * @trace call
 */
export function interruptAs(fiberId: FiberId): FIO<never, never> {
  const trace = accessCallTrace()
  return traceCall(failCause, trace)(C.interrupt(fiberId))
}

/**
 * Returns an effect that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: IO<unknown, never, never> = chain_(fiberId(), interruptAs)

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @trace call
 */
export function setInterruptStatus_<R, E, A>(effect: IO<R, E, A>, flag: InterruptStatus): IO<R, E, A> {
  const trace = accessCallTrace()
  return new SetInterrupt(effect, flag, trace)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @trace call
 */
export function setInterruptStatus(flag: InterruptStatus): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(setInterruptStatus_, trace)(ma, flag)
}

/**
 * Returns a new effect that performs the same operations as this effect, but
 * interruptibly, even if composed inside of an uninterruptible region.
 *
 * Note that effects are interruptible by default, so this function only has
 * meaning if used within an uninterruptible region.
 *
 * WARNING: This operator "punches holes" into effects, allowing them to be
 * interrupted in unexpected places. Do not use this operator unless you know
 * exactly what you are doing. Instead, you should use `uninterruptibleMask`.
 *
 * @trace call
 */
export function interruptible<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return traceCall(setInterruptStatus_, trace)(ma, F.interruptible)
}

/**
 * Performs this effect uninterruptibly. This will prevent the effect from
 * being terminated externally, but the effect may fail for internal reasons
 * (e.g. an uncaught error) or terminate due to defect.
 *
 * Uninterruptible effects may recover from all failure causes (including
 * interruption of an inner effect that has been made interruptible).
 *
 * @trace call
 */
export function uninterruptible<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return traceCall(setInterruptStatus_, trace)(ma, F.uninterruptible)
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 *
 * @trace 0
 */
export function uninterruptibleMask<R, E, A>(f: (restore: InterruptStatusRestore) => IO<R, E, A>): IO<R, E, A> {
  return checkInterruptible(traceAs(f, (flag) => uninterruptible(f(new InterruptStatusRestore(flag)))))
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @trace 1
 */
export function onInterrupt_<R, E, A, R1>(
  ma: IO<R, E, A>,
  cleanup: (interruptors: ReadonlySet<FiberId>) => IO<R1, never, any>
): IO<R & R1, E, A> {
  return uninterruptibleMask(({ restore }) =>
    matchCauseIO_(
      restore(ma),
      (cause) =>
        C.interrupted(cause)
          ? chain_(
              cleanup(C.interruptors(cause)),
              traceAs(cleanup, () => failCause(cause))
            )
          : failCause(cause),
      succeed
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @trace 0
 */
export function onInterrupt<R1>(
  cleanup: (interruptors: ReadonlySet<FiberId>) => IO<R1, never, any>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E, A> {
  return (ma) => onInterrupt_(ma, cleanup)
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @trace 1
 */
export function onInterruptExtended_<R, E, A, R2, E2>(
  self: IO<R, E, A>,
  cleanup: () => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  return uninterruptibleMask(({ restore }) =>
    matchCauseIO_(
      restore(self),
      (cause) =>
        C.interrupted(cause)
          ? matchCauseIO_(
              cleanup(),
              traceAs(cleanup, (_) => failCause(_)),
              traceAs(cleanup, () => failCause(cause))
            )
          : failCause(cause),
      succeed
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @trace 0
 */
export function onInterruptExtended<R2, E2>(
  cleanup: () => IO<R2, E2, any>
): <R, E, A>(self: IO<R, E, A>) => IO<R & R2, E | E2, A> {
  return (self) => onInterruptExtended_(self, cleanup)
}

/**
 * Returns an IO whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 *
 * @trace call
 */
export function disconnect<R, E, A>(effect: IO<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      chain_(fiberId(), (id) =>
        chain_(forkDaemon(restore(effect)), (fiber) =>
          onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
        )
      )
    )
  )
}

/**
 * Used to restore the inherited interruptibility
 */
export class InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {}

  restore = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => setInterruptStatus_(ma, this.flag)

  force = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => {
    if (this.flag.isUninteruptible) {
      return interruptible(disconnect(uninterruptible(ma)))
    }
    return setInterruptStatus_(ma, this.flag)
  }
}

/**
 * @trace 0
 */
export function asyncInterruptPromise<R, E, A>(
  register: (cb: (_: IO<R, E, A>) => void) => Promise<Canceler<R>>,
  blockingOn: () => FiberId = () => emptyFiberId
): IO<R, E, A> {
  return asyncInterrupt<R, E, A>(
    traceAs(register, (cb) => left(pipe(register(cb), (p) => fromPromiseHalt(() => p), flatten))),
    blockingOn
  )
}
