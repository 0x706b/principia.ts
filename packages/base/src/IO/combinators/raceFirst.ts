// tracing: off

import type { Exit } from '../../Exit'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { pipe } from '../../function'
import * as I from '../core'
import { race_ } from './race'

/**
 * @trace call
 */
export function raceFirst_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, that: IO<R1, E1, A1>): IO<R & R1, E | E1, A | A1> {
  const trace = accessCallTrace()
  return pipe(
    traceCall(race_, trace)(I.result(ma), I.result(that)),
    I.chain((a) => I.done(a as Exit<E | E1, A | A1>))
  )
}

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 *
 * @trace call
 */
export function raceFirst<R1, E1, A1>(that: IO<R1, E1, A1>): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  const trace = accessCallTrace()
  return (ma) => traceCall(raceFirst_, trace)(ma, that)
}
