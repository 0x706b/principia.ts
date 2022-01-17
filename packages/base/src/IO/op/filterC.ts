// tracing: off

import type { Conc } from '../../collection/immutable/Conc/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../collection/immutable/Conc/core'
import { pipe } from '../../function'
import * as M from '../../Maybe'
import * as I from '../core'
import { foreachC } from './foreachC'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 1
 */
export function filterC_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>> {
  return pipe(as, foreachC(traceAs(f, (a) => I.map_(f(a), (b) => (b ? M.just(a) : M.nothing())))), I.map(C.compact))
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 0
 */
export function filterC<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, Conc<A>> {
  return (as) => filterC_(as, f)
}
