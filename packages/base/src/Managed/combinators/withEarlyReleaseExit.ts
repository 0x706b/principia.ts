// tracing: off

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as Ex from '../../Exit'
import { chain_, Managed } from '../core'
import * as I from '../internal/io'
import { fiberId } from './fiberId'

/**
 * @trace call
 */
export function withEarlyReleaseExit_<R, E, A>(
  ma: Managed<R, E, A>,
  exit: Ex.Exit<any, any>
): Managed<R, E, readonly [I.UIO<unknown>, A]> {
  const trace = accessCallTrace()
  return new Managed(
    I.map_(
      ma.io,
      traceFrom(trace, ([finalizer, a]) => [finalizer, [I.uninterruptible(finalizer(exit)), a]] as const)
    )
  )
}

/**
 * @dataFirst withEarlyReleaseExit_
 * @trace call
 */
export function withEarlyReleaseExit(
  exit: Ex.Exit<any, any>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, readonly [I.UIO<unknown>, A]> {
  const trace = accessCallTrace()
  return (ma) => traceCall(withEarlyReleaseExit_, trace)(ma, exit)
}

/**
 * @trace call
 */
export function withEarlyRelease<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [I.UIO<unknown>, A]> {
  const trace = accessCallTrace()
  return chain_(
    fiberId(),
    traceFrom(trace, (id) => withEarlyReleaseExit_(ma, Ex.interrupt(id)))
  )
}
