import type { Predicate } from '../Predicate'
import type { Refinement } from '../Refinement'

import { identity } from '../function'
import { $equals, equals } from '../Structural/Equatable'
import { $hash, combineHash, hash, hashString } from '../Structural/Hashable'
import { isObject } from '../util/predicates'

export const OptionTypeId = Symbol('@principia/base/Option')
export type OptionTypeId = typeof OptionTypeId

const _noneHash = hashString('@principia/base/Option/None')

const _someHash = hashString('@principia/base/Option/Some')

export class None {
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId
  readonly _tag                         = 'None'
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}
  [$equals](that: unknown): boolean {
    return isOption(that) && isNone(that)
  }
  get [$hash]() {
    return _noneHash
  }
}

export class Some<A> {
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId
  readonly _tag                         = 'Some'
  constructor(readonly value: A) {}
  [$equals](that: unknown): boolean {
    return isOption(that) && isSome(that) && equals(this.value, that.value)
  }
  get [$hash]() {
    return combineHash(_someHash, hash(this.value))
  }
}

export type Option<A> = None | Some<A>

export function isOption(u: unknown): u is Option<unknown> {
  return isObject(u) && OptionTypeId in u
}

export function isNone<A>(u: Option<A>): u is None {
  return u._tag === 'None'
}

export function isSome<A>(u: Option<A>): u is Some<A> {
  return u._tag === 'Some'
}

/**
 * @internal
 */
export function some<A>(a: A): Option<A> {
  return new Some(a)
}

/**
 * @internal
 */
export function none<A = never>(): Option<A> {
  return new None()
}

/**
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
  return predicate(a) ? none() : some(a)
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
  return (a) => fromPredicate_(a, predicate)
}

export function fromNullable<A>(a: A | null | undefined): Option<NonNullable<A>> {
  return a == null ? none() : some(a as NonNullable<A>)
}

export function match_<A, B, C>(fa: Option<A>, onNone: () => B, onSome: (a: A) => C): B | C {
  return fa._tag === 'None' ? onNone() : onSome(fa.value)
}

export function match<A, B, C>(onNone: () => B, onSome: (a: A) => C): (fa: Option<A>) => B | C {
  return (fa) => match_(fa, onNone, onSome)
}

/**
 * @internal
 */
export function getOrElse_<A, B>(fa: Option<A>, onNone: () => B): A | B {
  return match_(fa, onNone, identity)
}

/**
 * @internal
 */
export function getOrElse<B>(onNone: () => B): <A>(fa: Option<A>) => A | B {
  return (fa) => getOrElse_(fa, onNone)
}
