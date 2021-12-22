// tracing: off

import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Managed } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'

import { parallel, parallelN } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as M from '../../Maybe'
import { bracketExit_, chain } from '../core'
import * as RM from '../ReleaseMap'
import { concurrency } from './concurrency'
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

export const makeManagedReleaseMapPar: Managed<unknown, never, RM.ReleaseMap> = pipe(
  concurrency,
  chain(
    M.match(
      () => makeManagedReleaseMap(parallel),
      (n) => makeManagedReleaseMap(parallelN(n))
    )
  )
)
