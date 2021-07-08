import * as E from '../../Eq'
import { $equals, isEquatable } from './core'
import { createCircularEqualCreator, createComparator, sameValueZeroEqual } from './internal'

export const deepEquals = createComparator(
  createCircularEqualCreator((eq) => (a, b, meta) => {
    if (isEquatable(a)) {
      return a[$equals](b)
    } else {
      return eq(a, b, meta)
    }
  })
)

export function equals(a: unknown, b: unknown): boolean {
  if (isEquatable(a)) {
    return a[$equals](b)
  } else if (isEquatable(b)) {
    return b[$equals](a)
  }
  return sameValueZeroEqual(a, b)
}

export const DefaultEq: E.Eq<unknown> = E.makeEq(equals)
