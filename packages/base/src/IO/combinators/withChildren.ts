// tracing: off

import type { RuntimeFiber } from '../../Fiber'
import type { IO, UIO } from '../core'

import { traceAs } from '@principia/compile/util'

import { track } from '../../Supervisor'
import { chain_, descriptor, map_, supervised_ } from '../core'

/**
 * @trace 0
 */
export function withChildren<R, E, A>(
  get: (_: UIO<ReadonlyArray<RuntimeFiber<any, any>>>) => IO<R, E, A>
): IO<R, E, A> {
  return chain_(
    track,
    traceAs(get, (supervisor) =>
      supervised_(
        get(chain_(supervisor.value, (children) => map_(descriptor(), (d) => children.filter((_) => _.id !== d.id)))),
        supervisor
      )
    )
  )
}
