// tracing: off

import type { Managed } from '../core'
import type * as I from '../internal/io'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { ensuringWith_ } from './ensuringWith'

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 *
 * @trace call
 */
export function ensuring_<R, E, A, R1>(self: Managed<R, E, A>, f: I.IO<R1, never, any>) {
  const trace = accessCallTrace()
  return ensuringWith_(
    self,
    traceFrom(trace, () => f)
  )
}

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 *
 * @dataFirst ensuring_
 * @trace call
 */
export function ensuring<R1>(f: I.IO<R1, never, any>): <R, E, A>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (self) => traceCall(ensuring_, trace)(self, f)
}
