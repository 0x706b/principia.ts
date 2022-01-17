// tracing: off

import type { Either } from '../../Either'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import * as E from '../../Either'
import * as I from '../core'
import { race_ } from './race'

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @trace call
 */
export function raceEither_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<R & R1, E | E1, Either<A, A1>> {
  const trace = accessCallTrace()
  return traceCall(race_, trace)(I.map_(fa, E.left), I.map_(that, E.right))
}

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @trace call
 */
export function raceEither<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, Either<A, A1>> {
  const trace = accessCallTrace()
  return (fa) => traceCall(raceEither_, trace)(fa, that)
}
