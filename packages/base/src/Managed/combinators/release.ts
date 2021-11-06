// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { fromIO } from '../core'
import { useNow } from './use'

/**
 * Runs all the finalizers associated with this scope. This is useful to
 * conceptually "close" a scope when composing multiple managed effects.
 * Note that this is only safe if the result of this managed effect is valid
 * outside its scope.
 *
 * @trace call
 */
export function release<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, A> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(useNow(ma))
}
