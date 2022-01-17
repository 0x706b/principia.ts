// tracing: off

import type { Managed } from '../../Managed/core'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { bracketExit_, fromIO } from '../../Managed/core'

/**
 * @trace call
 */
export function toManaged_<R, E, A>(ma: IO<R, E, A>): Managed<R, E, A>
/**
 * @trace call
 * @trace 1
 */
export function toManaged_<R, E, A, R1>(ma: IO<R, E, A>, release: (a: A) => IO<R1, never, any>): Managed<R & R1, E, A>
export function toManaged_<R, E, A, R1 = unknown>(
  ma: IO<R, E, A>,
  release?: (a: A) => IO<R1, never, any>
): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return release ? traceCall(bracketExit_, trace)(ma, release) : traceCall(fromIO, trace)(ma)
}

/**
 * @trace call
 */
export function toManaged(): <R, E, A>(ma: IO<R, E, A>) => Managed<R, E, A>
/**
 * @trace call
 * @trace 0
 */
export function toManaged<A, R>(
  release: (a: A) => IO<R, never, any>
): <R1, E1>(ma: IO<R1, E1, A>) => Managed<R & R1, E1, A>
export function toManaged<A, R>(
  release?: (a: A) => IO<R, never, any>
): <R1, E1>(ma: IO<R1, E1, A>) => Managed<R & R1, E1, A> {
  const trace = accessCallTrace()
  return (ma) => (release ? traceCall(bracketExit_, trace)(ma, release) : traceCall(fromIO, trace)(ma))
}
