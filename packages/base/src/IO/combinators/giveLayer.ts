// tracing: off

import type { Layer } from '../../Layer'
import type { IO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { build } from '../../Layer'
import * as M from '../../Managed'
import { gives_ } from '../core'

/**
 * Provides a layer to the given effect
 *
 * @trace call
 */
export function giveLayer_<R, E, A, R1, E1, A1>(fa: IO<R & A1, E, A>, layer: Layer<R1, E1, A1>): IO<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return M.use_(
    build(layer),
    traceFrom(trace, (p) => gives_(fa, (r: R & R1) => ({ ...r, ...p })))
  )
}

/**
 * Provides a layer to the given effect
 *
 * @trace call
 */
export function giveLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  const trace = accessCallTrace()
  return <R, E, A>(fa: IO<R & A1, E, A>): IO<R & R1, E | E1, A> =>
    M.use_(
      build(layer),
      traceFrom(trace, (p) => gives_(fa, (r: R & R1) => ({ ...r, ...p })))
    )
}
