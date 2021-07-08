// tracing: off

import type { Managed } from '../core'

import { parallelN } from '../../ExecutionStrategy'
import { pipe } from '../../function'
import * as Iter from '../../Iterable'
import { mapIO } from '../core'
import * as I from '../internal/_io'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * Unlike `mergeAllPar`, this method will use at most up to `n` fibers.
 *
 * @trace 3
 */
export function mergeAllParN_<R, E, A, B>(
  mas: Iterable<Managed<R, E, A>>,
  n: number,
  b: B,
  f: (b: B, a: A) => B
): Managed<R, E, B> {
  return pipe(
    makeManagedReleaseMap(parallelN(n)),
    mapIO((rm) =>
      pipe(
        mas,
        Iter.map((m) => I.map_(m.io, ([_, a]) => a)),
        I.mergeAllParN(n, b, f),
        I.gives((_: R) => [_, rm] as const)
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
 * Unlike `mergeAllPar`, this method will use at most up to `n` fibers.
 *
 * @dataFirst mergeAllParN_
 * @trace 2
 */
export function mergeAllParN<A, B>(
  n: number,
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAllParN_(mas, n, b, f)
}
