import type { Predicate } from '../Predicate'
import type { Refinement } from '../Refinement'
import type { Equatable } from '../Structural/Equatable'
import type { Hashable } from '../Structural/Hashable'

import { identity } from '../function'
import { $equals, equals } from '../Structural/Equatable'
import { $hash, combineHash, hash, hashString } from '../Structural/Hashable'
import { isObject } from '../util/predicates'

export const MaybeTypeId = Symbol.for('@principia/base/Maybe')
export type MaybeTypeId = typeof MaybeTypeId

const _nothingHash = hashString('@principia/base/Maybe/Nothing')

const _justHash = hashString('@principia/base/Maybe/Just')

export interface Nothing {
  readonly _tag: 'Nothing'
}

const NothingConstructor = class Nothing implements Nothing {
  readonly [MaybeTypeId]: MaybeTypeId = MaybeTypeId
  readonly _tag = 'Nothing'
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}
  [$equals](that: unknown): boolean {
    return isMaybe(that) && isNothing(that)
  }
  get [$hash]() {
    return _nothingHash
  }
}

const _Nothing = new NothingConstructor()

export function Nothing(): Nothing {
  return _Nothing
}

export interface Just<A> {
  readonly _tag: 'Just'
  readonly value: A
}

const JustConstructor = class Just<A> implements Just<A> {
  readonly [MaybeTypeId]: MaybeTypeId = MaybeTypeId
  readonly _tag = 'Just'
  constructor(readonly value: A) {}
  [$equals](that: unknown): boolean {
    return isMaybe(that) && isJust(that) && equals(this.value, that.value)
  }
  get [$hash]() {
    return combineHash(_justHash, hash(this.value))
  }
}

export function Just<A>(value: A): Just<A> {
  return new JustConstructor(value)
}

export type Maybe<A> = Nothing | Just<A>

export function isMaybe(u: unknown): u is Maybe<unknown> {
  return (
    isObject(u) &&
    (MaybeTypeId in u ||
      ('_tag' in u && typeof u['_tag'] === 'string' && (u['_tag'] === 'Nothing' || u['_tag'] === 'Just')))
  )
}

export function isNothing<A>(u: Maybe<A>): u is Nothing {
  return u._tag === 'Nothing'
}

export function isJust<A>(u: Maybe<A>): u is Just<A> {
  return u._tag === 'Just'
}

/**
 * @internal
 */
export function just<A>(a: A): Maybe<A> {
  return Just(a)
}

/**
 * @internal
 */
export function nothing<A = never>(): Maybe<A> {
  return _Nothing
}

/**
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Maybe<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Maybe<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Maybe<A> {
  return predicate(a) ? just(a) : nothing()
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 * @internal
 */
export function fromPredicate<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Maybe<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Maybe<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Maybe<A> {
  return (a) => fromPredicate_(a, predicate)
}

export function fromNullable<A>(a: A | null | undefined): Maybe<NonNullable<A>> {
  return a == null ? nothing() : just(a as NonNullable<A>)
}

export function match_<A, B, C>(fa: Maybe<A>, onNothing: () => B, onJust: (a: A) => C): B | C {
  return fa._tag === 'Nothing' ? onNothing() : onJust(fa.value)
}

export function match<A, B, C>(onNothing: () => B, onJust: (a: A) => C): (fa: Maybe<A>) => B | C {
  return (fa) => match_(fa, onNothing, onJust)
}

/**
 * @internal
 */
export function getOrElse_<A, B>(fa: Maybe<A>, onNothing: () => B): A | B {
  return match_(fa, onNothing, identity)
}

/**
 * @internal
 */
export function getOrElse<B>(onNothing: () => B): <A>(fa: Maybe<A>) => A | B {
  return (fa) => getOrElse_(fa, onNothing)
}
