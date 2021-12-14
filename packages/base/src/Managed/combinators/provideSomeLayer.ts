// tracing: off

import type { Layer } from '../../Layer'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import * as L from '../../Layer'
import { provideLayer } from './provideLayer'

/**
 * @dataFirst provideSomeLayer_
 * @trace call
 */
export function provideSomeLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  const trace = accessCallTrace()
  return <R, E, A>(ma: Managed<R & A1, E, A>) => traceCall(provideLayer, trace)(layer['+++'](L.identity<R>()))(ma)
}

/**
 * @trace call
 */
export function provideSomeLayer_<R, E, A, R1, E1, A1>(
  ma: Managed<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): Managed<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return traceCall(provideSomeLayer, trace)(layer)(ma)
}
