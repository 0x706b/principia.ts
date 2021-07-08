// tracing: off

import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { accessCallTrace, traceAs, traceCall } from '@principia/compile/util'

import * as Ex from '../../Exit/core'
import { unit } from '../core'
import { onExit_ } from './onExit'

/**
 * @trace call
 * @trace 1
 */
export function onError_<R, E, A, R2, E2>(
  ma: IO<R, E, A>,
  cleanup: (exit: Cause<E>) => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  const trace = accessCallTrace()
  return traceCall(onExit_, trace)(
    ma,
    traceAs(
      cleanup,
      Ex.match(cleanup, () => unit())
    )
  )
}

/**
 * @trace call
 * @trace 0
 */
export function onError<E, R2, E2>(
  cleanup: (exit: Cause<E>) => IO<R2, E2, any>
): <R, A>(ma: IO<R, E, A>) => IO<R & R2, E | E2, A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(onError_, trace)(ma, cleanup)
}
