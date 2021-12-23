// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { identity } from '../../function'
import { foreachC_, foreachUnitC_ } from './foreachC'

/**
 * @trace call
 */
export function sequenceIterableC<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreachC_(
    mas,
    traceFrom(trace, (_) => _)
  )
}

/**
 * @trace call
 */
export function sequenceIterableUnitC<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, void> {
  const trace = accessCallTrace()
  return traceCall(foreachUnitC_, trace)(mas, identity)
}
