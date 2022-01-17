// tracing: off

import type { Monoid } from '../../Monoid'
import type { Managed } from '../core'

import { traceAs } from '@principia/compile/util'

import { mergeAllC_ } from './mergeAllC'

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapC_<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 1
     */
    <R, E, A>(mas: Iterable<Managed<R, E, A>>, f: (a: A) => M): Managed<R, E, M> =>
      mergeAllC_(
        mas,
        M.nat,
        traceAs(f, (m, a) => M.combine_(m, f(a)))
      )
  )
}

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst foldMapC_
 */
export function foldMapC<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M) =>
      <R, E>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, M> =>
        foldMapC_(M)(mas, f)
  )
}
