// tracing: off

import type { Conc } from '../../collection/immutable/Conc/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { flow } from '../../function'
import { map } from '../core'
import { filterC_ } from './filterC'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @trace 1
 */
export function filterNotC_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>> {
  return filterC_(
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
export function filterNotC<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Conc<A>> {
  return (as) => filterNotC_(as, f)
}
