// tracing: off

import type { IO } from '../../IO/core'
import type { Managed } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { ensuringFirstWith_ } from './ensuringFirstWith'

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see `onExitFirst_`.
 *
 * @trace call
 */
export function ensuringFirst_<R, E, A, R1>(self: Managed<R, E, A>, f: IO<R1, never, unknown>): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return ensuringFirstWith_(
    self,
    traceFrom(trace, () => f)
  )
}

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see `onExitFirst`.
 *
 * @dataFirst ensuringFirst_
 * @trace call
 */
export function ensuringFirst<R1>(
  f: IO<R1, never, unknown>
): <R, E, A>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(ensuringFirst_, trace)(ma, f)
}
