// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { identity } from '../../function'
import { foreachPar_, foreachUnitPar_ } from './foreachPar'

/**
 * @trace call
 */
export function collectAllPar<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreachPar_(
    mas,
    traceFrom(trace, (_) => _)
  )
}

/**
 * @trace call
 */
export function collectAllUnitPar<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, void> {
  const trace = accessCallTrace()
  return traceCall(foreachUnitPar_, trace)(mas, identity)
}
