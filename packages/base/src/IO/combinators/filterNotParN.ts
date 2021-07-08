// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { flow } from '../../function'
import { map } from '../core'
import { filterParN_ } from './filterParN'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @trace 2
 */
export function filterNotParN_<A, R, E>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => IO<R, E, boolean>
): IO<R, E, Chunk<A>> {
  return filterParN_(
    as,
    n,
    traceAs(
      f,
      flow(
        f,
        map((b) => !b)
      )
    )
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @trace 1
 */
export function filterNotParN<A, R, E>(
  n: number,
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filterNotParN_(as, n, f)
}
