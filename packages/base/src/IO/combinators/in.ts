// tracing: off

import type { Scope } from '../../Scope'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as A from '../../Array/core'
import * as F from '../../Fiber'
import { pipe } from '../../function'
import * as O from '../../Option'
import { chain } from '../core'
import { forkDaemon } from './core-scope'
import { onInterrupt, uninterruptibleMask } from './interrupt'

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 *
 * @trace call
 */
export function in_<R, E, A>(io: IO<R, E, A>, scope: Scope<any>): IO<R, E, A> {
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      pipe(
        io,
        restore,
        forkDaemon,
        chain((executor) =>
          pipe(
            scope.extend(executor.scope),
            chain(() =>
              pipe(
                restore(F.join(executor)),
                onInterrupt((interruptors) =>
                  pipe(
                    Array.from(interruptors),
                    A.head,
                    O.match(
                      () => F.interrupt(executor),
                      (id) => executor.interruptAs(id)
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
}

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 *
 * @trace call
 */
function _in(scope: Scope<any>): <R, E, A>(io: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (io) => traceCall(in_, trace)(io, scope)
}

export { _in as in }
