import * as FR from '../../FiberRef'
import { pipe } from '../../function'
import * as M from '../../Maybe'
import * as I from '../core'

/**
 * The number of fibers used for concurrent operators.
 */
export const Concurrency: FR.Runtime<M.Maybe<number>> = FR.unsafeMake(M.nothing())

/**
 * Retrieves the maximum number of fibers for concurrent operators or `Nothing` if
 * it is unbounded.
 */
export const concurrency: I.UIO<M.Maybe<number>> = FR.get(Concurrency)

/**
 * Retrieves the current maximum number of fibers for concurrent operators and
 * uses it to run the specified effect.
 */
export function concurrencyWith<R, E, A>(f: (concurrency: M.Maybe<number>) => I.IO<R, E, A>): I.IO<R, E, A> {
  return pipe(Concurrency, FR.getWith(f))
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * concurrent operators.
 */
export function withConcurrency_<R, E, A>(ma: I.IO<R, E, A>, n: number): I.IO<R, E, A> {
  return I.defer(() => pipe(Concurrency, FR.locally(M.just(n), ma)))
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * concurrent operators.
 */
export function withConcurrency(n: number): <R, E, A>(ma: I.IO<R, E, A>) => I.IO<R, E, A> {
  return (ma) => withConcurrency_(ma, n)
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * concurrent operators.
 */
export function withConcurrencyUnbounded<R, E, A>(ma: I.IO<R, E, A>): I.IO<R, E, A> {
  return I.defer(() => pipe(Concurrency, FR.locally(M.nothing(), ma)))
}
