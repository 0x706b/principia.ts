// tracing: off

import type { Layer } from '../../Layer'
import type { Managed } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { build } from '../../Layer'
import { chain_, local_ } from '../core'

/**
 * @trace call
 */
export function provideLayer_<R, E, A, R1, E1>(ma: Managed<R, E, A>, layer: Layer<R1, E1, R>): Managed<R1, E | E1, A> {
  const trace = accessCallTrace()
  return chain_(
    build(layer),
    traceFrom(trace, (p) => local_(ma, (r1: R1) => ({ ...r1, ...p })))
  )
}

/**
 * @trace call
 *
 * @dataFirst provideLayer_
 */
export function provideLayer<R, R1, E1>(layer: Layer<R1, E1, R>) {
  const trace = accessCallTrace()
  return <E, A>(ma: Managed<R, E, A>): Managed<R1, E | E1, A> =>
    chain_(
      build(layer),
      traceFrom(trace, (p) => local_(ma, (r: R1) => ({ ...r, ...p })))
    )
}
