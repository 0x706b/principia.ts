import type * as HKT from '../HKT'
import type * as P from '../prelude'

import * as C from '../Chunk/core'

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export function itraverseChunk_<G extends HKT.HKT, CG>(
  G: P.Applicative<G, CG>
): <A, K, Q, W, X, I, S, R, E, B>(
  ta: Iterable<A>,
  f: (i: number, a: A) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>>
export function itraverseChunk_<G>(G: P.Applicative<HKT.F<G>>) {
  return <A, K, Q, W, X, I, S, R, E, B>(
    ta: Iterable<A>,
    f: (i: number, a: A) => HKT.FK<G, K, Q, W, X, I, S, R, E, B>
  ): HKT.FK<G, K, Q, W, X, I, S, R, E, C.Chunk<B>> => {
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

export function itraverseChunk<G extends HKT.HKT, CG>(
  G: P.Applicative<G, CG>
): <A, K, Q, W, X, I, S, R, E, B>(
  f: (i: number, a: A) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => (ta: Iterable<A>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>> {
  return (f) => (ta) => itraverseChunk_(G)(ta, f)
}

export function traverseChunk_<G extends HKT.HKT, CG>(
  G: P.Applicative<G, CG>
): <A, K, Q, W, X, I, S, R, E, B>(
  ta: Iterable<A>,
  f: (a: A) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>> {
  return (ta, f) => itraverseChunk_(G)(ta, (_, a) => f(a))
}

export function traverseChunk<G extends HKT.HKT, CG>(
  G: P.Applicative<G, CG>
): <A, K, Q, W, X, I, S, R, E, B>(
  f: (a: A) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, B>
) => (ta: Iterable<A>) => HKT.Kind<G, CG, K, Q, W, X, I, S, R, E, C.Chunk<B>> {
  return (f) => (ta) => traverseChunk_(G)(ta, f)
}
