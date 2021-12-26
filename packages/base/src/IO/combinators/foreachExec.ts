// tracing: off

import type { Chunk } from '../../Chunk/core'

import * as ES from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as I from '../core'
import { withConcurrency, withConcurrencyUnbounded } from './concurrency'
import { foreachC } from './foreachC'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 2
 */
export function foreachExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ES.ExecutionStrategy,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, Chunk<B>> {
  return ES.match_(
    es,
    () => I.foreach_(as, f),
    () => pipe(as, foreachC(f), withConcurrencyUnbounded),
    (fiberBound) => pipe(as, foreachC(f), withConcurrency(fiberBound))
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 1
 */
export function foreachExec<R, E, A, B>(
  es: ES.ExecutionStrategy,
  f: (a: A) => I.IO<R, E, B>
): (as: Iterable<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => foreachExec_(as, es, f)
}
