// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { parallel, sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import { foreachPar_ as ioForeachPar_ } from '../../IO/combinators/foreachPar'
import { foreachUnitPar_ as ioForeachUnitPar_ } from '../../IO/combinators/foreachUnitPar'
import { tuple } from '../../tuple'
import { mapIO } from '../core'
import * as I from '../internal/io'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * @trace 1
 */
export function foreachPar_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, Chunk<B>> {
  return pipe(
    makeManagedReleaseMap(parallel),
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return ioForeachPar_(
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
 * @dataFirst foreachPar_
 * @trace 0
 */
export function foreachPar<R, E, A, B>(f: (a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachPar_(as, f)
}

/**
 * @trace 1
 */
export function foreachUnitPar_<R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> {
  return pipe(
    makeManagedReleaseMap(parallel),
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return ioForeachUnitPar_(
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
 * @dataFirst foreachUnitPar_
 * @trace 0
 */
export function foreachUnitPar<R, E, A>(f: (a: A) => Managed<R, E, unknown>): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnitPar_(as, f)
}
