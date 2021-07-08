// tracing: off

import type { Managed, UManaged } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import { fulfill } from '../../IO/combinators/fulfill'
import { once } from '../../IO/combinators/once'
import * as P from '../../Promise'
import { fromIO, mapIO_ } from '../core'
import * as I from '../internal/io'
import { releaseMap } from './releaseMap'

/**
 * Returns a memoized version of the specified Managed.
 *
 * @trace call
 */
export function memoize<R, E, A>(ma: Managed<R, E, A>): UManaged<Managed<R, E, A>> {
  const trace = accessCallTrace()
  return mapIO_(
    releaseMap(),
    traceFrom(trace, (finalizers) =>
      I.gen(function* (_) {
        const promise  = yield* _(P.make<E, A>())
        const complete = yield* _(
          once(
            I.asksIO((r: R) =>
              pipe(
                ma.io,
                I.giveAll([r, finalizers] as const),
                I.map(([_, a]) => a),
                (_) => P.fulfill_(promise, _)
              )
            )
          )
        )
        return pipe(complete, I.crossSecond(P.await(promise)), fromIO)
      })
    )
  )
}
