// tracing: off

import type { Layer } from '../../Layer'
import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as L from '../../Layer'
import { giveLayer } from './giveLayer'

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @trace call
 */
export function giveSomeLayer<R1, E1, A1>(
  layer: Layer<R1, E1, A1>
): <R, E, A>(ma: IO<R & A1, E, A>) => IO<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return (ma) => traceFrom(trace, giveLayer)(layer['+++'](L.identity<R1>()))(ma)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @trace call
 */
export function giveSomeLayer_<R, E, A, R1, E1, A1>(
  ma: IO<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): IO<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return traceFrom(trace, giveSomeLayer)(layer)(ma)
}
