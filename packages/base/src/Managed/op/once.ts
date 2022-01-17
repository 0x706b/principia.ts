// tracing: off

import type { Managed, UManaged } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import * as F from '../../Future'
import { once as onceIO } from '../../IO/op/once'
import * as Ma from '../core'
import * as I from '../internal/io'
import { releaseMap } from './releaseMap'

/**
 * Returns a memoized version of the specified Managed.
 *
 * @trace call
 */
export function once<R, E, A>(ma: Managed<R, E, A>): UManaged<Managed<R, E, A>> {
  const trace = accessCallTrace()
  return pipe(
    releaseMap,
    Ma.mapIO(
      traceFrom(trace, (finalizers) =>
        I.gen(function* (_) {
          const future   = yield* _(F.make<E, A>())
          const complete = yield* _(
            pipe(
              Ma.currentReleaseMap,
              FR.locally(finalizers, ma.io),
              I.map(([_, a]) => a),
              I.fulfill(future),
              onceIO
            )
          )
          return pipe(complete, I.apSecond(F.await(future)), Ma.fromIO)
        })
      )
    )
  )
}
