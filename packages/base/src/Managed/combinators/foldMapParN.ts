// tracing: off

import type { Monoid } from '../../Monoid'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { mergeAllParN_ } from './mergeAllParN'

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN_<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 2
     */
    <R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number, f: (a: A) => M): Managed<R, E, M> =>
      mergeAllParN_(
        mas,
        n,
        M.nat,
        traceAs(f, (m, a) => M.combine_(m, f(a)))
      )
  )
}

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foldMapParN_
 */
export function foldMapParN<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 1
     */
    <A>(n: number, f: (a: A) => M) =>
      <R, E>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, M> =>
        foldMapParN_(M)(mas, n, f)
  )
}
