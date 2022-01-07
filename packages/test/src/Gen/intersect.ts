import type { Gen } from './core'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { _A, _R, UnionToIntersection } from '@principia/base/prelude'

import * as A from '@principia/base/collection/immutable/Array'
import * as HR from '@principia/base/HeterogeneousRecord'

import * as G from './core'

export function intersectAll<M extends NonEmptyArray<Gen<any, Record<string, any>>>>(
  members: M
): Gen<_R<M[number]>, UnionToIntersection<_A<M[number]>>> {
  return A.foldl_(
    members,
    G.constant({}) as Gen<_R<M[number]>, UnionToIntersection<_A<M[number]>>>,
    (genB, genA) =>
      G.crossWith_(genB, genA, (b, a) => HR.intersect(b as Record<string, any>, a)) as Gen<
        _R<M[number]>,
        UnionToIntersection<_A<M[number]>>
      >
  )
}

export function intersect<M extends NonEmptyArray<Gen<any, Record<string, any>>>>(
  ...members: M
): Gen<_R<M[number]>, UnionToIntersection<_A<M[number]>>> {
  return intersectAll(members)
}
