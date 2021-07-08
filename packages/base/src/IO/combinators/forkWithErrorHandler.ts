// tracing: off

import type { FiberContext } from '../../Fiber'
import type { IO, URIO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as E from '../../Either'
import { flow, pipe } from '../../function'
import { fork, halt } from '../core'
import { onError } from './onError'

/**
 * @trace 1
 */
export function forkWithErrorHandler_<R, E, A, R1>(ma: IO<R, E, A>, handler: (e: E) => URIO<R1, void>) {
  return pipe(ma, onError(traceAs(handler, flow(C.failureOrCause, E.match(handler, halt)))), fork)
}

/**
 * @trace 0
 */
export function forkWithErrorHandler<E, R1>(
  handler: (e: E) => URIO<R1, void>
): <R, A>(ma: IO<R, E, A>) => URIO<R & R1, FiberContext<E, A>> {
  return (ma) => forkWithErrorHandler_(ma, handler)
}
