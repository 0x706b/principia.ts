import { sequential } from '../../ExecutionStrategy'
import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll } from '../ReleaseMap'

export function onExit_<R, E, A, R1>(
  ma: Ma.Managed<R, E, A>,
  cleanup: (exit: Ex.Exit<E, A>) => I.IO<R1, never, unknown>
): Ma.Managed<R & R1, E, A> {
  return new Ma.Managed(
    I.uninterruptibleMask(({ restore }) =>
      I.gen(function* (_) {
        const r1              = yield* _(I.ask<R1>())
        const outerReleaseMap = yield* _(FR.get(Ma.currentReleaseMap))
        const innerReleaseMap = yield* _(RM.make)
        const exitEA          = yield* _(
          pipe(
            Ma.currentReleaseMap,
            FR.locally(
              innerReleaseMap,
              pipe(
                restore(
                  pipe(
                    ma.io,
                    I.map(([_, a]) => a)
                  )
                ),
                I.result
              )
            )
          )
        )
        const releaseMapEntry = yield* _(
          RM.add_(outerReleaseMap, (e) =>
            pipe(
              innerReleaseMap,
              releaseAll(e, sequential),
              I.result,
              I.crossWith(pipe(cleanup(exitEA), I.give(r1), I.result), (l, r) => I.fromExit(Ex.apSecond_(l, r))),
              I.flatten
            )
          )
        )
        const a = yield* _(I.fromExit(exitEA))
        return [releaseMapEntry, a]
      })
    )
  )
}

export function onExit<E, A, R1>(
  cleanup: (exit: Ex.Exit<E, A>) => I.IO<R1, never, unknown>
): <R>(ma: Ma.Managed<R, E, A>) => Ma.Managed<R & R1, E, A> {
  return (ma) => onExit_(ma, cleanup)
}
