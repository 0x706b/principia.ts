// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceAs, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import { tuple } from '../../tuple'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

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
 * Run an effect while acquiring the resource before and releasing it after
 *
 * @trace 1
 */
export function use_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => I.IO<R2, E2, B>
): I.IO<R & R2, E | E2, B> {
  return I.bracketExit_(
    RM.make,
    traceAs(f, (rm) =>
      I.chain_(
        I.gives_(self.io, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      )
    ),
    (rm, ex) => releaseAll_(rm, ex, sequential)
  )
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
