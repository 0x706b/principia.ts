import type { Async } from '../../../Async'

import { accessCallTrace, traceAs } from '@principia/compile/util'

import { runAsyncEnv } from '../../../Async'
import { flow } from '../../../function'
import * as C from '../../Cause'
import * as Ex from '../../Exit'
import { FiberId } from '../../Fiber'
import * as I from '../core'
import { asyncInterrupt } from './interrupt'

/**
 * Lifts an `Async` computation into an `IO`
 *
 * @trace call
 */
export function fromAsync<R, E, A>(effect: Async<R, E, A>): I.IO<R, E, A> {
  const trace = accessCallTrace()
  return I.deferWith((_, id) =>
    I.asksIO(
      traceAs(trace, (env: R) =>
        asyncInterrupt<unknown, E, A>((k) => {
          const canceller = runAsyncEnv(
            effect,
            env,
            flow(
              Ex.mapErrorCause(
                C.fold<void, E, C.Cause<E>>(
                  (): C.Cause<E> => C.empty,
                  C.fail,
                  C.halt,
                  () => C.interrupt(id),
                  C.then,
                  C.both,
                  C.traced
                )
              ),
              I.fromExit,
              k
            )
          )

          return I.succeedLazy(canceller)
        })
      )
    )
  )
}