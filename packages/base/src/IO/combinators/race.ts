// tracing: off

import type { Exit } from '../../Exit'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as Ex from '../../Exit'
import { join } from '../../Fiber/combinators/join'
import * as I from '../core'
import { raceWith_ } from './core-scope'

const mergeInterruption =
  <E1, A, A1>(a: A) =>
  (x: Exit<E1, A1>): IO<unknown, E1, A> => {
    return Ex.matchIO_(
      x,
      (cause) => (C.interruptedOnly(cause) ? I.succeed(a) : I.halt(cause)),
      () => I.succeed(a)
    )
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
export function race_<R, E, A, R1, E1, A1>(ef: IO<R, E, A>, that: IO<R1, E1, A1>): IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return I.descriptorWith((d) =>
    raceWith_(
      ef,
      that,
      traceFrom(trace, (exit, right) =>
        Ex.matchIO_(
          exit,
          (cause) => I.mapErrorCause_(join(right), (_) => C.both(cause, _)),
          (a) => I.chain_(right.interruptAs(d.id), mergeInterruption(a))
        )
      ),
      traceFrom(trace, (exit, left) =>
        Ex.matchIO_(
          exit,
          (cause) => I.mapErrorCause_(join(left), (_) => C.both(cause, _)),
          (a) => I.chain_(left.interruptAs(d.id), mergeInterruption(a))
        )
      )
    )
  )
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
