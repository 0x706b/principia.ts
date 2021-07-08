// tracing: off

import type { Has } from '../../Has'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { Clock } from '../../Clock'
import { timedWith_ } from '../core'

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @trace call
 */
export function timed<R, E, A>(ma: IO<R, E, A>): IO<R & Has<Clock>, E, readonly [number, A]> {
  const trace = accessCallTrace()
  return traceCall(timedWith_, trace)(ma, Clock.currentTime)
}
