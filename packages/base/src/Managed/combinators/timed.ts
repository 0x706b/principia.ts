// tracing: off

import type { Clock } from '../../Clock'
import type { Has } from '../../Has'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { pipe } from '../../function'
import { Managed } from '../core'
import * as I from '../internal/_io'

/**
 * @trace call
 */
export function timed<R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, readonly [number, A]> {
  const trace = accessCallTrace()
  return new Managed(
    pipe(
      traceCall(I.timed, trace)(ma.io),
      I.map(([duration, [fin, a]]) => [fin, [duration, a]])
    )
  )
}
