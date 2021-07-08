// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { ExecutionStrategy } from '../../ExecutionStrategy'

import * as I from '../core'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'

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
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, Chunk<B>> {
  switch (es._tag) {
    case 'Sequential': {
      return I.foreach_(as, f)
    }
    case 'Parallel': {
      return foreachPar_(as, f)
    }
    case 'ParallelN': {
      return foreachParN_(as, es.n, f)
    }
  }
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
  es: ExecutionStrategy,
  f: (a: A) => I.IO<R, E, B>
): (as: Iterable<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => foreachExec_(as, es, f)
}
