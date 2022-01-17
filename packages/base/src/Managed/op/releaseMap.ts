// tracing: off

import type { ReleaseMap } from '../ReleaseMap'

import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import { currentReleaseMap, Managed } from '../core'
import * as I from '../internal/io'
import { noopFinalizer } from '../ReleaseMap'

/**
 * Provides access to the entire map of resources allocated by this Managed
 *
 * @trace call
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = new Managed(
  pipe(
    FR.get(currentReleaseMap),
    I.map((releaseMap) => [noopFinalizer, releaseMap])
  )
)
