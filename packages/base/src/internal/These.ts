import { $equals, equals } from '../Structural/Equatable'
import { $hash, combineHash, hash, hashString } from '../Structural/Hashable'
import { isObject } from '../util/predicates'

export const TheseTypeId = Symbol('@principia/base/These')
export type TheseTypeId = typeof TheseTypeId

const _bothHash  = hashString('@principia/base/These/Both')
const _leftHash  = hashString('@principia/base/These/Left')
const _rightHash = hashString('@principia/base/These/Right')

export class Both<E, A> {
  readonly [TheseTypeId]: TheseTypeId = TheseTypeId
  readonly _tag                       = 'Both'
  constructor(readonly left: E, readonly right: A) {}
  [$equals](that: unknown): boolean {
    return isBoth(that) && equals(this.left, that.left) && equals(this.right, that.right)
  }
  get [$hash](): number {
    return combineHash(_bothHash, combineHash(hash(this.left), hash(this.right)))
  }
}

export class Left<E> {
  readonly [TheseTypeId]: TheseTypeId = TheseTypeId
  readonly _tag                       = 'Left'
  constructor(readonly left: E) {}
  [$equals](that: unknown): boolean {
    return isLeft(that) && equals(this.left, that.left)
  }
  get [$hash](): number {
    return combineHash(_leftHash, hash(this.left))
  }
}

export class Right<A> {
  readonly [TheseTypeId]: TheseTypeId = TheseTypeId
  readonly _tag                       = 'Right'
  constructor(readonly right: A) {}
  [$equals](that: unknown): boolean {
    return isRight(that) && equals(this.right, that.right)
  }
  get [$hash](): number {
    return combineHash(_rightHash, hash(this.right))
  }
}

export function isThese(u: unknown): u is These<unknown, unknown> {
  return isObject(u) && TheseTypeId in u
}

function isBoth(u: unknown): u is Both<unknown, unknown> {
  return isThese(u) && u._tag === 'Both'
}

function isLeft(u: unknown): u is Left<unknown> {
  return isThese(u) && u._tag === 'Left'
}

function isRight(u: unknown): u is Right<unknown> {
  return isThese(u) && u._tag === 'Right'
}

export type These<E, A> = Left<E> | Right<A> | Both<E, A>

export function left<E, A = never>(e: E): These<E, A> {
  return new Left(e)
}

export function right<E = never, A = never>(a: A): These<E, A> {
  return new Right(a)
}

export function both<E, A>(e: E, a: A): These<E, A> {
  return new Both(e, a)
}

export function match_<E, A, B, C, D>(
  fa: These<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): B | C | D {
  switch (fa._tag) {
    case 'Left':
      return onLeft(fa.left)
    case 'Right':
      return onRight(fa.right)
    case 'Both':
      return onBoth(fa.left, fa.right)
  }
}

export function match<E, A, B, C, D>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): (fa: These<E, A>) => B | C | D {
  return (fa) => match_(fa, onLeft, onRight, onBoth)
}
