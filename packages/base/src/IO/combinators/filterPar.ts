// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Chunk/core'
import { pipe } from '../../function'
import * as O from '../../Option'
import { map, map_ } from '../core'
import { foreachPar } from './foreachPar'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 1
 */
export function filterPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>> {
  return pipe(as, foreachPar(traceAs(f, (a) => map_(f(a), (b) => (b ? O.some(a) : O.none())))), map(C.compact))
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 0
 */
export function filterPar<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Chunk<A>> {
  return (as) => filterPar_(as, f)
}
