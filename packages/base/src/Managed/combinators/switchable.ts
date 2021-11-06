// tracing: off

import type { Managed } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import { tuple } from '../../tuple'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RelMap from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'
import { releaseMap } from './releaseMap'

/**
 * Returns a `Managed` value that represents a managed resource that can
 * be safely swapped within the scope of the `Managed`. The function provided
 * inside the `Managed` can be used to switch the resource currently in use.
 *
 * When the resource is switched, the finalizer for the previous finalizer will
 * be executed uninterruptibly. If the effect executing inside the `use`
 * is interrupted, the finalizer for the resource currently in use is guaranteed
 * to execute.
 *
 * This constructor can be used to create an expressive control flow that uses
 * several instances of a managed resource.
 *
 * @trace call
 */
export function switchable<R, E, A>(): Managed<R, never, (x: Managed<R, E, A>) => I.IO<R, E, A>> {
  const trace = accessCallTrace()
  return Ma.gen(function* (_) {
    const rm  = yield* _(releaseMap())
    const key = yield* _(
      pipe(
        RelMap.addIfOpen(rm, (_) => I.unit()),
        I.chain(M.match(() => I.interrupt, I.succeed)),
        Ma.fromIO
      )
    )
    return (newResource: Managed<R, E, A>) =>
      I.uninterruptibleMask(
        traceFrom(trace, ({ restore }) =>
          I.gen(function* (_) {
            yield* _(
              pipe(
                RelMap.replace(rm, key, (_) => I.unit()),
                I.chain(
                  M.match(
                    () => I.unit(),
                    (fin) => fin(Ex.unit())
                  )
                )
              )
            )
            const r     = yield* _(I.ask<R>())
            const inner = yield* _(RelMap.make)
            const a     = yield* _(pipe(newResource.io, I.giveAll(tuple(r, inner)), restore))
            yield* _(RelMap.replace(rm, key, (exit) => releaseAll_(inner, exit, sequential)))
            return a[1]
          })
        )
      )
  })
}
