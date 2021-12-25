// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import { foreachC_ as ioForeachC_, foreachUnitC_ as ioForeachUnitC_ } from '../../IO/combinators/foreachC'
import { tuple } from '../../tuple/core'
import { mapIO } from '../core'
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
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        RM.makeManaged(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return ioForeachC_(
        as,
        traceAs(f, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
              pipe(
                f(a).io,
                I.map(([_fin, r]) => r),
                I.gives((r0: R) => tuple(r0, innerMap))
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
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        RM.makeManaged(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return ioForeachUnitC_(
        as,
        traceAs(f, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
              pipe(
                f(a).io,
                I.map(([_fin, r]) => r),
                I.gives((r0: R) => tuple(r0, innerMap))
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
