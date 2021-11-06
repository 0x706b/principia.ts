import type { Has } from '../../Has'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { Clock } from '../../Clock'
import { chain_ } from '../core'

/**
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function delay_<R, E, A>(ma: IO<R, E, A>, ms: number): IO<R & Has<Clock>, E, A> {
  const trace = accessCallTrace()
  return chain_(
    Clock.sleep(ms),
    traceFrom(trace, () => ma)
  )
}

/**
 * Delays an `IO` by an arbitrary number of milliseconds
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function delay(ms: number): <R, E, A>(ma: IO<R, E, A>) => IO<R & Has<Clock>, E, A> {
  const trace = accessCallTrace()
  return (ef) => traceCall(delay_, trace)(ef, ms)
}
