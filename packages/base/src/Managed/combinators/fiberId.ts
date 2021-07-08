// tracing: off

import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { fromIO } from '../core'
import * as I from '../internal/_io'

/**
 * @trace call
 */
export function fiberId(): Managed<unknown, never, FiberId> {
  const trace = accessCallTrace()
  return traceCall(fromIO, trace)(I.fiberId())
}
