// tracing: off

import type { Managed } from '../core'

import * as Iter from '../../Iterable'
import { succeed } from '../core'
import { crossWithC_ } from './apply-par'

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * @trace 2
 */
export function mergeAllC_<R, E, A, B>(mas: Iterable<Managed<R, E, A>>, b: B, f: (b: B, a: A) => B): Managed<R, E, B> {
  return Iter.foldl_(mas, succeed(b) as Managed<R, E, B>, (b, a) => crossWithC_(b, a, f))
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * @dataFirst mergeAllC_
 * @trace 1
 */
export function mergeAllC<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAllC_(mas, b, f)
}
