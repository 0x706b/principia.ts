// tracing: off

import type { Monoid } from '../../Monoid'
import type { IO } from '../core'

import { mergeAllParN_ } from './mergeAllParN'

/**
 * Combines an array of `IO`s in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN_<M>(
  M: Monoid<M>
): <R, E, A>(as: ReadonlyArray<IO<R, E, A>>, n: number, f: (a: A) => M) => IO<R, E, M> {
  return (
    /**
     * @trace 2
     */
    (as, n, f) => mergeAllParN_(as, n, M.nat, (m, a) => M.combine_(m, f(a)))
  )
}

/**
 * Combines an array of `IO`s in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN<M>(
  M: Monoid<M>
): <A>(n: number, f: (a: A) => M) => <R, E>(as: ReadonlyArray<IO<R, E, A>>) => IO<R, E, M> {
  return (
    /**
     * @trace 1
     */
    (n, f) => (as) => foldMapParN_(M)(as, n, f)
  )
}
