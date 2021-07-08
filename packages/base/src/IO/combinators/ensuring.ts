// tracing: off

import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as C from '../../Cause/core'
import { halt, matchCauseIO_, pure } from '../core'
import { uninterruptibleMask } from './interrupt'

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
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      matchCauseIO_(
        restore(ma),
        (cause1) =>
          matchCauseIO_(
            finalizer,
            (cause2) => halt(C.then(cause1, cause2)),
            (_) => halt(cause1)
          ),
        (value) =>
          matchCauseIO_(
            finalizer,
            (cause1) => halt(cause1),
            (_) => pure(value)
          )
      )
    )
  )
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
