// tracing: off

import type { Chunk } from '../../Chunk/core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Chunk/core'
import { pipe } from '../../function'
import * as It from '../../Iterable'
import * as M from '../../Maybe'
import * as Q from '../../Queue'
import * as I from '../core'
import { collectAllPar } from './collectAllPar'

/**
 * @trace 2
 */
export function foreachParN_<A, R, E, B>(as: Iterable<A>, n: number, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  const size   = 'length' in as && typeof as['length'] === 'number' ? as['length'] : It.size(as)
  const worker = (queue: Q.UQueue<readonly [A, number]>, array: Array<any>): I.IO<R, E, void> =>
    pipe(
      queue,
      Q.poll,
      I.chain(
        traceAs(
          f,
          M.match(
            () => I.unit(),
            ([a, n]) =>
              pipe(
                f(a),
                I.tap((b) =>
                  I.succeedLazy(() => {
                    array[n] = b
                  })
                ),
                I.crossSecond(worker(queue, array))
              )
          )
        )
      )
    )

  return I.gen(function* (_) {
    const array = yield* _(I.succeedLazy(() => new Array(size)))
    const queue = yield* _(Q.makeBounded<readonly [A, number]>(size))
    yield* _(pipe(queue, Q.offerAll(pipe(as, It.zipWithIndex))))
    yield* _(pipe(I.replicate_(worker(queue, array), n), collectAllPar))
    return C.from(array)
  })
}

/**
 * @trace 1
 */
export function foreachParN<R, E, A, B>(
  n: number,
  f: (a: A) => I.IO<R, E, B>
): (as: Iterable<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => foreachParN_(as, n, f)
}
