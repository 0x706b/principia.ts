// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import { foreachC_ as ioForeachC_, foreachUnitC_ as ioForeachUnitC_ } from '../../IO/combinators/foreachC'
import { tuple } from '../../tuple/core'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * @trace 1
 */
export function foreachC_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, Chunk<B>> {
  return pipe(
    RM.makeManagedC,
    Ma.mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        Ma.currentReleaseMap,
        FR.locally(
          parallelReleaseMap,
          pipe(
            RM.makeManaged(sequential).io,
            I.map(([_, r]) => r)
          )
        )
      )

      return ioForeachC_(
        as,
        traceAs(f, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
              pipe(
                Ma.currentReleaseMap,
                FR.locally(
                  innerMap,
                  pipe(
                    f(a).io,
                    I.map(([_, a]) => a)
                  )
                )
              )
            )
          )
        )
      )
    })
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @dataFirst foreachC_
 * @trace 0
 */
export function foreachC<R, E, A, B>(f: (a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachC_(as, f)
}

/**
 * @trace 1
 */
export function foreachUnitC_<R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> {
  return pipe(
    RM.makeManagedC,
    Ma.mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        Ma.currentReleaseMap,
        FR.locally(
          parallelReleaseMap,
          pipe(
            RM.makeManaged(sequential).io,
            I.map(([_, r]) => r)
          )
        )
      )

      return ioForeachUnitC_(
        as,
        traceAs(f, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
              pipe(
                Ma.currentReleaseMap,
                FR.locally(
                  innerMap,
                  pipe(
                    f(a).io,
                    I.map(([_, a]) => a)
                  )
                )
              )
            )
          )
        )
      )
    })
  )
}

/**
 * @dataFirst foreachUnitC_
 * @trace 0
 */
export function foreachUnitC<R, E, A>(f: (a: A) => Managed<R, E, unknown>): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnitC_(as, f)
}
