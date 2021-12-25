// tracing: off

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import { tuple } from '../../tuple/core'
import { Managed } from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'

/**
 * Preallocates the managed resource, resulting in a Managed that reserves
 * and acquires immediately and cannot fail. You should take care that you
 * are not interrupted between running preallocate and actually acquiring
 * the resource as you might leak otherwise.
 *
 * @trace call
 */
export function preallocate<R, E, A>(ma: Managed<R, E, A>): I.IO<R, E, Managed<unknown, never, A>> {
  const trace = accessCallTrace()
  return I.uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      I.gen(function* (_) {
        const rm = yield* _(RM.make)
        const tp = yield* _(
          pipe(
            ma.io,
            I.gives((r: R) => tuple(r, rm)),
            restore,
            I.result
          )
        )

        const preallocated = yield* _(
          Ex.matchIO_(
            tp,
            (c) => pipe(RM.releaseAll_(rm, Ex.failCause(c), sequential), I.apSecond(I.failCause(c))),
            ([release, a]) =>
              I.succeed(
                new Managed(
                  I.asksIO(([_, relMap]: readonly [unknown, RM.ReleaseMap]) =>
                    pipe(
                      RM.add_(relMap, release),
                      I.map((fin) => tuple(fin, a))
                    )
                  )
                )
              )
          )
        )
        return preallocated
      })
    )
  )
}

/**
 * Preallocates the managed resource inside an outer Managed, resulting in a
 * Managed that reserves and acquires immediately and cannot fail.
 *
 * @trace call
 */
export function preallocateManaged<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, Managed<unknown, never, A>> {
  const trace = accessCallTrace()
  return new Managed(
    I.map_(
      ma.io,
      traceFrom(trace, ([release, a]) => [
        release,
        new Managed(
          I.asksIO(([_, releaseMap]: readonly [unknown, RM.ReleaseMap]) =>
            pipe(
              RM.add_(releaseMap, release),
              I.map((_) => tuple(_, a))
            )
          )
        )
      ])
    )
  )
}
