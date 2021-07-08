import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

import * as S from './core'

export function intersectLazy<S extends S.IntersectableSchema>(
  ls: () => S,
  id: string
): <M extends NonEmptyArray<S.IntersectableSchema>>(
  ...members: S.EnsureTupleURIS<M, S.URISIn<S>>
) => S.IntersectS<readonly [S.LazyS<S>, ...M]> {
  // @ts-expect-error
  return (...members) => S.intersect(S.lazy(ls, id), ...members)
}
