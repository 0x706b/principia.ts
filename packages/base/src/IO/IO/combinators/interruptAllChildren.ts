// tracing: off

import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { flow } from '../../../function'
import { interruptAll } from '../../Fiber'
import { ensuringChildren_ } from './ensuringChildren'

/**
 * Returns a new effect that will not succeed with its value before first
 * interrupting all child fibers forked by the effect.
 *
 * @trace call
 */
export function interruptAllChildren<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  const trace = accessCallTrace()
  return ensuringChildren_(ma, traceFrom(trace, flow(interruptAll)))
}
