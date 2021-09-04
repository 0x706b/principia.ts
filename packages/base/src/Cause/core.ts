import type { HashSet } from '../HashSet'
import type { Trace } from '../IO/Fiber/trace'
import type { Predicate } from '../Predicate'
import type * as P from '../prelude'
import type { Stack } from '../util/support/Stack'

import * as A from '../Array/core'
import * as B from '../boolean'
import * as E from '../Either'
import { Eq, makeEq } from '../Eq'
import * as Ev from '../Eval'
import { InterruptedException } from '../Exception'
import { flow, hole, identity, pipe } from '../function'
import * as HS from '../HashSet'
import * as L from '../List/core'
import * as O from '../Option'
import { isObject, tailRec_ } from '../prelude'
import * as St from '../Structural'
import { tuple } from '../tuple'
import { makeStack } from '../util/support/Stack'

export const CauseTypeId = Symbol()
export type CauseTypeId = typeof CauseTypeId

export type GenericCause<Id, E> = Empty | Halt | Interrupt<Id> | Fail<E> | Then<Id, E> | Both<Id, E> | Traced<Id, E>

export function isCause(u: unknown): u is GenericCause<unknown, unknown> {
  return isObject(u) && CauseTypeId in u
}

export const CauseTag = {
  Empty: 'Empty',
  Fail: 'Fail',
  Halt: 'Halt',
  Interrupt: 'Interrupt',
  Then: 'Then',
  Both: 'Both',
  Traced: 'Traced'
} as const

const _emptyHash = St.opt(St.randomInt())

export class Empty {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Empty

  get [St.$hash](): number {
    return _emptyHash
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    switch (that._tag) {
      case CauseTag.Empty:
        return Ev.now(true)
      case CauseTag.Then:
      case CauseTag.Both:
        return Ev.crossWith_(this.equalsEval(that.left), this.equalsEval(that.right), B.and_)
      case CauseTag.Traced:
        return Ev.defer(() => this.equalsEval(that.cause))
      default:
        return Ev.now(false)
    }
  }
}

export class Fail<E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Fail

  constructor(readonly value: E) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.value))
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      switch (that._tag) {
        case CauseTag.Fail:
          return St.equals(self.value, that.value)
        case CauseTag.Both:
        case CauseTag.Then:
          return yield* _(structuralSymmetric(structuralEqualEmpty)(self, that))
        case CauseTag.Traced:
          return yield* _(self.equalsEval(that.cause))
        default:
          return false
      }
    })
  }
}

export class Halt {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Halt

  constructor(readonly value: unknown) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.value))
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      switch (that._tag) {
        case CauseTag.Halt:
          return St.equals(self.value, that.value)
        case CauseTag.Then:
        case CauseTag.Both:
          return yield* _(structuralSymmetric(structuralEqualEmpty)(self, that))
        case CauseTag.Traced:
          return yield* _(self.equalsEval(that.cause))
        default:
          return false
      }
    })
  }
}

export class Interrupt<Id> {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Interrupt

  constructor(readonly id: Id) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.id))
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      switch (that._tag) {
        case CauseTag.Interrupt:
          return St.equals(self.id, that.id)
        case CauseTag.Then:
        case CauseTag.Both:
          return yield* _(structuralSymmetric(structuralEqualEmpty)(self, that))
        case CauseTag.Traced:
          return yield* _(self.equalsEval(that.cause))
        default:
          return false
      }
    })
  }
}

export class Then<Id, E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Then

  constructor(readonly left: GenericCause<Id, E>, readonly right: GenericCause<Id, E>) {}

  get [St.$hash](): number {
    return hashCode(this)
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      if (that._tag === CauseTag.Traced) {
        return yield* _(self.equalsEval(that.cause))
      }
      return (
        (yield* _(structuralEqualThen(self, that))) ||
        (yield* _(structuralSymmetric(structuralThenAssociate)(self, that))) ||
        (yield* _(structuralSymmetric(strcturalThenDistribute)(self, that))) ||
        (yield* _(structuralSymmetric(structuralEqualEmpty)(self, that)))
      )
    })
  }
}

export class Both<Id, E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Both

  constructor(readonly left: GenericCause<Id, E>, readonly right: GenericCause<Id, E>) {}

  get [St.$hash](): number {
    return hashCode(this)
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      if (that._tag === CauseTag.Traced) {
        return yield* _(self.equalsEval(that.cause))
      }
      return (
        (yield* _(structuralEqualBoth(self, that))) ||
        (yield* _(structuralSymmetric(structuralBothAssociate)(self, that))) ||
        (yield* _(structuralSymmetric(structuralBothDistribute)(self, that))) ||
        (yield* _(structuralSymmetric(structuralEqualEmpty)(self, that)))
      )
    })
  }
}

export class Traced<Id, E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag = CauseTag.Traced

  constructor(readonly cause: GenericCause<Id, E>, readonly trace: Trace) {}

  get [St.$hash](): number {
    return this.cause[St.$hash]
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: GenericCause<unknown, unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      return that._tag === CauseTag.Traced
        ? yield* _(self.cause.equalsEval(that.cause))
        : yield* _(self.cause.equalsEval(that))
    })
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * The empty `Cause`
 *
 * @category constructors
 * @since 1.0.0
 */
export const empty: GenericCause<never, never> = new Empty()

/**
 * Constructs a `Cause` from a single value, representing a typed failure
 *
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(value: E): GenericCause<never, E> {
  return new Fail(value)
}

/**
 * Constructs a `Cause` from a `Cause` and a stack trace.
 *
 * @note If the stack trace is empty, the original `Cause` is returned.
 *
 * @category constructors
 * @since 1.0.0
 */
export function traced<Id, E>(cause: GenericCause<Id, E>, trace: Trace): GenericCause<Id, E> {
  if (L.isEmpty(trace.executionTrace) && L.isEmpty(trace.stackTrace) && O.isNone(trace.parentTrace)) {
    return cause
  }
  return new Traced(cause, trace)
}

/**
 * Constructs a `Cause` from a single `unknown`, representing an untyped failure
 *
 * @category constructors
 * @since 1.0.0
 */
export function halt(value: unknown): GenericCause<never, never> {
  return new Halt(value)
}

/**
 * Constructs a `Cause` from an `Id`, representing an interruption of asynchronous computation
 *
 * @category constructors
 * @since 1.0.0
 */
export function interrupt<Id>(id: Id): GenericCause<Id, never> {
  return new Interrupt(id)
}

/**
 * Constructs a `Cause` from two `Cause`s, representing sequential failures.
 *
 * @note If one of the `Cause`s is `Empty`, the non-empty `Cause` is returned
 *
 * @category constructors
 * @since 1.0.0
 */
export function then<Id, E, Id1, E1>(
  left: GenericCause<Id, E>,
  right: GenericCause<Id1, E1>
): GenericCause<Id | Id1, E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<Id | Id1, E | E1>(left, right)
}

