// tracing: off

import type { Exit } from '../../Exit'
import type { IO } from '../core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { unit } from '../core'
import { bracketExit_ } from './bracketExit'

/**
 * @trace call
 * @trace 1
 */
export function onExit_<R, E, A, R2, E2>(
  self: IO<R, E, A>,
  cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  const trace = accessCallTrace()
  return bracketExit_(
    unit(),
    traceFrom(trace, () => self),
    traceAs(cleanup, (_, e) => cleanup(e))
  )
}

/**
 * @trace call
 * @trace 0
 */
export function onExit<E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>) {
  const trace = accessCallTrace()
  return <R>(self: IO<R, E, A>): IO<R & R2, E | E2, A> => traceCall(onExit_, trace)(self, cleanup)
}
