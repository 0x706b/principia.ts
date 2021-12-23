// tracing: off

import type { IO } from '../core'

import { pipe } from '../../function'
import * as Ref from '../../Ref'
import { apSecond, chain } from '../core'
import { foreachUnitC } from './foreachC'

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
export function mergeAllC_<R, E, A, B>(fas: Iterable<IO<R, E, A>>, b: B, f: (b: B, a: A) => B): IO<R, E, B> {
  return pipe(
    Ref.make(b),
    chain((acc) => pipe(fas, foreachUnitC(chain((a) => Ref.update_(acc, (b) => f(b, a)))), apSecond(Ref.get(acc))))
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
export function mergeAllC<A, B>(b: B, f: (b: B, a: A) => B) {
  return <R, E>(fas: Iterable<IO<R, E, A>>): IO<R, E, B> => mergeAllC_(fas, b, f)
}
