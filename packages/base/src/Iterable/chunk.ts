import type * as HKT from '../HKT'
import type * as P from '../prelude'

import * as C from '../Chunk/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export function traverseChunk_<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, K, Q, W, X, I, S, R, E, B>(
    ta: Iterable<A>,
    f: (a: A, i: number) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
  ): HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>> => {
    let output     = G.pure(C.empty<B>())
    const iterator = ta[Symbol.iterator]()
    let result: IteratorResult<A>
    let i          = 0
    while (!(result = iterator.next()).done) {
      output = G.crossWith_(output, f(result.value, i), C.append_)
      i++
    }

    return output
  }
}

export function traverseChunk<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, K, Q, W, X, I, S, R, E, B>(f: (a: A, i: number) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>) =>
    (ta: Iterable<A>): HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>> =>
      traverseChunk_(G)(ta, f)
}
