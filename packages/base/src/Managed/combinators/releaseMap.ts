// tracing: off

import type { ReleaseMap } from '../ReleaseMap'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import { Managed } from '../core'
import * as I from '../internal/io'
import { noopFinalizer } from '../ReleaseMap'

/**
 * Provides access to the entire map of resources allocated by this Managed
 *
 * @trace call
 */
export function releaseMap(): Managed<unknown, never, ReleaseMap> {
  const trace = accessCallTrace()
  return new Managed(
    pipe(I.ask<readonly [unknown, ReleaseMap]>(), I.map(traceFrom(trace, (tp) => [noopFinalizer, tp[1]])))
  )
}
