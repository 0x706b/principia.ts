// tracing: off

import type { Has } from '../../Has'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { Clock } from '../../Clock'

/**
 * @trace call
 */
export function sleep(ms: number): IO<Has<Clock>, never, void> {
  const trace = accessCallTrace()
  return traceCall(Clock.sleep, trace)(ms)
}
