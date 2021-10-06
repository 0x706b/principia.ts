import { sequential } from '../../../ExecutionStrategy'
import { pipe } from '../../../function'
import * as Ex from '../../Exit'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

export function onExit_<R, E, A, R1>(
  ma: Ma.Managed<R, E, A>,
  cleanup: (exit: Ex.Exit<E, A>) => I.IO<R1, never, unknown>
): Ma.Managed<R & R1, E, A> {
  return new Ma.Managed(
    I.uninterruptibleMask(({ restore }) =>
      I.gen(function* (_) {
        const [r1, outerReleaseMap] = yield* _(I.ask<readonly [R & R1, RM.ReleaseMap]>())
        const innerReleaseMap       = yield* _(RM.make)
        const exitEA                = yield* _(
          pipe(
            ma.io,
            I.map(([, a]) => a),
            restore,
            I.result,
            I.giveAll([r1, innerReleaseMap] as const)
          )
        )
        const releaseMapEntry = yield* _(
          RM.add(outerReleaseMap, (e) =>
            pipe(
              innerReleaseMap,
              releaseAll(e, sequential),
              I.result,
              I.crossWith(pipe(cleanup(exitEA), I.giveAll(r1), I.result), (l, r) => I.fromExit(Ex.crossSecond_(l, r))),
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
