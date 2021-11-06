// tracing: off

import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { join } from '../../Fiber/combinators/join'
import * as C from '../Cause'
import * as I from '../core'
import * as Ex from '../Exit'
import { raceWith_ } from './core-scope'
import { uninterruptibleMask } from './interrupt'

function maybeDisconnect<R, E, A>(io: I.IO<R, E, A>): I.IO<R, E, A> {
  return uninterruptibleMask((restore) => restore.force(io))
}

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @trace call
 */
export function race_<R, E, A, R1, E1, A1>(io: IO<R, E, A>, that: IO<R1, E1, A1>): IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return I.descriptorWith((descriptor) => {
    const parentFiberId = descriptor.id
    return raceWith_(
      maybeDisconnect(io),
      maybeDisconnect(that),
      traceFrom(trace, (exit, right) =>
        Ex.matchIO_(
          exit,
          (cause) => I.mapErrorCause_(join(right), (_) => C.both(cause, _)),
          (a) => I.as_(right.interruptAs(parentFiberId), a)
        )
      ),
      traceFrom(trace, (exit, left) =>
        Ex.matchIO_(
          exit,
          (cause) => I.mapErrorCause_(join(left), (_) => C.both(cause, _)),
          (a1) => I.as_(left.interruptAs(parentFiberId), a1)
        )
      )
    )
  })
}

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @trace call
 */
export function race<R1, E1, A1>(that: IO<R1, E1, A1>): <R, E, A>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  const trace = accessCallTrace()
  return (ef) => traceCall(race_, trace)(ef, that)
}
