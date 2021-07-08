import type * as HKT from '../HKT'
import type * as P from '../prelude'

import * as C from '../Chunk/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export function imapAChunk_<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, N extends string, K, Q, W, X, I, S, R, E, B>(
    ta: Iterable<A>,
    f: (i: number, a: A) => HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, B>
  ): HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, C.Chunk<B>> => {
    let output     = G.pure(C.empty<B>())
    const iterator = ta[Symbol.iterator]()
    let result: IteratorResult<A>
    let i          = 0
    while (!(result = iterator.next()).done) {
      output = G.crossWith_(output, f(i, result.value), C.append_)
      i++
    }

    return output
  }
}

export function imapAChunk<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, N extends string, K, Q, W, X, I, S, R, E, B>(
      f: (i: number, a: A) => HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, B>
    ) =>
    (ta: Iterable<A>): HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, C.Chunk<B>> =>
      imapAChunk_(G)(ta, f)
}

export function mapAChunk_<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, N extends string, K, Q, W, X, I, S, R, E, B>(
    ta: Iterable<A>,
    f: (a: A) => HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, B>
  ): HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, C.Chunk<B>> => imapAChunk_(G)(ta, (_, a) => f(a))
}

export function mapAChunk<G extends HKT.URIS, CG>(G: P.Applicative<G, CG>) {
  return <A, N extends string, K, Q, W, X, I, S, R, E, B>(f: (a: A) => HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, B>) =>
    (ta: Iterable<A>): HKT.Kind<G, CG, N, K, Q, W, X, I, S, R, E, C.Chunk<B>> =>
      imapAChunk_(G)(ta, (_, a) => f(a))
}
