// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as XR from '../../Ref'
import { chain, chain_ } from '../core'
import { foreachUnitParN_ } from './foreachUnitParN'

/**
 * Merges an `Iterable<IO>` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @trace 3
 */
export function mergeAllParN_<R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  n: number,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> {
  return chain_(XR.make(b), (acc) =>
    chain_(
      foreachUnitParN_(
        fas,
        n,
        chain(
          traceAs(f, (a) =>
            pipe(
              acc,
              XR.update((b) => f(b, a))
            )
          )
        )
      ),
      () => acc.get
    )
  )
}

/**
 * Merges an `Iterable<IO>` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllParN<A, B>(
  n: number,
  b: B,
  f: (b: B, a: A) => B
): <R, E>(fas: Iterable<IO<R, E, A>>) => IO<R, E, B> {
  return (fas) => mergeAllParN_(fas, n, b, f)
}
