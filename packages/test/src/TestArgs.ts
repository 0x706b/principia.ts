import type { Maybe } from '@principia/base/Maybe'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as M from '@principia/base/Maybe'
import { tuple } from '@principia/base/tuple'

export class TestArgs {
  constructor(
    readonly testSearchTerms: ReadonlyArray<string>,
    readonly tagSearchTerms: ReadonlyArray<string>,
    readonly testTaskPolicy: Maybe<string>
  ) {}
}

export const empty: TestArgs = new TestArgs(A.empty(), A.empty(), M.nothing())

export function parse(args: ReadonlyArray<string>): TestArgs {
  const [terms, tags, policies] = pipe(
    args,
    A.chunksOf(2),
    A.filterMap((as) => {
      if (as[0] === '-t') {
        return M.just(tuple('testSearchTerm', as[1]))
      }
      if (as[0] === '-tags') {
        return M.just(tuple('tagSearchTerm', as[1]))
      }
      if (as[0] === '-policy') {
        return M.just(tuple('policy', as[1]))
      }
      return M.nothing()
    }),
    A.foldl(
      tuple(<ReadonlyArray<string>>[], <ReadonlyArray<string>>[], <ReadonlyArray<string>>[]),
      ([terms, tags, policy], [k, v]) => {
        switch (k) {
          case 'testSearchTerm': {
            return tuple(A.append(v)(terms), tags, policy)
          }
          case 'tagSearchTerm': {
            return tuple(terms, A.append(v)(tags), policy)
          }
          case 'policy': {
            return tuple(terms, tags, A.append(v)(policy))
          }
          default: {
            return tuple(terms, tags, policy)
          }
        }
      }
    )
  )
  return new TestArgs(terms, tags, A.head(policies))
}
