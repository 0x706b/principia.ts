// tracing: off

import type { Managed } from '../core'
import type * as I from '../internal/io'
import type { Finalizer } from '../ReleaseMap'

import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import * as Ma from '../core'
import { releaseMap } from './releaseMap'

export class ManagedScope {
  constructor(
    /**
     * @trace call
     */
    readonly apply: <R, E, A>(managed: Managed<R, E, A>) => I.IO<R, E, readonly [Finalizer, A]>
  ) {}
}

/**
 * @trace call
 */
export const scope: Managed<unknown, never, ManagedScope> = pipe(
  releaseMap,
  Ma.map(
    (finalizers) =>
      new ManagedScope(
        <R, E, A>(managed: Managed<R, E, A>): I.IO<R, E, readonly [Finalizer, A]> =>
          pipe(Ma.currentReleaseMap, FR.locally(finalizers, managed.io))
      )
  )
)
