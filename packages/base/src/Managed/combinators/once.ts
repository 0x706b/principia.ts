// tracing: off

import type { Managed, UManaged } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import * as F from '../../Future'
import { once as onceIO } from '../../IO/combinators/once'
import { fromIO, mapIO_ } from '../core'
import * as I from '../internal/io'
import { releaseMap } from './releaseMap'

/**
 * Returns a memoized version of the specified Managed.
 *
 * @trace call
 */
export function once<R, E, A>(ma: Managed<R, E, A>): UManaged<Managed<R, E, A>> {
  const trace = accessCallTrace()
  return mapIO_(
    releaseMap(),
    traceFrom(trace, (finalizers) =>
      I.gen(function* (_) {
        const promise  = yield* _(F.make<E, A>())
        const complete = yield* _(
          onceIO(
            I.accessIO((r: R) =>
              pipe(
                ma.io,
                I.provide([r, finalizers] as const),
                I.map(([_, a]) => a),
                (_) => F.fulfill_(promise, _)
              )
            )
          )
        )
        return pipe(complete, I.crossSecond(F.await(promise)), fromIO)
      })
    )
  )
}
