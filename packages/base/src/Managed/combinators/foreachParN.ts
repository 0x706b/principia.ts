// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { parallelN, sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import { foreachParN_ as effectForeachParN } from '../../IO/combinators/foreachParN'
import { foreachUnitParN_ as effectForeachUnitParN } from '../../IO/combinators/foreachUnitParN'
import { tuple } from '../../tuple'
import { mapIO } from '../core'
import * as I from '../internal/io'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 *
 * @trace 1
 */
export function foreachParN<R, E, A, B>(
  n: number,
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachParN_(as, n, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 *
 * @dataFirst foreachParN_
 * @trace 2
 */
export function foreachParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, B>
): Managed<R, E, Chunk<B>> {
  return pipe(
    makeManagedReleaseMap(parallelN(n)),
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return effectForeachParN(
        as,
        n,
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
 * Applies the function `f` to each element of the `Iterable<A>` in parallel, discarding the results`.
 *
 * Unlike `foreachUnitPar`, this method will use at most up to `n` fibers.
 *
 * @trace 1
 */
export function foreachUnitParN<R, E, A>(
  n: number,
  f: (a: A) => Managed<R, E, unknown>
): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnitParN_(as, n, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel, discarding the results`.
 *
 * Unlike `foreachUnitPar_`, this method will use at most up to `n` fibers.
 *
 * @trace 2
 */
export function foreachUnitParN_<R, E, A>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, unknown>
): Managed<R, E, void> {
  return pipe(
    makeManagedReleaseMap(parallelN(n)),
    mapIO((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return effectForeachUnitParN(
        as,
        n,
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
