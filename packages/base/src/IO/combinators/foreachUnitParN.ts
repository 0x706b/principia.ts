// tracing: off

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as Semaphore from '../../Semaphore'
import * as I from '../core'
import { foreachUnitPar_ } from './foreachUnitPar'

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 *
 * @trace 2
 */
export function foreachUnitParN_<A, R, E>(as: Iterable<A>, n: number, f: (a: A) => I.IO<R, E, any>): I.IO<R, E, void> {
  return pipe(
    Semaphore.make(n),
    I.chain((s) =>
      foreachUnitPar_(
        as,
        traceAs(f, (a) => Semaphore.withPermit(s)(f(a)))
      )
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 *
 * @trace 1
 */
export function foreachUnitParN<A, R, E>(
  n: number,
  f: (a: A) => I.IO<R, E, any>
): (as: Iterable<A>) => I.IO<R, E, void> {
  return (as) => foreachUnitParN_(as, n, f)
}
