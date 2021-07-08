import type * as H from '../../Has'
import type { Schedule } from '../../Schedule'
import type { StepFunction } from '../../Schedule/Decision'
import type { Layer } from '../core'

import { Clock } from '../../Clock'
import { pipe } from '../../function'
import { tuple } from '../../tuple'
import { matchTag } from '../../util/match'
import { catchAll, crossPar_, defer, first, fresh, fromRawFunctionIO, fromRawIO, identity } from '../core'
import * as I from '../internal/io'

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry_<R, E, A, R1>(
  la: Layer<R, E, A>,
  schedule: Schedule<R1, E, any>
): Layer<R & R1 & H.Has<Clock>, E, A> {
  type S = StepFunction<R1, E, any>

  const loop = (): Layer<readonly [R & R1 & H.Has<Clock>, S], E, A> => {
    const update = fromRawFunctionIO(([[r, s], e]: readonly [readonly [R & R1 & H.Has<Clock>, S], E]) =>
      pipe(
        Clock.currentTime,
        I.orDie,
        I.chain((now) =>
          pipe(
            s(now, e),
            I.chain(
              matchTag({
                Done: (_) => I.fail(e),
                Continue: (c) => I.as_(Clock.sleep(Math.abs(now - c.interval)), tuple(r, c.next))
              })
            )
          )
        ),
        I.giveAll(r)
      )
    )

    return pipe(first<R>()['>=>'](la), catchAll(update['>=>'](defer(() => fresh(loop())))))
  }
  return crossPar_(identity<R & R1 & H.Has<Clock>>(), fromRawIO(I.succeed(schedule.step)))['>=>'](loop())
}

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry<R1, E>(
  schedule: Schedule<R1, E, any>
): <R, A>(la: Layer<R, E, A>) => Layer<R & R1 & H.Has<Clock>, E, A> {
  return (la) => retry_(la, schedule)
}
