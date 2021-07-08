// tracing: off

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import * as F from '../../Fiber'
import { pipe } from '../../function'
import { tuple } from '../../tuple'
import { Managed } from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 *
 * @trace call
 */
export function fork<R, E, A>(self: Managed<R, E, A>): Managed<R, never, F.FiberContext<E, A>> {
  const trace = accessCallTrace()
  return new Managed(
    I.uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const [r, outerReleaseMap] = yield* _(I.ask<readonly [R, RM.ReleaseMap]>())
          const innerReleaseMap      = yield* _(RM.make)
          const fiber                = yield* _(
            pipe(
              self.io,
              I.map(([, a]) => a),
              I.forkDaemon,
              I.giveAll(tuple(r, innerReleaseMap)),
              restore
            )
          )
          const releaseMapEntry      = yield* _(
            RM.add(outerReleaseMap, (e) =>
              pipe(fiber, F.interrupt, I.crossSecond(releaseAll_(innerReleaseMap, e, sequential)))
            )
          )

          return tuple(releaseMapEntry, fiber)
        })
      )
    )
  )
}
