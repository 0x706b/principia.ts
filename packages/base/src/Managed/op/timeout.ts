// tracing: off

import type { Clock } from '../../Clock'
import type { Has } from '../../Has'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as E from '../../Either'
import { sequential } from '../../ExecutionStrategy'
import * as Fi from '../../Fiber'
import * as FR from '../../FiberRef/core'
import { flow, pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import { tuple } from '../../tuple/core'
import * as Ma from '../core'
import * as I from '../internal/_io'
import * as RM from '../ReleaseMap'

/**
 * @trace call
 */
export function timeout<R, E, A>(ma: Ma.Managed<R, E, A>, d: number): Ma.Managed<R & Has<Clock>, E, M.Maybe<A>> {
  const trace = accessCallTrace()
  return new Ma.Managed(
    I.uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const outerReleaseMap = yield* _(FR.get(Ma.currentReleaseMap))
          const innerReleaseMap = yield* _(RM.make)
          const earlyRelease    = yield* _(
            RM.add_(outerReleaseMap, (ex) => RM.releaseAll_(innerReleaseMap, ex, sequential))
          )

          const raceResult = yield* _(
            restore(
              pipe(
                Ma.currentReleaseMap,
                FR.locally(innerReleaseMap, ma.io),
                I.raceWith(
                  pipe(I.sleep(d), I.as(M.nothing())),
                  (result, sleeper) =>
                    pipe(
                      Fi.interrupt(sleeper),
                      I.apSecond(
                        I.fromExit(
                          pipe(
                            result,
                            Ex.map(([_, a]) => E.right(a))
                          )
                        )
                      )
                    ),
                  (_, resultFiber) => I.succeed(E.left(resultFiber))
                )
              )
            )
          )
          const a = yield* _(
            E.match_(
              raceResult,
              (fiber) =>
                pipe(
                  I.fiberId,
                  I.chain((id) =>
                    pipe(
                      Fi.interrupt(fiber),
                      I.ensuring(RM.releaseAll_(innerReleaseMap, Ex.interrupt(id), sequential)),
                      I.forkDaemon,
                      I.as(M.nothing())
                    )
                  )
                ),
              flow(M.just, I.succeed)
            )
          )
          return tuple(earlyRelease, a)
        })
      )
    )
  )
}
