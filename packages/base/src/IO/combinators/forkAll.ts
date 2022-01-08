// tracing: off

import type { Conc } from '../../collection/immutable/Conc/core'
import type { IO, URIO } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import * as Ch from '../../collection/immutable/Conc/core'
import * as Fiber from '../../Fiber'
import * as I from '../../collection/Iterable'
import { chain_, foreach_, fork, map_, unit } from '../core'

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @trace call
 */
export function forkAll<R, E, A>(mas: Iterable<IO<R, E, A>>): URIO<R, Fiber.Fiber<E, Conc<A>>> {
  const trace = accessCallTrace()
  return map_(
    foreach_(
      mas,
      traceFrom(trace, (_) => fork(_))
    ),
    Ch.foldl(Fiber.succeed(Ch.empty()) as Fiber.Fiber<E, Conc<A>>, (b, a) =>
      Fiber.crossWith_(b, a, (_a, _b) => Ch.append_(_a, _b))
    )
  )
}

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 *
 * @trace call
 */
export function forkAllUnit<R, E, A>(mas: Iterable<IO<R, E, A>>): URIO<R, void> {
  const trace = accessCallTrace()
  return I.foldl_(mas, unit() as URIO<R, void>, (b, a) =>
    chain_(
      fork(a),
      traceFrom(trace, () => b)
    )
  )
}
