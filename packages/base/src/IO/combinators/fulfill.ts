// tracing: off

import type { Promise } from '../../Promise'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as P from '../../Promise'
import { chain_, result } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @trace call
 */
export function fulfill_<R, E, A>(effect: IO<R, E, A>, p: Promise<E, A>): IO<R, never, boolean> {
  const trace = accessCallTrace()
  return uninterruptibleMask(traceFrom(trace, ({ restore }) => chain_(result(restore(effect)), (ex) => P.done_(p, ex))))
}

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @trace call
 */
export function fulfill<E, A>(p: Promise<E, A>): <R>(effect: IO<R, E, A>) => IO<R, never, boolean> {
  const trace = accessCallTrace()
  return (effect) => traceCall(fulfill_, trace)(effect, p)
}
