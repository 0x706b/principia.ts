// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { flow } from '../../function'
import { map } from '../core'
import { filterPar_ } from './filterPar'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @trace 1
 */
export function filterNotPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>> {
  return filterPar_(
    as,
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
 * @trace 0
 */
export function filterNotPar<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filterNotPar_(as, f)
}
