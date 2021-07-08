// tracing: off

import type { IO, URIO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as Fiber from '../../Fiber'
import * as FiberRef from '../../FiberRef'
import { pipe } from '../../function'
import * as O from '../../Option'
import { chain, fork } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Forks the effect into a new independent fiber, with the specified name.
 *
 * @trace call
 */
export function forkAs_<R, E, A>(ma: IO<R, E, A>, name: string): URIO<R, Fiber.FiberContext<E, A>> {
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      pipe(
        Fiber.fiberName,
        FiberRef.set(O.some(name)),
        chain(() => fork(restore(ma)))
      )
    )
  )
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 *
 * @trace call
 */
export function forkAs(name: string): <R, E, A>(ma: IO<R, E, A>) => URIO<R, Fiber.FiberContext<E, A>> {
  const trace = accessCallTrace()
  return (ma) => traceCall(forkAs_, trace)(ma, name)
}
