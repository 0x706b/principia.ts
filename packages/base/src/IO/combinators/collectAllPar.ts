// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { flow, identity } from '../../function'
import { foreachPar_ } from './foreachPar'
import { foreachUnitPar_ } from './foreachUnitPar'

/**
 * @trace call
 */
export function collectAllPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreachPar_(mas, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function collectAllUnitPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnitPar_(mas, traceFrom(trace, flow(identity)))
}
