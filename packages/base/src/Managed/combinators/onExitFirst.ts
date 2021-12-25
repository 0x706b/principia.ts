import { sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll } from '../ReleaseMap'

export function onExitFirst_<R, E, A, R1>(
  ma: Ma.Managed<R, E, A>,
  cleanup: (exit: Ex.Exit<E, A>) => I.IO<R1, never, unknown>
): Ma.Managed<R & R1, E, A> {
  return new Ma.Managed(
    I.uninterruptibleMask(({ restore }) =>
      I.gen(function* (_) {
        const [r1, outerReleaseMap] = yield* _(I.ask<readonly [R & R1, RM.ReleaseMap]>())
        const innerReleaseMap       = yield* _(RM.make)
        const exitEA                = yield* _(
          pipe(restore(ma.io), I.result, I.map(Ex.map(([, a]) => a)), I.give([r1, innerReleaseMap] as const))
        )
        const releaseMapEntry = yield* _(
          RM.add_(outerReleaseMap, (e) =>
            pipe(
              cleanup(exitEA),
              I.give(r1),
              I.result,
              I.crossWith(pipe(innerReleaseMap, releaseAll(e, sequential), I.result), (l, r) =>
                I.fromExit(Ex.apSecond_(l, r))
              ),
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

export function onExitFirst<E, A, R1>(
  cleanup: (exit: Ex.Exit<E, A>) => I.IO<R1, never, unknown>
): <R>(ma: Ma.Managed<R, E, A>) => Ma.Managed<R & R1, E, A> {
  return (ma) => onExitFirst_(ma, cleanup)
}
