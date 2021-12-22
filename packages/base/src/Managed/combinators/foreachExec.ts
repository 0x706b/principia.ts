// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Managed } from '../core'

import { pipe } from '../../function'
import { foreach_ } from '../core'
import { withConcurrency, withConcurrencyUnbounded } from './concurrency'
import { foreachPar } from './foreachPar'

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
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>
): Managed<R, E, Chunk<B>> {
  switch (es._tag) {
    case 'Sequential': {
      return foreach_(as, f)
    }
    case 'Parallel': {
      return pipe(as, foreachPar(f), withConcurrencyUnbounded)
    }
    case 'ParallelN': {
      return pipe(as, foreachPar(f), withConcurrency(es.n))
    }
  }
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
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachExec_(as, es, f)
}
