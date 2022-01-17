// tracing: off

import type { Conc } from '../../collection/immutable/Conc/core'
import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { flow, identity } from '../../function'
import { foreachC_, foreachUnitC_ } from './foreachC'

/**
 * @trace call
 */
export function sequenceIterableC<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, Conc<A>> {
  const trace = accessCallTrace()
  return foreachC_(mas, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function sequenceIterableUnitC<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnitC_(mas, traceFrom(trace, flow(identity)))
}
