// tracing: off

import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as E from '../../Either'
import * as Ex from '../../Exit'
import { flow } from '../../function'
import * as I from '../core'
import { bracketExit_ } from './bracketExit'

/**
 * @trace call
 * @trace 1
 */
export function onTermination_<R, E, A, R1>(
  io: IO<R, E, A>,
  onTerminated: (cause: Cause<never>) => I.URIO<R1, any>
): IO<R & R1, E, A> {
  const trace = accessCallTrace()
  return bracketExit_(
    I.unit(),
    traceFrom(trace, () => io),
    traceAs(onTerminated, (_, exit) =>
      Ex.match_(
        exit,
        flow(
          C.failureOrCause,
          E.match(() => I.unit(), onTerminated)
        ),
        () => I.unit()
      )
    )
  )
}

/**
 * @trace call
 * @trace 0
 */
export function onTermination<R1>(
  onTerminated: (cause: Cause<never>) => I.URIO<R1, any>
): <R, E, A>(io: I.IO<R, E, A>) => I.IO<R & R1, E, A> {
  const trace = accessCallTrace()
  return (io) => traceCall(onTermination_, trace)(io, onTerminated)
}
