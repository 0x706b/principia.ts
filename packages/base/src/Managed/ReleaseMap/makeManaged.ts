// tracing: off

import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { concurrent, concurrentBounded } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as M from '../../Maybe'
import { bracketExit_, chain } from '../core'
import { concurrency } from '../op/concurrency'
import * as RM from './core'
import { releaseAll_ } from './releaseAll'

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 *
 * @trace call
 */
export function makeManaged(es: ExecutionStrategy): Managed<unknown, never, RM.ReleaseMap> {
  const trace = accessCallTrace()
  return traceCall(bracketExit_, trace)(RM.make, (rm, e) => releaseAll_(rm, e, es))
}

export const makeManagedC: Managed<unknown, never, RM.ReleaseMap> = pipe(
  concurrency,
  chain(
    M.match(
      () => makeManaged(concurrent),
      (n) => makeManaged(concurrentBounded(n))
    )
  )
)
