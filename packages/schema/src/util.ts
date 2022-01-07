import type { Prism } from '@principia/base/Prism'
import type { RoseTree } from '@principia/base/RoseTree'
import type { Mutable } from '@principia/base/util/types'

import * as A from '@principia/base/collection/immutable/Array'
import * as P from '@principia/base/prelude'
import * as RT from '@principia/base/RoseTree'

/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

export type InputOfPrism<P> = P extends Prism<infer S, any> ? S : never
export type TypeOfPrism<P> = P extends Prism<any, infer A> ? A : never

export type DefaultConstraint = 'both' | 'decoder' | 'constructor'

export const isUnknownRecord = (u: unknown): u is Record<PropertyKey, unknown> =>
  u !== null && typeof u === 'object' && !Array.isArray(u)

export interface IndexMap {
  '0': 0
  '1': 1
  '2': 2
  '3': 3
  '4': 4
  '5': 5
  '6': 6
  '7': 7
  '8': 8
  '9': 9
  '10': 10
  '11': 11
  '12': 12
  '13': 13
  '14': 14
  '15': 15
  '16': 16
  '17': 17
  '18': 18
  '19': 19
  '20': 20
}

export type CastToNumber<T> = T extends keyof IndexMap ? IndexMap[T] : number

export type MutableTree<A> = Mutable<RoseTree<A>>
export type MutableForest<A> = Array<MutableTree<A>>

/**
 * Merges an array of `RoseTree`s based on their value
 */
export function mergeEqualValues<A>(EA: P.Eq<A>): (forest: RT.Forest<A>) => RT.Forest<A> {
  return (forest) => {
    const collectedValues: A[]     = []
    const merged: MutableForest<A> = []
    for (let i = 0; i < forest.length; i++) {
      const t = forest[i]
      if (collectedValues.find((p) => EA.equals_(p, t.value))) {
        // value has already been collected
        continue
      } else {
        // copy tree
        let merge: RoseTree<A> = RT.roseTree(t.value, t.forest)
        collectedValues.push(t.value)
        // get the remaining trees in the input
        const remaining = forest.slice(i + 1)
        // concatenate forests of equal value trees
        for (let j = 0; j < remaining.length; j++) {
          const w = remaining[j]
          if (EA.equals_(merge.value, w.value)) {
            merge = RT.roseTree(merge.value, A.concat_(merge.forest, w.forest))
          }
        }
        merged.push(merge)
      }
    }

    // merge the inner trees
    for (let i = 0; i < merged.length; i++) {
      merged[i].forest = mergeEqualValues(EA)(merged[i].forest)
    }

    return merged
  }
}

export const EqStrNum: P.Eq<string | number> = P.makeEq((x, y) => {
  if (typeof x === 'string' && typeof y === 'string') {
    return x === y
  }
  if (typeof x === 'number' && typeof y === 'number') {
    return x === y
  }
  return false
})

export type Flat<A> = { [K in keyof A]: A[K] } & {}

export function cacheThunk<A>(f: () => A): () => A {
  let x: A
  return () => {
    if (!x) {
      x = f()
    }
    return x
  }
}
