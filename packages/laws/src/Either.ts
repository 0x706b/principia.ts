import * as E from '@principia/base/Either'
import * as fc from 'fast-check'

export function getRight<E, A>(arb: fc.Arbitrary<A>): fc.Arbitrary<E.Either<E, A>> {
  return arb.map(E.right)
}

export function getLeft<E, A>(arb: fc.Arbitrary<E>): fc.Arbitrary<E.Either<E, A>> {
  return arb.map(E.left)
}

export function getEither<E, A>(leftArb: fc.Arbitrary<E>, rightArb: fc.Arbitrary<A>) {
  return fc.oneof(getLeft<E, A>(leftArb), getRight<E, A>(rightArb))
}
