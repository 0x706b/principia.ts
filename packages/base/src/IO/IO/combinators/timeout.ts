// tracing: off

import type { Has } from '../../../Has'
import type { Clock } from '../../Clock'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import * as M from '../../../Maybe'
import { timeoutTo_ } from './timeoutTo'

/**
 * Returns an IO that will timeout this effect, returning `Nothing` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Just` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 *
 * @trace call
 */
export function timeout_<R, E, A>(ma: IO<R, E, A>, d: number): IO<R & Has<Clock>, E, M.Maybe<A>> {
  const trace = accessCallTrace()
  return traceCall(timeoutTo_, trace)(ma, d, M.nothing(), M.just)
}

/**
 * Returns an IO that will timeout this effect, returning `Nothing` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Just` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 *
 * @trace call
 */
export function timeout(d: number): <R, E, A>(ma: IO<R, E, A>) => IO<R & Has<Clock>, E, M.Maybe<A>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(timeout_, trace)(ma, d)
}
