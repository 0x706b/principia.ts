// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import * as ES from '../../ExecutionStrategy'
import { pipe } from '../../function'
import { foreach_ } from '../core'
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
  strategy: ES.ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>
): Managed<R, E, Chunk<B>> {
  return ES.match_(
    strategy,
    () => foreach_(as, f),
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
 * @dataFirst foreachExec_
 * @trace 1
 */
export function foreachExec<R, E, A, B>(
  strategy: ES.ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachExec_(as, strategy, f)
}
