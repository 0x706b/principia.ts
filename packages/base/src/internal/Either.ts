import { $equals, equals } from '../Structural/Equatable'
import { $hash, combineHash, hash, hashString } from '../Structural/Hashable'
import { isObject } from '../util/predicates'

export const EitherTypeId = Symbol('@principia/base/Either')
export type EitherTypeId = typeof EitherTypeId

const _leftHash  = hashString('@principia/base/Either/Left')
const _rightHash = hashString('@principia/base/Either/Right')

export class Left<E> {
  readonly [EitherTypeId]: EitherTypeId = EitherTypeId
  readonly _tag                         = 'Left'
  constructor(readonly left: E) {}
  [$equals](that: unknown): boolean {
    return isEither(that) && isLeft(that) && equals(this.left, that.left)
  }
  get [$hash](): number {
    return combineHash(_leftHash, hash(this.left))
  }
}

export class Right<A> {
  readonly [EitherTypeId]: EitherTypeId = EitherTypeId
  readonly _tag                         = 'Right'
  constructor(readonly right: A) {}
  [$equals](that: unknown): boolean {
    return isEither(that) && isRight(that) && equals(this.right, that.right)
  }
  get [$hash]() {
    return combineHash(_rightHash, hash(this.right))
  }
}

export type Either<E, A> = Left<E> | Right<A>

/**
 * @internal
 */
export function isEither(u: unknown): u is Either<unknown, unknown> {
  return isObject(u) && EitherTypeId in u
}

/**
 * @internal
 */
export function isLeft<E, A>(u: Either<E, A>): u is Left<E> {
  return u._tag === 'Left'
}

/**
 * @internal
 */
export function isRight<E, A>(u: Either<E, A>): u is Right<A> {
  return u._tag === 'Right'
}

/**
 * @internal
 */
export function left<E = never, A = never>(e: E): Either<E, A> {
  return new Left(e)
}

/**
 * @internal
 */
export function right<E = never, A = never>(a: A): Either<E, A> {
  return new Right(a)
}

/**
 * @internal
 */
export function match_<E, A, B, C>(fa: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C {
  switch (fa._tag) {
    case 'Left':
      return onLeft(fa.left)
    case 'Right':
      return onRight(fa.right)
  }
}

/**
 * @internal
 */
export function match<E, A, B, C>(onLeft: (e: E) => B, onRight: (a: A) => C): (fa: Either<E, A>) => B | C {
  return (fa) => match_(fa, onLeft, onRight)
}
