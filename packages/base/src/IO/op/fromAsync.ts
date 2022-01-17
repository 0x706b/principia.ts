import type { Async } from '../../Async'

import { accessCallTrace, traceAs } from '@principia/compile/util'

import { runAsyncEnv_ } from '../../Async'
import * as E from '../../Either'
import { flow } from '../../function'
import * as C from '../Cause'
import * as I from '../core'
import * as Ex from '../Exit'

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
        I.asyncInterrupt<unknown, E, A>((k) => {
          const canceller = runAsyncEnv_(
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

          return E.left(I.succeedLazy(canceller))
        })
      )
    )
  )
}
