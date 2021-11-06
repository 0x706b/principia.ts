// tracing: off

import type { Chunk } from '../../Chunk/core'
import type * as I from '../core'

import * as _ from './foreachUnitPar'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @trace 1
 */
export const foreachPar_: <R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>) => I.IO<R, E, Chunk<B>> =
  _._foreachPar

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 *
 * @dataFirst foreachPar_
 * @trace 0
 */
export function foreachPar<R, E, A, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => foreachPar_(as, f)
}
