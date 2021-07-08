// tracing: off

import type { Managed } from '../core'
import type { Finalizer } from '../ReleaseMap'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import { tuple } from '../../tuple'
import { map } from '../core'
import * as I from '../internal/io'
import { releaseMap } from './releaseMap'

export class ManagedScope {
  constructor(readonly apply: <R, E, A>(managed: Managed<R, E, A>) => I.IO<R, E, readonly [Finalizer, A]>) {}
}

/**
 * @trace call
 */
export function scope(): Managed<unknown, never, ManagedScope> {
  const trace = accessCallTrace()
  return pipe(
    releaseMap(),
    map(
      traceFrom(
        trace,
        (finalizers) =>
          new ManagedScope(
            <R, E, A>(managed: Managed<R, E, A>): I.IO<R, E, readonly [Finalizer, A]> =>
              pipe(
                I.ask<R>(),
                I.chain((r) => I.giveAll_(managed.io, tuple(r, finalizers)))
              )
          )
      )
    )
  )
}
