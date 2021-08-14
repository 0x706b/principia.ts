// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceAs, traceCall } from '@principia/compile/util'

import * as Ex from '../../Exit/core'
import { fromIO } from '../core'
import * as I from '../internal/io'
import { ensuringFirstWith_ } from './ensuringFirstWith'

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 *
 * @trace call
 * @trace 1
 */
export function interruptible_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return ensuringFirstWith_(
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
export function interruptible<A, R1>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (acquire) => traceCall(interruptible_, trace)(acquire, release)
}
