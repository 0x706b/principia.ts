// tracing: off

import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { bracketExit_ } from '../core'
import * as RM from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 *
 * @trace call
 */
export function makeManagedReleaseMap(es: ExecutionStrategy): Managed<unknown, never, RM.ReleaseMap> {
  const trace = accessCallTrace()
  return traceCall(bracketExit_, trace)(RM.make, (rm, e) => releaseAll_(rm, e, es))
}
