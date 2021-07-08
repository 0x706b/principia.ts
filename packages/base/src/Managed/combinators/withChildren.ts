// tracing: off

import type { RuntimeFiber } from '../../Fiber/core'

import { traceAs } from '@principia/compile/util'

import { track } from '../../Supervisor'
import { Managed, unwrap } from '../core'
import * as I from '../internal/io'

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 *
 * @trace 0
 */
export function withChildren<R, E, A>(
  get: (_: I.UIO<ReadonlyArray<RuntimeFiber<any, any>>>) => Managed<R, E, A>
): Managed<R, E, A> {
  return unwrap(
    I.map_(
      track,
      traceAs(
        get,
        (supervisor) =>
          new Managed(
            I.supervised_(
              get(
                I.chain_(supervisor.value, (children) =>
                  I.map_(I.descriptor(), (d) => children.filter((_) => _.id !== d.id))
                )
              ).io,
              supervisor
            )
          )
      )
    )
  )
}
