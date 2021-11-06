// tracing: off

import type { FiberContext } from '../../Fiber'
import type { Managed } from '../../Managed'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { fork } from '../../Managed/combinators'
import { toManaged } from './toManaged'

/**
 * @trace call
 */
export function forkManaged<R, E, A>(ma: IO<R, E, A>): Managed<R, never, FiberContext<E, A>> {
  const trace = accessCallTrace()
  return traceCall(fork, trace)(toManaged()(ma))
}
