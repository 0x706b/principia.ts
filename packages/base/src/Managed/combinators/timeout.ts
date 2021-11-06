// tracing: off

import type { Has } from '../../Has'
import type { Clock } from '../../Clock'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as E from '../../Either'
import { sequential } from '../../ExecutionStrategy'
import { flow, pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import { tuple } from '../../tuple'
import { Managed } from '../core'
import * as I from '../internal/_io'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

/**
 * @trace call
 */
export function timeout<R, E, A>(ma: Managed<R, E, A>, d: number): Managed<R & Has<Clock>, E, M.Maybe<A>> {
  const trace = accessCallTrace()
  return new Managed(
    I.uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const [r, outerReleaseMap] = yield* _(I.ask<readonly [R & Has<Clock>, RM.ReleaseMap]>())
          const innerReleaseMap      = yield* _(RM.make)
          const earlyRelease         = yield* _(RM.add(outerReleaseMap, (ex) => releaseAll_(innerReleaseMap, ex, sequential)))

          const id         = yield* _(I.fiberId())
          const raceResult = yield* _(
            pipe(
              ma.io,
              I.giveAll(tuple(r, innerReleaseMap)),
              I.raceWith(
                pipe(I.sleep(d), I.as(M.nothing())),
                (result, sleeper) =>
                  pipe(sleeper.interruptAs(id), I.crossSecond(I.fromExit(Ex.map_(result, ([, a]) => E.right(a))))),
                (_, resultFiber) => I.succeed(E.left(resultFiber))
              ),
              I.giveAll(r),
              restore
            )
          )
          const a = yield* _(
            E.match_(
              raceResult,
              (fiber) =>
                pipe(
                  fiber.interruptAs(id),
                  I.ensuring(releaseAll_(innerReleaseMap, Ex.interrupt(id), sequential)),
                  I.forkDaemon,
                  I.as(M.nothing())
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
