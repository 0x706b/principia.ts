import type { Async } from '../../../Async'

import { accessCallTrace, traceAs } from '@principia/compile/util'

import { runAsyncEnv } from '../../../Async'
import * as C from '../../Cause'
import * as I from '../core'
import { asyncInterrupt } from './interrupt'

/**
 * Lifts an `Async` computation into an `IO`
 *
 * @trace call
 */
export function fromAsync<R, E, A>(effect: Async<R, E, A>): I.IO<R, E, A> {
  const trace = accessCallTrace()
  return I.asksIO(
    traceAs(trace, (_: R) =>
      asyncInterrupt<unknown, E, A>((k) => {
        const canceller = runAsyncEnv(effect, _, (ex) => {
          switch (ex._tag) {
            case 'Success': {
              k(I.succeed(ex.value))
              break
            }
            case 'Failure': {
              k(I.fail(ex.error))
              break
            }
            case 'Interrupt': {
              k(I.descriptorWith((d) => I.failCause(C.interrupt(d.id))))
              break
            }
          }
        })

        return I.succeedLazy(canceller)
      })
    )
  )
}
