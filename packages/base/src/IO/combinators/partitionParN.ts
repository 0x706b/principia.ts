// tracng: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { identity } from '../../function'
import * as I from '../../Iterable'
import { either, map_ } from '../core'
import { foreachParN_ } from './foreachParN'

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 *
 * @trace 2
 */
export function partitionParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(
    foreachParN_(
      as,
      n,
      traceAs(f, (a) => either(f(a)))
    ),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 *
 * @trace 1
 */
export function partitionParN<R, E, A, B>(
  n: number,
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (as) => partitionParN_(as, n, f)
}
