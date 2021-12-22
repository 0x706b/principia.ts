// tracing: off

import type { IO } from '../core'

import { pipe } from '../../function'
import * as Ref from '../../Ref'
import { chain, crossSecond } from '../core'
import { foreachUnitPar } from './foreach-concurrent'

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @trace 2
 */
export function mergeAllPar_<R, E, A, B>(fas: Iterable<IO<R, E, A>>, b: B, f: (b: B, a: A) => B): IO<R, E, B> {
  return pipe(
    Ref.make(b),
    chain((acc) => pipe(fas, foreachUnitPar(chain((a) => Ref.update_(acc, (b) => f(b, a)))), crossSecond(Ref.get(acc))))
  )
}

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @trace 1
 */
export function mergeAllPar<A, B>(b: B, f: (b: B, a: A) => B) {
  return <R, E>(fas: Iterable<IO<R, E, A>>): IO<R, E, B> => mergeAllPar_(fas, b, f)
}
