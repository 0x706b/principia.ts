// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Chunk/core'
import { pipe } from '../../function'
import * as O from '../../Option'
import { map, map_ } from '../core'
import { foreachParN } from './foreachParN'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 *
 * @trace 2
 */
export function filterParN_<A, R, E>(as: Iterable<A>, n: number, f: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>> {
  return pipe(
    as,
    foreachParN(
      n,
      traceAs(f, (a) => map_(f(a), (b) => (b ? O.some(a) : O.none())))
    ),
    map(C.compact)
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 *
 * @trace 1
 */
export function filterParN<A, R, E>(
  n: number,
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filterParN_(as, n, f)
}
