// tracing: off

import type { FiberContext } from '../../Fiber/FiberContext'
import type { IO, URIO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { fiberName } from '../../Fiber/fiberName'
import * as FiberRef from '../../FiberRef'
import { pipe } from '../../function'
import * as M from '../../Maybe'
import * as I from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Forks the effect into a new independent fiber, with the specified name.
 *
 * @trace call
 */
export function forkAs_<R, E, A>(ma: IO<R, E, A>, name: string): URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      pipe(
        fiberName,
        FiberRef.set(M.just(name)),
        I.chain(() => I.fork(restore(ma)))
      )
    )
  )
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 *
 * @trace call
 */
export function forkAs(name: string): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(forkAs_, trace)(ma, name)
}
