// tracing: off

import type { Layer } from '../../Layer'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import * as L from '../../Layer'
import { giveLayer } from './giveLayer'

/**
 * @dataFirst giveSomeLayer_
 * @trace call
 */
export function giveSomeLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  const trace = accessCallTrace()
  return <R, E, A>(ma: Managed<R & A1, E, A>) => traceCall(giveLayer, trace)(layer['+++'](L.identity<R>()))(ma)
}

/**
 * @trace call
 */
export function giveSomeLayer_<R, E, A, R1, E1, A1>(
  ma: Managed<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): Managed<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return traceCall(giveSomeLayer, trace)(layer)(ma)
}
