import type { AnyDefaultError } from '../ParseError'
import type { These } from '@principia/base/These'

import { identity } from '@principia/base/function'
import * as Th from '@principia/base/These'

import * as PE from '../ParseError'

export class SchemaCondemnError extends Error {
  readonly _tag = 'SchemaCondemnError'
  constructor(readonly error: AnyDefaultError) {
    super(PE.drawError(error))
  }
}

export function unsafeCondemn<I, A>(f: (_: I) => These<AnyDefaultError, A>): (_: I) => A {
  return (i) => {
    const res = f(i)
    return Th.match_(
      res,
      (e) => {
        throw new SchemaCondemnError(e)
      },
      identity,
      (e) => {
        throw new SchemaCondemnError(e)
      }
    )
  }
}
