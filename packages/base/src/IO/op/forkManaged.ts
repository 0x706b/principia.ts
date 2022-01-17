// tracing: off

import type { RuntimeFiber } from '../../Fiber'
import type { Managed } from '../../Managed'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { fork } from '../../Managed/op'
import { toManaged } from './toManaged'

/**
 * @trace call
 */
export function forkManaged<R, E, A>(ma: IO<R, E, A>): Managed<R, never, RuntimeFiber<E, A>> {
  const trace = accessCallTrace()
  return traceCall(fork, trace)(toManaged()(ma))
}
