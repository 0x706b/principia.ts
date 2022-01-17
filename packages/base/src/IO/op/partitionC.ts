// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as I from '../../collection/Iterable'
import { flow, identity } from '../../function'
import { either, map_ } from '../core'
import { foreachC_ } from './foreachC'

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * @trace 1
 */
export function partitionC_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(foreachC_(as, traceAs(f, flow(f, either))), I.partitionMap(identity))
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * @trace 0
 */
export function partitionC<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (as) => partitionC_(as, f)
}
