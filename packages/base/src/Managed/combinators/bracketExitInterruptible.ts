// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceAs, traceCall } from '@principia/compile/util'

import * as Ex from '../../IO/Exit/core'
import { fromIO } from '../core'
import * as I from '../internal/io'
import { onExitFirst_ } from './onExitFirst'

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 *
 * @trace call
 * @trace 1
 */
export function bracketExitInterruptible_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return onExitFirst_(
    traceCall(fromIO, trace)(acquire),
    traceAs(
      release,
      Ex.matchIO(() => I.unit(), release)
    )
  )
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 *
 * @dataFirst interruptible_
 * @trace call
 * @trace 0
 */
export function bracketExitInterruptible<A, R1>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (acquire) => traceCall(bracketExitInterruptible_, trace)(acquire, release)
}
