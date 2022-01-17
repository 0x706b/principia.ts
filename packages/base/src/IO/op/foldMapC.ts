// tracing: off

import type { Monoid } from '../../Monoid'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { mergeAllC_ } from './mergeAllC'

/**
 * Combines an array of `IO`s in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapC_<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 1
     */
    <R, E, A>(as: Iterable<IO<R, E, A>>, f: (a: A) => M): IO<R, E, M> =>
      mergeAllC_(
        as,
        M.nat,
        traceAs(f, (m, a) => M.combine_(m, f(a)))
      )
  )
}

/**
 * Combines an array of `IO`s in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapC<M>(M: Monoid<M>) {
  return (
    /**
     * @trace 0
     */
    <A>(f: (a: A) => M) =>
      <R, E>(as: Iterable<IO<R, E, A>>): IO<R, E, M> =>
        foldMapC_(M)(as, f)
  )
}