/**
 * Constructs a `Cause` from two `Cause`s, representing parallel failures.
 *
 * @note If one of the `Cause`s is `Empty`, the non-empty `Cause` is returned
 *
 * @category constructors
 * @since 1.0.0
 */
export function both<Id, E, Id1, E1>(
  left: GenericCause<Id, E>,
  right: GenericCause<Id1, E1>
): GenericCause<Id | Id1, E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Both<Id | Id1, E | E1>(left, right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category guards
 * @since 1.0.0
 */
export function containsEval<Id1, E, E1 extends E = E>(
  that: GenericCause<Id1, E1>
): <Id>(cause: GenericCause<Id, E>) => Ev.Eval<boolean> {
  return (cause) =>
    Ev.gen(function* (_) {
      if (yield* _(cause.equalsEval(that))) {
        return true
      }
      return yield* _(
        pipe(
          cause,
          foldl(Ev.now(false), (_, c) => O.some(Ev.chain_(_, (b) => (b ? Ev.now(b) : c.equalsEval(that)))))
        )
      )
    })
}

/**
 * Determines whether a `Cause` contains or is equal to the specified cause.
 *
 * @category guards
 * @since 1.0.0
 */
export function contains<Id1, E, E1 extends E = E>(
  that: GenericCause<Id1, E1>
): <Id>(cause: GenericCause<Id, E>) => boolean {
  return flow(containsEval(that), Ev.evaluate)
}

/**
 * Determines whether a `Cause` contains a defect
 *
 * @category guards
 * @since 1.0.0
 */
export function halted<Id, E>(cause: GenericCause<Id, E>): cause is Halt {
  return pipe(
    cause,
    haltOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Determines whether a `Cause` contains a failure
 *
 * @category guards
 * @since 1.0.0
 */
export const failed: <Id, E>(cause: GenericCause<Id, E>) => boolean = flow(
  failureOption,
  O.map(() => true),
  O.getOrElse(() => false)
)

/**
 * A type-guard matching `Fail`
 *
 * @category guards
 * @since 1.0.0
 */
export function isFail<Id, E>(cause: GenericCause<Id, E>): cause is Fail<E> {
  return cause._tag === CauseTag.Fail
}

/**
 * A type-guard matching `Then`
 *
 * @category guards
 * @since 1.0.0
 */
export function isThen<Id, E>(cause: GenericCause<Id, E>): cause is Then<Id, E> {
  return cause._tag === CauseTag.Then
}

/**
 * A type-guard matching `Both`
 *
 * @category guards
 * @since 1.0.0
 */
export function isBoth<Id, E>(cause: GenericCause<Id, E>): cause is Both<Id, E> {
  return cause._tag === CauseTag.Both
}

/**
 * A type-guard matching `Traced`
 *
 * @category guards
 * @since 1.0.0
 */
export function isTraced<Id, E>(cause: GenericCause<Id, E>): cause is Traced<Id, E> {
  return cause._tag === CauseTag.Traced
}

/**
 * Determines whether the `Cause` is `Empty` by recursively traversing the `Cause`
 *
 * @category guards
 * @since 1.0.0
 */
export function isEmpty<Id, E>(cause: GenericCause<Id, E>): boolean {
  if (cause._tag === CauseTag.Empty || (cause._tag === CauseTag.Traced && cause.cause._tag === CauseTag.Empty)) {
    return true
  }
  let causes: Stack<GenericCause<Id, E>> | undefined = undefined
  let current: GenericCause<Id, E> | undefined       = cause
  while (current) {
    switch (current._tag) {
      case CauseTag.Halt: {
        return false
      }
      case CauseTag.Fail: {
        return false
      }
      case CauseTag.Interrupt: {
        return false
      }
      case CauseTag.Then: {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      case CauseTag.Both: {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      case CauseTag.Traced: {
        current = current.cause
        break
      }
      default: {
        current = undefined
      }
    }
    if (!current && causes) {
      current = causes.value
      causes  = causes.previous
    }
  }

  return true
}

/**
 * Determines whether the `Cause` contains an interruption
 *
 * @category guards
 * @since 1.0.0
 */
export function interrupted<Id, E>(cause: GenericCause<Id, E>): boolean {
  return pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns the `unknown` associated with the first `Halt` in this `Cause` if one exists.
 */
export function haltOption<Id, E>(cause: GenericCause<Id, E>): O.Option<unknown> {
  return find_(cause, (c) => (c._tag === CauseTag.Halt ? O.some(c.value) : O.none()))
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one exists.
 */
export function failureOption<Id, E>(cause: GenericCause<Id, E>): O.Option<E> {
  return find_(cause, (c) => (c._tag === CauseTag.Fail ? O.some(c.value) : O.none()))
}

/**
 * @internal
 */
export function findEval<Id, E, A>(
  cause: GenericCause<Id, E>,
  f: (cause: GenericCause<Id, E>) => O.Option<A>
): Ev.Eval<O.Option<A>> {
  const apply = f(cause)
  if (apply._tag === 'Some') {
    return Ev.now(apply)
  }
  switch (cause._tag) {
    case CauseTag.Then: {
      return pipe(
        Ev.defer(() => findEval(cause.left, f)),
        Ev.chain((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return findEval(cause.right, f)
          }
        })
      )
    }
    case CauseTag.Both: {
      return pipe(
        Ev.defer(() => findEval(cause.left, f)),
        Ev.chain((isLeft) => {
          if (isLeft._tag === 'Some') {
            return Ev.now(isLeft)
          } else {
            return findEval(cause.right, f)
          }
        })
      )
    }
    case CauseTag.Traced: {
      return Ev.defer(() => findEval(cause.cause, f))
    }
    default: {
      return Ev.now(apply)
    }
  }
}

/**
 * Finds the first result matching `f`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function find_<Id, E, A>(
  cause: GenericCause<Id, E>,
  f: (cause: GenericCause<Id, E>) => O.Option<A>
): O.Option<A> {
  return findEval(cause, f).value
}

/**
 * Finds the first result matching `f`
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst find_
 */
export function find<Id, A, E>(
  f: (cause: GenericCause<Id, E>) => O.Option<A>
): (cause: GenericCause<Id, E>) => O.Option<A> {
  return (cause) => find_(cause, f)
}

/**
 * Accumulates a state over a `Cause`
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl_<Id, E, A>(
  cause: GenericCause<Id, E>,
  a: A,
  f: (a: A, cause: GenericCause<Id, E>) => O.Option<A>
): A {
  let causes: Stack<GenericCause<Id, E>> | undefined = undefined
  let current: GenericCause<Id, E> | undefined       = cause
  let acc = a

  while (current) {
    const x = f(acc, current)
    acc     = x._tag === 'Some' ? x.value : acc

    switch (current._tag) {
      case CauseTag.Then: {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      case CauseTag.Both: {
        causes  = makeStack(current.right, causes)
        current = current.left
        break
      }
      default: {
        current = undefined
        break
      }
    }

    if (!current && causes) {
      current = causes.value
      causes  = causes.previous
    }
  }
  return acc
}

/**
 * Accumulates a state over a `Cause`
 *
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst foldl_
 */
export function foldl<Id, E, A>(
  a: A,
  f: (a: A, cause: GenericCause<Id, E>) => O.Option<A>
): (cause: GenericCause<Id, E>) => A {
  return (cause) => foldl_(cause, a, f)
}

/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause` if one exists.
 */
export function interruptOption<Id, E>(cause: GenericCause<Id, E>): O.Option<Id> {
  return find_(cause, (c) => (c._tag === CauseTag.Interrupt ? O.some(c.id) : O.none()))
}

/**
 * @internal
 */
function foldEval<Id, E, A>(
  cause: GenericCause<Id, E>,
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onHalt: (reason: unknown) => A,
  onInterrupt: (id: Id) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): Ev.Eval<A> {
  switch (cause._tag) {
    case CauseTag.Empty:
      return Ev.now(onEmpty())
    case CauseTag.Fail:
      return Ev.now(onFail(cause.value))
    case CauseTag.Halt:
      return Ev.now(onHalt(cause.value))
    case CauseTag.Interrupt:
      return Ev.now(onInterrupt(cause.id))
    case CauseTag.Both:
      return Ev.crossWith_(
        Ev.defer(() => foldEval(cause.left, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => foldEval(cause.right, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced)),
        onBoth
      )
    case CauseTag.Then:
      return Ev.crossWith_(
        Ev.defer(() => foldEval(cause.left, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => foldEval(cause.right, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced)),
        onThen
      )
    case CauseTag.Traced:
      return Ev.map_(
        Ev.defer(() => foldEval(cause.cause, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced)),
        (a) => onTraced(a, cause.trace)
      )
  }
}

/**
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold_<Id, E, A>(
  cause: GenericCause<Id, E>,
  onEmpty: () => A,
  onFail: (e: E) => A,
  onHalt: (u: unknown) => A,
  onInterrupt: (id: Id) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): A {
  return foldEval(cause, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced).value
}

/**
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 *
 * @dataFirst fold_
 */
export function fold<Id, E, A>(
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onHalt: (reason: unknown) => A,
  onInterrupt: (id: Id) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): (cause: GenericCause<Id, E>) => A {
  return (cause) => foldEval(cause, onEmpty, onFail, onHalt, onInterrupt, onThen, onBoth, onTraced).value
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Alt
 * @since 1.0.0
 */
export function alt_<Id, E>(fa: GenericCause<Id, E>, that: () => GenericCause<Id, E>): GenericCause<Id, E> {
  return chain_(fa, () => that())
}

/**
 * @category Alt
 * @since 1.0.0
 *
 * @dataFirst alt_
 */
export function alt<Id, E>(that: () => GenericCause<Id, E>): (fa: GenericCause<Id, E>) => GenericCause<Id, E> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure expression info a `Cause`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<Id, E>(e: E): GenericCause<Id, E> {
  return fail(e)
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Combines the inner values of two `Cause`s with function `f`
 *
 * @category SemimonoidalFunctor
 * @since 1.0.0
 */
export function crossWith_<Id, A, Id1, B, C>(
  fa: GenericCause<Id, A>,
  fb: GenericCause<Id1, B>,
  f: (a: A, b: B) => C
): GenericCause<Id | Id1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * Combines the inner values of two `Cause`s with function `f`
 *
 * @category SemimonoidalFunctor
 * @since 1.0.0
 *
 * @dataFirst crossWith_
 */
export function crossWith<Id1, A, B, C>(
  fb: GenericCause<Id1, B>,
  f: (a: A, b: B) => C
): <Id>(fa: GenericCause<Id, A>) => GenericCause<Id | Id1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Combines the inner values of two `Cause`s into a tuple
 *
 * @category SemimonoidalFunctor
 * @since 1.0.0
 */
export function cross_<Id, A, Id1, B>(
  fa: GenericCause<Id, A>,
  fb: GenericCause<Id1, B>
): GenericCause<Id | Id1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * Combines the inner values of two `Cause`s into a tuple
 *
 * @category SemimonoidalFunctor
 * @since 1.0.0
 * 
 * @dataFirst cross_
 */
export function cross<Id1, B>(
  fb: GenericCause<Id1, B>
): <Id, A>(fa: GenericCause<Id, A>) => GenericCause<Id | Id1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<Id, E, Id1, D>(
  fab: GenericCause<Id, (a: E) => D>,
  fa: GenericCause<Id1, E>
): GenericCause<Id | Id1, D> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 *
 * @dataFirst ap_
 */
export function ap<Id1, E>(
  fa: GenericCause<Id1, E>
): <Id, D>(fab: GenericCause<Id, (a: E) => D>) => GenericCause<Id | Id1, D> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function equals<Id, E>(x: GenericCause<Id, E>, y: GenericCause<Id, E>): boolean {
  return x.equalsEval(y).value
}

export const EqStructural: Eq<GenericCause<any, any>> = makeEq(equals)

export function getEq<Id, E>(EId: Eq<Id>, E: Eq<E>): Eq<GenericCause<Id, E>> {
  const equalsE = equals_(EId, E)
  return Eq((x, y) => equalsE(x, y).value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<Id, E, D>(fa: GenericCause<Id, E>, f: (e: E) => D) {
  return chain_(fa, (e) => fail(f(e)))
}

/**
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 *
 * @dataFirst map_
 */
export function map<Id, E, D>(f: (e: E) => D): (fa: GenericCause<Id, E>) => GenericCause<Id, D> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @internal
 */
function chainEval<Id, E, Id1, D>(
  ma: GenericCause<Id, E>,
  f: (e: E) => GenericCause<Id1, D>
): Ev.Eval<GenericCause<Id | Id1, D>> {
  switch (ma._tag) {
    case CauseTag.Empty:
      return Ev.now(empty)
    case CauseTag.Fail:
      return Ev.now(f(ma.value))
    case CauseTag.Halt:
      return Ev.now(ma)
    case CauseTag.Interrupt:
      return Ev.now(ma)
    case CauseTag.Then:
      return Ev.crossWith_(
        Ev.defer(() => chainEval(ma.left, f)),
        Ev.defer(() => chainEval(ma.right, f)),
        then
      )
    case CauseTag.Both:
      return Ev.crossWith_(
        Ev.defer(() => chainEval(ma.left, f)),
        Ev.defer(() => chainEval(ma.right, f)),
        both
      )
    case CauseTag.Traced:
      return Ev.map_(chainEval(ma.cause, f), (cause) => traced(cause, ma.trace))
  }
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<Id, E, Id1, D>(
  ma: GenericCause<Id, E>,
  f: (e: E) => GenericCause<Id1, D>
): GenericCause<Id | Id1, D> {
  return chainEval(ma, f).value
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 *
 * @dataFirst chain_
 */
export function chain<E, Id1, D>(
  f: (e: E) => GenericCause<Id1, D>
): <Id>(ma: GenericCause<Id, E>) => GenericCause<Id | Id1, D> {
  return (ma) => chain_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<Id, Id1, E>(mma: GenericCause<Id, GenericCause<Id1, E>>): GenericCause<Id | Id1, E> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Recursively applies `f` while the inner `Either` is `Left<A>`
 *
 * @since 1.0.0
 * @category TailRec
 */
export function chainRec_<Id, A, B>(a: A, f: (a: A) => GenericCause<Id, E.Either<A, B>>): GenericCause<Id, B> {
  return tailRec_(a, flow(f, map(E.swap), flipCauseEither, E.swap))
}

/**
 * Recursively applies `f` while the inner `Either` is `Left<A>`
 *
 * @category TailRec
 * @since 1.0.0
 * 
 * @dataFirst chainRec_
 */
export function chainRec<Id, A, B>(f: (a: A) => GenericCause<Id, E.Either<A, B>>): (a: A) => GenericCause<Id, B> {
  return (a) => chainRec_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Constructs the `unit` `Cause`
 *
 * @category MonoidalFunctor
 * @since 1.0.0
 */
export function unit(): GenericCause<never, void> {
  return fail(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Substitutes a value under a type constructor
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as<Id, E1>(e: E1): <E>(fa: GenericCause<Id, E>) => GenericCause<Id, E1> {
  return map(() => e)
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<Id, E>(cause: GenericCause<Id, E>): ReadonlyArray<unknown> {
  return foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) =>
    c._tag === CauseTag.Halt ? O.some([...a, c.value]) : O.none()
  )
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<Id, E>(cause: GenericCause<Id, E>): ReadonlyArray<E> {
  return foldl_(cause, [] as readonly E[], (a, c) => (c._tag === CauseTag.Fail ? O.some([...a, c.value]) : O.none()))
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<Id, E>(cause: GenericCause<Id, E>): ReadonlySet<Id> {
  return foldl_(cause, new Set(), (s, c) => (c._tag === CauseTag.Interrupt ? O.some(s.add(c.id)) : O.none()))
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Halt` or
 * `Fail` causes.
 */
export function interruptedOnly<Id, E>(cause: GenericCause<Id, E>): boolean {
  return pipe(
    cause,
    find((c) => (halted(c) || failed(c) ? O.some(false) : O.none())),
    O.getOrElse(() => true)
  )
}

/**
 * @internal
 */
function keepDefectsEval<Id, E>(cause: GenericCause<Id, E>): Ev.Eval<O.Option<GenericCause<never, never>>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(O.none())
    }
    case CauseTag.Fail: {
      return Ev.now(O.none())
    }
    case CauseTag.Interrupt: {
      return Ev.now(O.none())
    }
    case CauseTag.Halt: {
      return Ev.now(O.some(cause))
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => keepDefectsEval(cause.left)),
        Ev.defer(() => keepDefectsEval(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.some(then(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.none()
          }
        }
      )
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => keepDefectsEval(cause.left)),
        Ev.defer(() => keepDefectsEval(cause.right)),
        (lefts, rights) => {
          if (lefts._tag === 'Some' && rights._tag === 'Some') {
            return O.some(both(lefts.value, rights.value))
          } else if (lefts._tag === 'Some') {
            return lefts
          } else if (rights._tag === 'Some') {
            return rights
          } else {
            return O.none()
          }
        }
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => keepDefectsEval(cause.cause)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Halt` cause/finalizer defects.
 */
export function keepDefects<Id, E>(cause: GenericCause<Id, E>): O.Option<GenericCause<never, never>> {
  return keepDefectsEval(cause).value
}

/**
 * @internal
 */
function stripFailuresEval<Id, E>(cause: GenericCause<Id, E>): Ev.Eval<GenericCause<Id, never>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(empty)
    }
    case CauseTag.Fail: {
      return Ev.now(empty)
    }
    case CauseTag.Interrupt: {
      return Ev.now(cause)
    }
    case CauseTag.Halt: {
      return Ev.now(cause)
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => stripFailuresEval(cause.left)),
        Ev.defer(() => stripFailuresEval(cause.right)),
        both
      )
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => stripFailuresEval(cause.left)),
        Ev.defer(() => stripFailuresEval(cause.right)),
        then
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => stripFailuresEval(cause.cause)),
        (c) => traced(c, cause.trace)
      )
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<Id, E>(cause: GenericCause<Id, E>): GenericCause<Id, never> {
  return stripFailuresEval(cause).value
}

/**
 * @internal
 */
export function stripInterruptsEval<Id, E>(cause: GenericCause<Id, E>): Ev.Eval<GenericCause<never, E>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(empty)
    }
    case CauseTag.Fail: {
      return Ev.now(cause)
    }
    case CauseTag.Interrupt: {
      return Ev.now(empty)
    }
    case CauseTag.Halt: {
      return Ev.now(cause)
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => stripInterruptsEval(cause.left)),
        Ev.defer(() => stripInterruptsEval(cause.right)),
        both
      )
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => stripInterruptsEval(cause.left)),
        Ev.defer(() => stripInterruptsEval(cause.right)),
        then
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => stripInterruptsEval(cause.cause)),
        (c) => traced(c, cause.trace)
      )
    }
  }
}

/**
 * Discards all interrupts kept on this `Cause`.
 */
export function stripInterrupts<Id, E>(cause: GenericCause<Id, E>): GenericCause<Id, E> {
  return stripInterruptsEval(cause).value
}

function filterDefectsEval<Id, E>(
  cause: GenericCause<Id, E>,
  pf: Predicate<unknown>
): Ev.Eval<O.Option<GenericCause<Id, E>>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(O.none())
    }
    case CauseTag.Interrupt: {
      return Ev.now(O.some(interrupt(cause.id)))
    }
    case CauseTag.Fail: {
      return Ev.now(O.some(fail(cause.value)))
    }
    case CauseTag.Halt: {
      return Ev.now(pf(cause.value) ? O.some(halt(cause.value)) : O.none())
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => filterDefectsEval(cause.left, pf)),
        Ev.defer(() => filterDefectsEval(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.some(both(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.none()
        }
      )
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => filterDefectsEval(cause.left, pf)),
        Ev.defer(() => filterDefectsEval(cause.right, pf)),
        (left, right) => {
          return left._tag === 'Some'
            ? right._tag === 'Some'
              ? O.some(then(left.value, right.value))
              : left
            : right._tag === 'Some'
            ? right
            : O.none()
        }
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => filterDefectsEval(cause.cause, pf)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Remove all `Halt` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function filterDefects_<Id, E>(
  cause: GenericCause<Id, E>,
  pf: Predicate<unknown>
): O.Option<GenericCause<Id, E>> {
  return filterDefectsEval(cause, pf).value
}

/**
 * Remove all `Halt` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 *
 * @dataFirst filterDefects_
 */
export function filterDefects(
  pf: Predicate<unknown>
): <Id, E>(cause: GenericCause<Id, E>) => O.Option<GenericCause<Id, E>> {
  return (cause) => filterDefectsEval(cause, pf).value
}

function sequenceCauseEitherEval<Id, E, A>(
  cause: GenericCause<Id, E.Either<E, A>>
): Ev.Eval<E.Either<GenericCause<Id, E>, A>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(E.left(empty))
    }
    case CauseTag.Interrupt: {
      return Ev.now(E.left(cause))
    }
    case CauseTag.Fail: {
      return Ev.now(cause.value._tag === 'Left' ? E.left(fail(cause.value.left)) : E.right(cause.value.right))
    }
    case CauseTag.Halt: {
      return Ev.now(E.left(cause))
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => sequenceCauseEitherEval(cause.left)),
        Ev.defer(() => sequenceCauseEitherEval(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.right(rights.right)
              : E.left(then(lefts.left, rights.left))
            : E.right(lefts.right)
        }
      )
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => sequenceCauseEitherEval(cause.left)),
        Ev.defer(() => sequenceCauseEitherEval(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Left'
            ? rights._tag === 'Right'
              ? E.right(rights.right)
              : E.left(both(lefts.left, rights.left))
            : E.right(lefts.right)
        }
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => sequenceCauseEitherEval(cause.cause)),
        E.mapLeft((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<Id, E, A>(
  cause: GenericCause<Id, E.Either<E, A>>
): E.Either<GenericCause<Id, E>, A> {
  return sequenceCauseEitherEval(cause).value
}

function sequenceCauseOptionEval<Id, E>(cause: GenericCause<Id, O.Option<E>>): Ev.Eval<O.Option<GenericCause<Id, E>>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(O.some(empty))
    }
    case CauseTag.Interrupt: {
      return Ev.now(O.some(cause))
    }
    case CauseTag.Fail: {
      return Ev.now(O.map_(cause.value, fail))
    }
    case CauseTag.Halt: {
      return Ev.now(O.some(cause))
    }
    case CauseTag.Then: {
      return Ev.crossWith_(
        Ev.defer(() => sequenceCauseOptionEval(cause.left)),
        Ev.defer(() => sequenceCauseOptionEval(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.some(then(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.none()
        }
      )
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => sequenceCauseOptionEval(cause.left)),
        Ev.defer(() => sequenceCauseOptionEval(cause.right)),
        (lefts, rights) => {
          return lefts._tag === 'Some'
            ? rights._tag === 'Some'
              ? O.some(both(lefts.value, rights.value))
              : lefts
            : rights._tag === 'Some'
            ? rights
            : O.none()
        }
      )
    }
    case CauseTag.Traced: {
      return Ev.map_(
        Ev.defer(() => sequenceCauseOptionEval(cause.cause)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>`.
 */
export function sequenceCauseOption<Id, E>(cause: GenericCause<Id, O.Option<E>>): O.Option<GenericCause<Id, E>> {
  return sequenceCauseOptionEval(cause).value
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Halt` or `Interrupt` causes.
 * */
export function failureOrCause<Id, E>(cause: GenericCause<Id, E>): E.Either<E, GenericCause<Id, never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as GenericCause<Id, never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 */
export function failureTraceOption<Id, E>(cause: GenericCause<Id, E>): O.Option<readonly [E, O.Option<Trace>]> {
  return find_(cause, (c) =>
    isTraced(c) && isFail(c.cause)
      ? O.some([c.cause.value, O.some(c.trace)])
      : isFail(c)
      ? O.some([c.value, O.none()])
      : O.none()
  )
}

/**
 * Retrieve the first checked error and its trace on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Halt` or `Interrupt` causes.
 */
export function failureTraceOrCause<Id, E>(
  cause: GenericCause<Id, E>
): E.Either<readonly [E, O.Option<Trace>], GenericCause<Id, never>> {
  return O.match_(failureTraceOption(cause), () => E.right(cause as GenericCause<Id, never>), E.left)
}

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the
 * "most important" `Error`.
 */
export function squash<Id>(S: P.Show<Id>): <E>(f: (e: E) => unknown) => (cause: GenericCause<Id, E>) => unknown {
  return (f) => (cause) =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
        interrupted(cause)
          ? O.some<unknown>(
              new InterruptedException(
                'Interrupted by fibers: ' +
                  pipe(
                    A.from(interruptors(cause)),
                    A.map((id) => S.show(id)),
                    A.join(', ')
                  )
              )
            )
          : O.none()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException('Interrupted'))
    )
}

export function untracedEval<Id, E>(cause: GenericCause<Id, E>): Ev.Eval<GenericCause<Id, E>> {
  switch (cause._tag) {
    case CauseTag.Traced:
      return Ev.defer(() => untracedEval(cause.cause))
    case CauseTag.Both:
      return Ev.crossWith_(
        Ev.defer(() => untracedEval(cause.left)),
        Ev.defer(() => untracedEval(cause.right)),
        both
      )
    case CauseTag.Then:
      return Ev.crossWith_(
        Ev.defer(() => untracedEval(cause.left)),
        Ev.defer(() => untracedEval(cause.right)),
        then
      )
    default:
      return Ev.now(cause)
  }
}

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untraced<Id, E>(cause: GenericCause<Id, E>): GenericCause<Id, E> {
  return untracedEval(cause).value
}

/*
 * -------------------------------------------------------------------------------------------------
 * Flip
 * -------------------------------------------------------------------------------------------------
 */

const FCEStackFrameDoneTypeId = Symbol()
class FCEStackFrameDone {
  readonly _typeId: typeof FCEStackFrameDoneTypeId = FCEStackFrameDoneTypeId
}
const FCEStackFrameTracedTypeId = Symbol()
class FCEStackFrameTraced<Id, E, A> {
  readonly _typeId: typeof FCEStackFrameTracedTypeId = FCEStackFrameTracedTypeId

  constructor(readonly cause: Traced<Id, E.Either<E, A>>) {}
}

const FCEStackFrameThenLeftTypeId = Symbol()
class FCEStackFrameThenLeft<Id, E, A> {
  readonly _typeId: typeof FCEStackFrameThenLeftTypeId = FCEStackFrameThenLeftTypeId

  constructor(readonly cause: Then<Id, E.Either<E, A>>) {}
}
const FCEStackFrameThenRightTypeId = Symbol()
class FCEStackFrameThenRight<Id, E, A> {
  readonly _typeId: typeof FCEStackFrameThenRightTypeId = FCEStackFrameThenRightTypeId

  constructor(readonly cause: Then<Id, E.Either<E, A>>, readonly leftResult: E.Either<GenericCause<Id, E>, A>) {}
}
const FCEStackFrameBothLeftTypeId = Symbol()
class FCEStackFrameBothLeft<Id, E, A> {
  readonly _typeId: typeof FCEStackFrameBothLeftTypeId = FCEStackFrameBothLeftTypeId

  constructor(readonly cause: Both<Id, E.Either<E, A>>) {}
}
const FCEStackFrameBothRightTypeId = Symbol()
class FCEStackFrameBothRight<Id, E, A> {
  readonly _typeId: typeof FCEStackFrameBothRightTypeId = FCEStackFrameBothRightTypeId

  constructor(readonly cause: Both<Id, E.Either<E, A>>, readonly leftResult: E.Either<GenericCause<Id, E>, A>) {}
}

type FCEStackFrame<Id, E, A> =
  | FCEStackFrameDone
  | FCEStackFrameTraced<Id, E, A>
  | FCEStackFrameThenLeft<Id, E, A>
  | FCEStackFrameThenRight<Id, E, A>
  | FCEStackFrameBothLeft<Id, E, A>
  | FCEStackFrameBothRight<Id, E, A>

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>` by
 * recursively stripping out any failures with the error `None`.
 */
export function flipCauseEither<Id, E, A>(cause: GenericCause<Id, E.Either<E, A>>): E.Either<GenericCause<Id, E>, A> {
  let stack: Stack<FCEStackFrame<Id, E, A>> = makeStack(new FCEStackFrameDone())
  let result: E.Either<GenericCause<Id, E>, A> | undefined
  let c = cause

  recursion: while (stack) {
    // eslint-disable-next-line no-constant-condition
    pushing: while (true) {
      switch (c._tag) {
        case CauseTag.Empty:
          result = E.left(empty)
          break pushing
        case CauseTag.Traced:
          stack = makeStack(new FCEStackFrameTraced(c), stack)
          c     = c.cause
          continue pushing
        case CauseTag.Interrupt:
          result = E.left(interrupt(c.id))
          break pushing
        case CauseTag.Halt:
          result = E.left(c)
          break pushing
        case CauseTag.Fail:
          result = E.match_(
            c.value,
            (l) => E.left(fail(l)),
            (r) => E.right(r)
          )
          break pushing
        case CauseTag.Then:
          stack = makeStack(new FCEStackFrameThenLeft(c), stack)
          c     = c.left
          continue pushing
        case CauseTag.Both:
          stack = makeStack(new FCEStackFrameBothLeft(c), stack)
          c     = c.left
          continue pushing
      }
    }

    // eslint-disable-next-line no-constant-condition
    popping: while (true) {
      const top = stack.value

      stack = stack.previous!

      switch (top._typeId) {
        case FCEStackFrameDoneTypeId:
          return result
        case FCEStackFrameTracedTypeId:
          result = E.mapLeft_(result, (_) => traced(_, top.cause.trace))
          continue popping
        case FCEStackFrameThenLeftTypeId:
          c     = top.cause.right
          stack = makeStack(new FCEStackFrameThenRight(top.cause, result), stack)
          continue recursion
        case FCEStackFrameThenRightTypeId: {
          const l = top.leftResult

          if (E.isLeft(l) && E.isLeft(result)) {
            result = E.left(then(l.left, result.left))
          }

          if (E.isRight(l)) {
            result = E.right(l.right)
          }

          if (E.isRight(result)) {
            result = E.right(result.right)
          }

          continue popping
        }
        case FCEStackFrameBothLeftTypeId:
          c     = top.cause.right
          stack = makeStack(new FCEStackFrameBothRight(top.cause, result), stack)
          continue recursion
        case FCEStackFrameBothRightTypeId: {
          const l = top.leftResult

          if (E.isLeft(l) && E.isLeft(result)) {
            result = E.left(both(l.left, result.left))
          }

          if (E.isRight(l)) {
            result = E.right(l.right)
          }

          if (E.isRight(result)) {
            result = E.right(result.right)
          }

          continue popping
        }
      }
    }
  }

  throw new Error('Bug')
}

const FCOStackFrameDoneTypeId = Symbol()
class FCOStackFrameDone {
  readonly _typeId: typeof FCOStackFrameDoneTypeId = FCOStackFrameDoneTypeId
}
const FCOStackFrameTracedTypeId = Symbol()
class FCOStackFrameTraced<Id, E> {
  readonly _typeId: typeof FCOStackFrameTracedTypeId = FCOStackFrameTracedTypeId

  constructor(readonly cause: Traced<Id, O.Option<E>>) {}
}

const FCOStackFrameThenLeftTypeId = Symbol()
class FCOStackFrameThenLeft<Id, E> {
  readonly _typeId: typeof FCOStackFrameThenLeftTypeId = FCOStackFrameThenLeftTypeId

  constructor(readonly cause: Then<Id, O.Option<E>>) {}
}
const FCOStackFrameThenRightTypeId = Symbol()
class FCOStackFrameThenRight<Id, E> {
  readonly _typeId: typeof FCOStackFrameThenRightTypeId = FCOStackFrameThenRightTypeId

  constructor(readonly cause: Then<Id, O.Option<E>>, readonly leftResult: O.Option<GenericCause<Id, E>>) {}
}
const FCOStackFrameBothLeftTypeId = Symbol()
class FCOStackFrameBothLeft<Id, E> {
  readonly _typeId: typeof FCOStackFrameBothLeftTypeId = FCOStackFrameBothLeftTypeId

  constructor(readonly cause: Both<Id, O.Option<E>>) {}
}
const FCOStackFrameBothRightTypeId = Symbol()
class FCOStackFrameBothRight<Id, E> {
  readonly _typeId: typeof FCOStackFrameBothRightTypeId = FCOStackFrameBothRightTypeId

  constructor(readonly cause: Both<Id, O.Option<E>>, readonly leftResult: O.Option<GenericCause<Id, E>>) {}
}

type FCOStackFrame<Id, E> =
  | FCOStackFrameDone
  | FCOStackFrameTraced<Id, E>
  | FCOStackFrameThenLeft<Id, E>
  | FCOStackFrameThenRight<Id, E>
  | FCOStackFrameBothLeft<Id, E>
  | FCOStackFrameBothRight<Id, E>

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>` by
 * recursively stripping out any failures with the error `None`.
 */
export function flipCauseOption<Id, E>(cause: GenericCause<Id, O.Option<E>>): O.Option<GenericCause<Id, E>> {
  let stack: Stack<FCOStackFrame<Id, E>> = makeStack(new FCOStackFrameDone())
  let result: O.Option<GenericCause<Id, E>> | undefined
  let c = cause

  recursion: while (stack) {
    // eslint-disable-next-line no-constant-condition
    pushing: while (true) {
      switch (c._tag) {
        case CauseTag.Empty:
          result = O.some(empty)
          break pushing
        case CauseTag.Traced:
          stack = makeStack(new FCOStackFrameTraced(c), stack)
          c     = c.cause
          continue pushing
        case CauseTag.Interrupt:
          result = O.some(interrupt(c.id))
          break pushing
        case CauseTag.Halt:
          result = O.some(c)
          break pushing
        case CauseTag.Fail:
          result = O.match_(
            c.value,
            () => O.none(),
            (r) => O.some(fail(r))
          )
          break pushing
        case CauseTag.Then:
          stack = makeStack(new FCOStackFrameThenLeft(c), stack)
          c     = c.left
          continue pushing
        case CauseTag.Both:
          stack = makeStack(new FCOStackFrameBothLeft(c), stack)
          c     = c.left
          continue pushing
      }
    }

    // eslint-disable-next-line no-constant-condition
    popping: while (true) {
      const top = stack.value

      stack = stack.previous!

      switch (top._typeId) {
        case FCOStackFrameDoneTypeId:
          return result
        case FCOStackFrameTracedTypeId:
          result = O.map_(result, (_) => traced(_, top.cause.trace))
          continue popping
        case FCOStackFrameThenLeftTypeId:
          c     = top.cause.right
          stack = makeStack(new FCOStackFrameThenRight(top.cause, result), stack)
          continue recursion
        case FCOStackFrameThenRightTypeId: {
          const l = top.leftResult

          if (O.isSome(l) && O.isSome(result)) {
            result = O.some(then(l.value, result.value))
          }

          if (O.isNone(l) && O.isSome(result)) {
            result = O.some(result.value)
          }

          if (O.isSome(l) && O.isNone(result)) {
            result = O.some(l.value)
          }

          result = O.none()

          continue popping
        }
        case FCOStackFrameBothLeftTypeId:
          c     = top.cause.right
          stack = makeStack(new FCOStackFrameBothRight(top.cause, result), stack)
          continue recursion
        case FCOStackFrameBothRightTypeId: {
          const l = top.leftResult

          if (O.isSome(l) && O.isSome(result)) {
            result = O.some(both(l.value, result.value))
          }

          if (O.isNone(l) && O.isSome(result)) {
            result = O.some(result.value)
          }

          if (O.isSome(l) && O.isNone(result)) {
            result = O.some(l.value)
          }

          result = O.none()

          continue popping
        }
      }
    }
  }

  throw new Error('Bug')
}

/*
 * -------------------------------------------------------------------------------------------------
 * structural equality internals
 * -------------------------------------------------------------------------------------------------
 */

function structuralSymmetric<Id, A>(
  f: (x: GenericCause<Id, A>, y: GenericCause<Id, A>) => Ev.Eval<boolean>
): (x: GenericCause<Id, A>, y: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (x, y) => Ev.crossWith_(f(x, y), f(y, x), B.or_)
}

function structuralEqualEmpty<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (l._tag === CauseTag.Then || l._tag === CauseTag.Both) {
    if (l.left._tag === CauseTag.Empty) {
      return l.right.equalsEval(r)
    } else if (l.right._tag === CauseTag.Empty) {
      return l.left.equalsEval(r)
    } else {
      return Ev.pure(false)
    }
  } else {
    return Ev.pure(false)
  }
}

function structuralThenAssociate<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (
    l._tag === CauseTag.Then &&
    l.left._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function strcturalThenDistribute<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (
    l._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.right._tag === CauseTag.Then &&
    r.left._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        r.left.left.equalsEval(r.right.left),
        l.left.equalsEval(r.left.left),
        l.right.left.equalsEval(r.left.right),
        l.right.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === CauseTag.Then &&
    l.left._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.left._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        r.left.right.equalsEval(r.right.right),
        l.left.left.equalsEval(r.left.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.left.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralEqualThen<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (l._tag === CauseTag.Then && r._tag === CauseTag.Then) {
    return Ev.crossWith_(l.left.equalsEval(r.left), l.right.equalsEval(r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function structuralBothAssociate<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.right._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralBothDistribute<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.left.equalsEval(l.right.left),
        l.left.left.equalsEval(r.left),
        l.left.right.equalsEval(r.right.left),
        l.right.right.equalsEval(r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.left._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        l.left.right.equalsEval(l.right.right),
        l.left.left.equalsEval(r.left.left),
        l.right.left.equalsEval(r.left.right),
        l.left.right.equalsEval(r.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function structuralEqualBoth<Id, A>(l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  if (l._tag === CauseTag.Both && r._tag === CauseTag.Both) {
    return Ev.crossWith_(l.left.equalsEval(r.left), l.right.equalsEval(r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * hash internals
 * -------------------------------------------------------------------------------------------------
 */

function stepLoop<Id, A>(
  cause: GenericCause<Id, A>,
  stack: L.List<GenericCause<Id, A>>,
  parallel: HashSet<GenericCause<Id, A>>,
  sequential: L.List<GenericCause<Id, A>>
): readonly [HashSet<GenericCause<Id, A>>, L.List<GenericCause<Id, A>>] {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    /* eslint-disable no-param-reassign */
    switch (cause._tag) {
      case CauseTag.Empty: {
        if (L.isEmpty(stack)) {
          return tuple(parallel, sequential)
        } else {
          cause = L.unsafeHead(stack)!
          stack = L.tail(stack)
        }
        break
      }
      case CauseTag.Traced: {
        cause = cause.cause
        break
      }
      case CauseTag.Then: {
        const left  = cause.left
        const right = cause.right
        switch (left._tag) {
          case CauseTag.Empty: {
            cause = right
            break
          }
          case CauseTag.Then: {
            cause = then(left.left, then(left.right, right))
            break
          }
          case CauseTag.Both: {
            cause = both(then(left.left, right), then(left.right, right))
            break
          }
          case CauseTag.Traced: {
            cause = then(left.cause, right)
            break
          }
          default: {
            cause      = left
            sequential = L.prepend_(sequential, right)
          }
        }
        break
      }
      case CauseTag.Both: {
        stack = L.prepend_(stack, cause.right)
        cause = cause.left
        break
      }
      default: {
        if (L.isEmpty(stack)) {
          return tuple(HS.add_(parallel, cause), sequential)
        } else {
          cause    = L.unsafeHead(stack)!
          stack    = L.tail(stack)
          parallel = HS.add_(parallel, cause)
          break
        }
      }
    }
  }
  return hole()
  /* eslint-enable no-param-reassign */
}

function step<Id, A>(cause: GenericCause<Id, A>): readonly [HashSet<GenericCause<Id, A>>, L.List<GenericCause<Id, A>>] {
  return stepLoop(cause, L.empty(), HS.makeDefault(), L.empty())
}

function flattenLoop<Id, A>(
  causes: L.List<GenericCause<Id, A>>,
  flattened: L.List<HashSet<GenericCause<Id, A>>>
): L.List<HashSet<GenericCause<Id, A>>> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = L.foldl_(
      causes,
      tuple(HS.makeDefault<GenericCause<Id, A>>(), L.empty<GenericCause<Id, A>>()),
      ([parallel, sequential], cause) => {
        const [set, seq] = step(cause)
        return tuple(HS.union_(parallel, set), L.concat_(sequential, seq))
      }
    )
    const updated = HS.size(parallel) > 0 ? L.prepend_(flattened, parallel) : flattened
    if (L.isEmpty(sequential)) {
      return L.reverse(updated)
    } else {
      /* eslint-disable no-param-reassign */
      causes    = sequential
      flattened = updated
      /* eslint-enable no-param-reassign */
    }
  }
  return hole()
}

function flat<Id, A>(cause: GenericCause<Id, A>): L.List<HashSet<GenericCause<Id, A>>> {
  return flattenLoop(L.single(cause), L.empty())
}

function hashCode<Id, A>(cause: GenericCause<Id, A>): number {
  const flattened = flat(cause)
  const size      = L.length(flattened)
  let head
  if (size === 0) {
    return _emptyHash
  } else if (size === 1 && (head = L.unsafeHead(flattened)!) && HS.size(head) === 1) {
    return L.unsafeHead(L.from(head))![St.$hash]
  } else {
    return St.hashIterator(flattened[Symbol.iterator]())
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * typeclass equality internals
 * -------------------------------------------------------------------------------------------------
 */

function _equalEmpty<A>(E: P.Eq<A>): (l: Empty, r: GenericCause<any, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Empty:
        return Ev.now(true)
      case CauseTag.Then:
      case CauseTag.Both:
        return Ev.crossWith_(_equalEmpty(E)(l, r.left), _equalEmpty(E)(l, r.right), B.and_)
      case CauseTag.Traced:
        return Ev.defer(() => _equalEmpty(E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalFail<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>): (l: Fail<A>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Fail:
        return Ev.now(E.equals_(l.value, r.value))
      case CauseTag.Both:
      case CauseTag.Then:
        return symmetric(equalEmpty)(EId, E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalFail(EId, E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalHalt<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>): (l: Halt, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Halt:
        return Ev.now(St.equals(l.value, r.value))
      case CauseTag.Then:
      case CauseTag.Both:
        return symmetric(equalEmpty)(EId, E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalHalt(EId, E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalInterrupt<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>
): (l: Interrupt<Id>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Interrupt:
        return Ev.now(EId.equals_(l.id, r.id))
      case CauseTag.Then:
      case CauseTag.Both:
        return symmetric(equalEmpty)(EId, E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalInterrupt(EId, E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalThen<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>): (l: Then<Id, A>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) =>
    Ev.gen(function* (_) {
      if (r._tag === CauseTag.Traced) {
        return yield* _(_equalThen(EId, E)(l, r.cause))
      }
      return (
        (yield* _(equalThen(EId, E, l, r))) ||
        (yield* _(symmetric(thenAssociate)(EId, E, l, r))) ||
        (yield* _(symmetric(thenDistribute)(EId, E, l, r))) ||
        (yield* _(symmetric(equalEmpty)(EId, E, l, r)))
      )
    })
}

function _equalBoth<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>): (l: Both<Id, A>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) =>
    Ev.gen(function* (_) {
      if (r._tag === CauseTag.Traced) {
        return yield* _(_equalBoth(EId, E)(l, r.cause))
      }
      return (
        (yield* _(equalBoth(EId, E, l, r))) ||
        (yield* _(symmetric(bothAssociate)(EId, E, l, r))) ||
        (yield* _(symmetric(bothDistribute)(EId, E, l, r))) ||
        (yield* _(symmetric(equalEmpty)(EId, E, l, r)))
      )
    })
}

function _equalTraced<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>
): (l: Traced<Id, A>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) =>
    Ev.defer(() => (r._tag === CauseTag.Traced ? equals_(EId, E)(l.cause, r.cause) : equals_(EId, E)(l.cause, r)))
}

function equals_<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>
): (l: GenericCause<Id, A>, r: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (l._tag) {
      case CauseTag.Empty:
        return _equalEmpty(E)(l, r)
      case CauseTag.Fail:
        return _equalFail(EId, E)(l, r)
      case CauseTag.Halt:
        return _equalHalt(EId, E)(l, r)
      case CauseTag.Interrupt:
        return _equalInterrupt(EId, E)(l, r)
      case CauseTag.Traced:
        return _equalTraced(EId, E)(l, r)
      case CauseTag.Both:
        return _equalBoth(EId, E)(l, r)
      case CauseTag.Then:
        return _equalThen(EId, E)(l, r)
    }
  }
}

function symmetric<Id, A>(
  f: (EId: P.Eq<Id>, E: P.Eq<A>, x: GenericCause<Id, A>, y: GenericCause<Id, A>) => Ev.Eval<boolean>
): (EId: P.Eq<Id>, E: P.Eq<A>, x: GenericCause<Id, A>, y: GenericCause<Id, A>) => Ev.Eval<boolean> {
  return (EId, E, x, y) => Ev.crossWith_(f(EId, E, x, y), f(EId, E, y, x), B.or_)
}

function bothAssociate<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>,
  l: GenericCause<Id, A>,
  r: GenericCause<Id, A>
): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.right._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function bothDistribute<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>,
  l: GenericCause<Id, A>,
  r: GenericCause<Id, A>
): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.left, l.right.left),
        equalsE(l.left.left, r.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === CauseTag.Both &&
    l.left._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.left._tag === CauseTag.Both
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.right, l.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.left.right, r.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function thenAssociate<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>,
  l: GenericCause<Id, A>,
  r: GenericCause<Id, A>
): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (
    l._tag === CauseTag.Then &&
    l.left._tag === CauseTag.Then &&
    r._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function thenDistribute<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>,
  l: GenericCause<Id, A>,
  r: GenericCause<Id, A>
): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (
    l._tag === CauseTag.Then &&
    l.right._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.right._tag === CauseTag.Then &&
    r.left._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.left, r.right.left),
        equalsE(l.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === CauseTag.Then &&
    l.left._tag === CauseTag.Both &&
    r._tag === CauseTag.Both &&
    r.left._tag === CauseTag.Then &&
    r.right._tag === CauseTag.Then
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.right, r.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right, r.left.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function equalBoth<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>, l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (l._tag === CauseTag.Both && r._tag === CauseTag.Both) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalThen<Id, A>(EId: P.Eq<Id>, E: P.Eq<A>, l: GenericCause<Id, A>, r: GenericCause<Id, A>): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (l._tag === CauseTag.Then && r._tag === CauseTag.Then) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalEmpty<Id, A>(
  EId: P.Eq<Id>,
  E: P.Eq<A>,
  l: GenericCause<Id, A>,
  r: GenericCause<Id, A>
): Ev.Eval<boolean> {
  const equalsE = equals_(EId, E)
  if (l._tag === CauseTag.Then || l._tag === CauseTag.Both) {
    if (l.left._tag === CauseTag.Empty) {
      return equalsE(l.right, r)
    } else if (l.right._tag === CauseTag.Empty) {
      return equalsE(l.left, r)
    } else {
      return Ev.pure(false)
    }
  } else {
    return Ev.pure(false)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Errors
 * -------------------------------------------------------------------------------------------------
 */

export class Untraced extends Error {
  readonly _tag = 'Untraced'

  constructor(message?: string) {
    super(message)
    this.name  = this._tag
    this.stack = undefined
  }
}

export function isUntraced(u: unknown): u is Untraced {
  return u instanceof Error && u['_tag'] === 'Untraced'
}
