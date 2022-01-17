// tracing: off

import type { FiberId } from '../../Fiber'
import type { Managed } from '../core'

import { fromIO } from '../core'
import * as I from '../internal/_io'

/**
 * @trace call
 */
export const fiberId: Managed<unknown, never, FiberId> = fromIO(I.fiberId)
