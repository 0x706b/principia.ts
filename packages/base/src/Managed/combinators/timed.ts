// tracing: off

import type { Clock } from '../../Clock'
import type { Has } from '../../Has'
import type * as RM from '../ReleaseMap'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { ClockTag } from '../../Clock'
import { pipe } from '../../function'
import { asksServiceManaged, Managed } from '../core'
import * as I from '../internal/_io'

/**
 * @trace call
 */
export function timed<R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, readonly [number, A]> {
  const trace = accessCallTrace()
  return asksServiceManaged(ClockTag)(
    (clock) =>
      new Managed(
        I.asksIO(
          traceFrom(trace, ([r, releaseMap]: readonly [R, RM.ReleaseMap]) =>
            pipe(
              ma.io,
              I.giveAll([r, releaseMap] as const),
              I.timed,
              I.map(([duration, [fin, a]]) => [fin, [duration, a]] as const),
              I.giveService(ClockTag)(clock)
            )
          )
        )
      )
  )
}
