// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { use_ } from '../../IO/combinators/foreach-concurrent'
import * as I from '../internal/io'

export { use_ }

/**
 * Run an effect while acquiring the resource before and releasing it after
 *
 * @dataFirst use_
 * @trace 0
 */
export function use<A, R2, E2, B>(
  f: (a: A) => I.IO<R2, E2, B>
): <R, E>(self: Managed<R, E, A>) => I.IO<R & R2, E | E2, B> {
  return (self) => use_(self, f)
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 *
 * @trace call
 */
export function useNow<R, E, A>(ma: Managed<R, E, A>): I.IO<R, E, A> {
  const trace = accessCallTrace()
  return use_(
    ma,
    traceFrom(trace, (a) => I.succeed(a))
  )
}

/**
 * Use the resource until interruption.
 * Useful for resources that you want to acquire and use as long as the application is running, like a HTTP server.
 *
 * @trace call
 */
export function useForever<R, E, A>(ma: Managed<R, E, A>): I.IO<R, E, never> {
  const trace = accessCallTrace()
  return use_(
    ma,
    traceFrom(trace, () => I.never)
  )
}
