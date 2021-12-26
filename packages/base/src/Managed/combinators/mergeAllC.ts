// tracing: off

import * as FR from '../../FiberRef/core'
import { pipe } from '../../function'
import { mergeAllC as ioMergeAllC } from '../../IO/combinators/mergeAllC'
import * as Iter from '../../Iterable'
import * as Ma from '../core'
import * as I from '../internal/_io'
import * as RM from '../ReleaseMap'

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * @trace 2
 */
export function mergeAllC_<R, E, A, B>(
  mas: Iterable<Ma.Managed<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Ma.Managed<R, E, B> {
  return pipe(
    RM.makeManagedC,
    Ma.mapIO((parallelReleaseMap) =>
      pipe(
        Ma.currentReleaseMap,
        FR.locally(
          parallelReleaseMap,
          pipe(
            mas,
            Iter.map((m) =>
              pipe(
                m.io,
                I.map(([_, a]) => a)
              )
            ),
            ioMergeAllC(b, f)
          )
        )
      )
    )
  )
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
): <R, E>(mas: Iterable<Ma.Managed<R, E, A>>) => Ma.Managed<R, E, B> {
  return (mas) => mergeAllC_(mas, b, f)
}
