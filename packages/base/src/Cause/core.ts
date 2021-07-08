import type { FiberId } from '../Fiber/FiberId'
import type { Trace } from '../Fiber/trace'
import type { HashSet } from '../HashSet'
import type { NonEmptyArray } from '../NonEmptyArray'
import type { Predicate } from '../Predicate'
import type * as P from '../prelude'
import type { Stack } from '../util/support/Stack'

import * as A from '../Array/core'
import * as B from '../boolean'
import * as E from '../Either'
import { Eq, makeEq } from '../Eq'
import * as Ev from '../Eval'
import { InterruptedException } from '../Exception'
import { eqFiberId } from '../Fiber/FiberId'
import { prettyTrace } from '../Fiber/trace'
import { flow, hole, identity, pipe } from '../function'
import * as HS from '../HashSet'
import * as L from '../List/core'
import * as O from '../Option'
import { isObject } from '../prelude'
import * as St from '../Structural'
import { tuple } from '../tuple'
import { makeStack } from '../util/support/Stack'

export const CauseTypeId = Symbol()
export type CauseTypeId = typeof CauseTypeId

export type Cause<E> = Empty | Die | Interrupt | Fail<E> | Then<E> | Both<E> | Traced<E>

export function isCause(u: unknown): u is Cause<unknown> {
  return isObject(u) && CauseTypeId in u
}

export const CauseTag = {
  Empty: 'Empty',
  Fail: 'Fail',
  Die: 'Die',
  Interrupt: 'Interrupt',
  Then: 'Then',
  Both: 'Both',
  Traced: 'Traced'
} as const

const _emptyHash = St.opt(St.randomInt())

export class Empty {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Empty

  get [St.$hash](): number {
    return _emptyHash
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
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
  readonly _tag                       = CauseTag.Fail

  constructor(readonly value: E) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.value))
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
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

export class Die {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Die

  constructor(readonly value: unknown) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.value))
  }
  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      switch (that._tag) {
        case CauseTag.Die:
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

export class Interrupt {
  readonly _E!: () => never;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Interrupt

  constructor(readonly fiberId: FiberId) {}

  get [St.$hash](): number {
    return St._combineHash(St.hash(this._tag), St.hash(this.fiberId))
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
    const self = this
    return Ev.gen(function* (_) {
      switch (that._tag) {
        case CauseTag.Interrupt:
          return eqFiberId.equals_(self.fiberId, that.fiberId)
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

export class Then<E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Then

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  get [St.$hash](): number {
    return hashCode(this)
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
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

export class Both<E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Both

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  get [St.$hash](): number {
    return hashCode(this)
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
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

export class Traced<E> {
  readonly _E!: () => E;

  readonly [CauseTypeId]: CauseTypeId = CauseTypeId
  readonly _tag                       = CauseTag.Traced

  constructor(readonly cause: Cause<E>, readonly trace: Trace) {}

  get [St.$hash](): number {
    return this.cause[St.$hash]
  }

  [St.$equals](that: unknown): boolean {
    return isCause(that) && this.equalsEval(that).value
  }

  equalsEval(that: Cause<unknown>): Ev.Eval<boolean> {
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

export const empty: Cause<never> = new Empty()

/**
 */
export function fail<E>(value: E): Cause<E> {
  return new Fail(value)
}

export function traced<E>(cause: Cause<E>, trace: Trace): Cause<E> {
  if (L.isEmpty(trace.executionTrace) && L.isEmpty(trace.stackTrace) && O.isNone(trace.parentTrace)) {
    return cause
  }
  return new Traced(cause, trace)
}

/**
 */
export function die(value: unknown): Cause<never> {
  return new Die(value)
}

/**
 */
export function interrupt(fiberId: FiberId): Cause<never> {
  return new Interrupt(fiberId)
}

/**
 */
export function then<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<E | E1>(left, right)
}

/**
 */
export function both<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Both<E | E1>(left, right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function contains_<E, E1 extends E = E>(that: Cause<E1>): (cause: Cause<E>) => Ev.Eval<boolean> {
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
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>): (cause: Cause<E>) => boolean {
  return flow(contains_(that), Ev.evaluate)
}
/**
 * Returns if a cause contains a defect
 */
export function died<E>(cause: Cause<E>): cause is Die {
  return pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Returns if the cause has a failure in it
 */
export const failed: <E>(cause: Cause<E>) => boolean = flow(
  failureOption,
  O.map(() => true),
  O.getOrElse(() => false)
)

export function isFail<E>(cause: Cause<E>): cause is Fail<E> {
  return cause._tag === CauseTag.Fail
}

/**
 */
export function isThen<E>(cause: Cause<E>): cause is Then<E> {
  return cause._tag === CauseTag.Then
}

/**
 */
export function isBoth<E>(cause: Cause<E>): cause is Both<E> {
  return cause._tag === CauseTag.Both
}

export function isTraced<E>(cause: Cause<E>): cause is Traced<E> {
  return cause._tag === CauseTag.Traced
}

/**
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  if (cause._tag === CauseTag.Empty || (cause._tag === CauseTag.Traced && cause.cause._tag === CauseTag.Empty)) {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined       = cause
  while (current) {
    switch (current._tag) {
      case CauseTag.Die: {
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
 * Returns if the cause contains an interruption in it
 */
export function interrupted<E>(cause: Cause<E>): boolean {
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
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>): O.Option<unknown> {
  return find_(cause, (c) => (c._tag === CauseTag.Die ? O.some(c.value) : O.none()))
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>): O.Option<E> {
  return find_(cause, (c) => (c._tag === CauseTag.Fail ? O.some(c.value) : O.none()))
}

/**
 * @internal
 */
export function findEval<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): Ev.Eval<O.Option<A>> {
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

export function find_<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): O.Option<A> {
  return findEval(cause, f).value
}

/**
 * Finds the first result matching f
 *
 * @category Combinators
 * @since 1.0.0
 */
export function find<A, E>(f: (cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => O.Option<A> {
  return (cause) => find_(cause, f)
}

/**
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl_<E, A>(cause: Cause<E>, a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): A {
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined       = cause
  let acc                                 = a

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
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldl<E, A>(a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => A {
  return (cause) => foldl_(cause, a, f)
}

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>): O.Option<FiberId> {
  return find_(cause, (c) => (c._tag === CauseTag.Interrupt ? O.some(c.fiberId) : O.none()))
}

/**
 * @internal
 */
function matchEval<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): Ev.Eval<A> {
  switch (cause._tag) {
    case CauseTag.Empty:
      return Ev.now(onEmpty())
    case CauseTag.Fail:
      return Ev.now(onFail(cause.value))
    case CauseTag.Die:
      return Ev.now(onDie(cause.value))
    case CauseTag.Interrupt:
      return Ev.now(onInterrupt(cause.fiberId))
    case CauseTag.Both:
      return Ev.crossWith_(
        Ev.defer(() => matchEval(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => matchEval(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        onBoth
      )
    case CauseTag.Then:
      return Ev.crossWith_(
        Ev.defer(() => matchEval(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        Ev.defer(() => matchEval(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
        onThen
      )
    case CauseTag.Traced:
      return Ev.map_(
        Ev.defer(() => matchEval(cause.cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)),
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
export function match_<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (e: E) => A,
  onDie: (u: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): A {
  return matchEval(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced).value
}

/**
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match<E, A>(
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, trace: Trace) => A
): (cause: Cause<E>) => A {
  return (cause) => matchEval(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced).value
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
export function alt_<E>(fa: Cause<E>, that: () => Cause<E>): Cause<E> {
  return chain_(fa, () => that())
}

/**
 * @category Alt
 * @since 1.0.0
 */
export function alt<E>(that: () => Cause<E>): (fa: Cause<E>) => Cause<E> {
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
export function pure<E>(e: E): Cause<E> {
  return fail(e)
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
export function ap_<E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>): Cause<D> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<E>(fa: Cause<E>): <D>(fab: Cause<(a: E) => D>) => Cause<D> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function equals<E>(x: Cause<E>, y: Cause<E>): boolean {
  return x.equalsEval(y).value
}

export const EqStructural: Eq<Cause<any>> = makeEq(equals)

export function getEq<E>(E: Eq<E>): Eq<Cause<E>> {
  const equalsE = equals_(E)
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
export function map_<E, D>(fa: Cause<E>, f: (e: E) => D) {
  return chain_(fa, (e) => fail(f(e)))
}

/**
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<E, D>(f: (e: E) => D): (fa: Cause<E>) => Cause<D> {
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
function bindEval<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Ev.Eval<Cause<D>> {
  switch (ma._tag) {
    case CauseTag.Empty:
      return Ev.now(empty)
    case CauseTag.Fail:
      return Ev.now(f(ma.value))
    case CauseTag.Die:
      return Ev.now(ma)
    case CauseTag.Interrupt:
      return Ev.now(ma)
    case CauseTag.Then:
      return Ev.crossWith_(
        Ev.defer(() => bindEval(ma.left, f)),
        Ev.defer(() => bindEval(ma.right, f)),
        then
      )
    case CauseTag.Both:
      return Ev.crossWith_(
        Ev.defer(() => bindEval(ma.left, f)),
        Ev.defer(() => bindEval(ma.right, f)),
        both
      )
    case CauseTag.Traced:
      return Ev.map_(bindEval(ma.cause, f), (cause) => traced(cause, ma.trace))
  }
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return bindEval(ma, f).value
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain<E, D>(f: (e: E) => Cause<D>): (ma: Cause<E>) => Cause<D> {
  return (ma) => chain_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E>(mma: Cause<Cause<E>>): Cause<E> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Cause<void> {
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
export function as<E1>(e: E1): <E>(fa: Cause<E>) => Cause<E1> {
  return map(() => e)
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(cause: Cause<E>): ReadonlyArray<unknown> {
  return foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) =>
    c._tag === CauseTag.Die ? O.some([...a, c.value]) : O.none()
  )
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>): ReadonlyArray<E> {
  return foldl_(cause, [] as readonly E[], (a, c) => (c._tag === CauseTag.Fail ? O.some([...a, c.value]) : O.none()))
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>): ReadonlySet<FiberId> {
  return foldl_(cause, new Set(), (s, c) => (c._tag === CauseTag.Interrupt ? O.some(s.add(c.fiberId)) : O.none()))
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    find((c) => (died(c) || failed(c) ? O.some(false) : O.none())),
    O.getOrElse(() => true)
  )
}

/**
 * @internal
 */
function keepDefectsEval<E>(cause: Cause<E>): Ev.Eval<O.Option<Cause<never>>> {
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
    case CauseTag.Die: {
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
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return keepDefectsEval(cause).value
}

/**
 * @internal
 */
function stripFailuresEval<E>(cause: Cause<E>): Ev.Eval<Cause<never>> {
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
    case CauseTag.Die: {
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
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  return stripFailuresEval(cause).value
}

/**
 * @internal
 */
export function stripInterruptsEval<E>(cause: Cause<E>): Ev.Eval<Cause<E>> {
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
    case CauseTag.Die: {
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
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  return stripInterruptsEval(cause).value
}

function stripSomeDefectsEval<E>(cause: Cause<E>, pf: Predicate<unknown>): Ev.Eval<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case CauseTag.Empty: {
      return Ev.now(O.none())
    }
    case CauseTag.Interrupt: {
      return Ev.now(O.some(interrupt(cause.fiberId)))
    }
    case CauseTag.Fail: {
      return Ev.now(O.some(fail(cause.value)))
    }
    case CauseTag.Die: {
      return Ev.now(pf(cause.value) ? O.some(die(cause.value)) : O.none())
    }
    case CauseTag.Both: {
      return Ev.crossWith_(
        Ev.defer(() => stripSomeDefectsEval(cause.left, pf)),
        Ev.defer(() => stripSomeDefectsEval(cause.right, pf)),
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
        Ev.defer(() => stripSomeDefectsEval(cause.left, pf)),
        Ev.defer(() => stripSomeDefectsEval(cause.right, pf)),
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
        Ev.defer(() => stripSomeDefectsEval(cause.cause, pf)),
        O.map((c) => traced(c, cause.trace))
      )
    }
  }
}

export function stripSomeDefects_<E>(cause: Cause<E>, pf: Predicate<unknown>): O.Option<Cause<E>> {
  return stripSomeDefectsEval(cause, pf).value
}

export function stripSomeDefects(pf: Predicate<unknown>): <E>(cause: Cause<E>) => O.Option<Cause<E>> {
  return (cause) => stripSomeDefectsEval(cause, pf).value
}

function sequenceCauseEitherEval<E, A>(cause: Cause<E.Either<E, A>>): Ev.Eval<E.Either<Cause<E>, A>> {
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
    case CauseTag.Die: {
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
export function sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  return sequenceCauseEitherEval(cause).value
}

function sequenceCauseOptionEval<E>(cause: Cause<O.Option<E>>): Ev.Eval<O.Option<Cause<E>>> {
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
    case CauseTag.Die: {
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
export function sequenceCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return sequenceCauseOptionEval(cause).value
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export function failureOrCause<E>(cause: Cause<E>): E.Either<E, Cause<never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 */
export function failureTraceOption<E>(cause: Cause<E>): O.Option<readonly [E, O.Option<Trace>]> {
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
 * that is known to contain only `Die` or `Interrupt` causes.
 */
export function failureTraceOrCause<E>(cause: Cause<E>): E.Either<readonly [E, O.Option<Trace>], Cause<never>> {
  return O.match_(failureTraceOption(cause), () => E.right(cause as Cause<never>), E.left)
}

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the
 * "most important" `Error`.
 */
export function squash<E>(f: (e: E) => unknown): (cause: Cause<E>) => unknown {
  return (cause) =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
        interrupted(cause)
          ? O.some<unknown>(
              new InterruptedException(
                'Interrupted by fibers: ' +
                  Array.from(interruptors(cause))
                    .map((_) => _.seqNumber.toString())
                    .map((_) => '#' + _)
                    .join(', ')
              )
            )
          : O.none()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException('Interrupted'))
    )
}

export function untracedEval<E>(cause: Cause<E>): Ev.Eval<Cause<E>> {
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

export function untraced<E>(cause: Cause<E>): Cause<E> {
  return untracedEval(cause).value
}

/*
 * -------------------------------------------------------------------------------------------------
 * Errors
 * -------------------------------------------------------------------------------------------------
 */

export class FiberFailure<E> extends Error {
  readonly _tag   = 'FiberFailure'
  readonly pretty = pretty(this.cause)

  constructor(readonly cause: Cause<E>) {
    super()

    this.name  = this._tag
    this.stack = undefined
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u['_tag'] === 'FiberFailure'
}

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

/*
 * -------------------------------------------------------------------------------------------------
 * Render
 * -------------------------------------------------------------------------------------------------
 */

type Segment = Sequential | Parallel | Failure

type Step = Parallel | Failure

interface Failure {
  _tag: 'Failure'
  lines: string[]
}

interface Parallel {
  _tag: 'Parallel'
  all: Sequential[]
}

interface Sequential {
  _tag: 'Sequential'
  all: Step[]
}

const Failure = (lines: string[]): Failure => ({
  _tag: 'Failure',
  lines
})

const Sequential = (all: Step[]): Sequential => ({
  _tag: 'Sequential',
  all
})

const Parallel = (all: Sequential[]): Parallel => ({
  _tag: 'Parallel',
  all
})

type TraceRenderer = (_: Trace) => string

export interface Renderer<E = unknown> {
  renderFailure: (error: E) => string[]
  renderError: (error: Error) => string[]
  renderTrace: TraceRenderer
  renderUnknown: (error: unknown) => string[]
}

const headTail = <A>(a: NonEmptyArray<A>): [A, A[]] => {
  const x    = [...a]
  const head = x.shift() as A
  return [head, x]
}

const lines = (s: string) => s.split('\n').map((s) => s.replace('\r', '')) as string[]

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
    : []

const renderInterrupt = (fiberId: FiberId, trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([
    Failure([`An interrupt was produced by #${fiberId.seqNumber}.`, '', ...renderTrace(trace, traceRenderer)])
  ])

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error))

const renderDie = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['An unchecked error was produced.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderFailure = (error: string[], trace: O.Option<Trace>, traceRenderer: TraceRenderer): Sequential =>
  Sequential([Failure(['A checked error was not handled.', '', ...error, ...renderTrace(trace, traceRenderer)])])

const renderToString = (u: unknown): string => {
  if (typeof u === 'object' && u != null && 'toString' in u && typeof u['toString'] === 'function') {
    return u['toString']()
  }
  return JSON.stringify(u, null, 2)
}

const causeToSequential = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Sequential> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Empty: {
        return Sequential([])
      }
      case CauseTag.Fail: {
        return cause.value instanceof Error
          ? renderFailure(renderer.renderError(cause.value), O.none(), renderer.renderTrace)
          : renderFailure(renderer.renderFailure(cause.value), O.none(), renderer.renderTrace)
      }
      case CauseTag.Die: {
        return cause.value instanceof Error
          ? renderDie(renderer.renderError(cause.value), O.none(), renderer.renderTrace)
          : renderDie(renderer.renderUnknown(cause.value), O.none(), renderer.renderTrace)
      }
      case CauseTag.Interrupt: {
        return renderInterrupt(cause.fiberId, O.none(), renderer.renderTrace)
      }
      case CauseTag.Then: {
        return Sequential(yield* _(linearSegments(cause, renderer)))
      }
      case CauseTag.Both: {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))])
      }
      case CauseTag.Traced: {
        switch (cause.cause._tag) {
          case CauseTag.Fail: {
            return renderFailure(renderer.renderFailure(cause.cause.value), O.some(cause.trace), renderer.renderTrace)
          }
          case CauseTag.Die: {
            return renderDie(renderer.renderUnknown(cause.cause.value), O.some(cause.trace), renderer.renderTrace)
          }
          case CauseTag.Interrupt: {
            return renderInterrupt(cause.cause.fiberId, O.some(cause.trace), renderer.renderTrace)
          }
          default: {
            return Sequential([
              Failure([
                'An error was rethrown with a new trace.',
                ...renderTrace(O.some(cause.trace), renderer.renderTrace)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ])
          }
        }
      }
    }
  })

const linearSegments = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Step[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Then: {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ]
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all
      }
    }
  })

const parallelSegments = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<Sequential[]> =>
  Ev.gen(function* (_) {
    switch (cause._tag) {
      case CauseTag.Both: {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ]
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))]
      }
    }
  })

const times = (s: string, n: number) => {
  let h = ''

  for (let i = 0; i < n; i += 1) {
    h += s
  }

  return h
}

const format = (segment: Segment): readonly string[] => {
  switch (segment._tag) {
    case 'Failure': {
      return prefixBlock(segment.lines, '─', ' ')
    }
    case 'Parallel': {
      return [
        times('══╦', segment.all.length - 1) + '══╗',
        ...A.foldr_(segment.all, [] as string[], (current, acc) => [
          ...prefixBlock(acc, '  ║', '  ║'),
          ...prefixBlock(format(current), '  ', '  ')
        ])
      ]
    }
    case 'Sequential': {
      return A.chain_(segment.all, (seg) => ['║', ...prefixBlock(format(seg), '╠', '║'), '▼'])
    }
  }
}

const prettyLines = <E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<readonly string[]> =>
  Ev.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer))

    if (s.all.length === 1 && s.all[0]._tag === 'Failure') {
      return s.all[0].lines
    }

    return O.getOrElse_(A.updateAt(0, '╥')(format(s)), (): string[] => [])
  })

function renderTrace(o: O.Option<Trace>, renderTrace: TraceRenderer) {
  return o._tag === 'None' ? [] : lines(renderTrace(o.value))
}

export function prettySafe<E>(cause: Cause<E>, renderer: Renderer<E>): Ev.Eval<string> {
  return Ev.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer))
    return lines.join('\n')
  })
}

const defaultErrorToLines = (error: unknown) =>
  error instanceof Error ? renderError(error) : lines(renderToString(error))

export const defaultRenderer: Renderer = {
  renderError,
  renderTrace: prettyTrace,
  renderUnknown: defaultErrorToLines,
  renderFailure: defaultErrorToLines
}

export function pretty<E>(cause: Cause<E>, renderer: Renderer<E> = defaultRenderer): string {
  return prettySafe(cause, renderer).value
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
class FCEStackFrameTraced<E, A> {
  readonly _typeId: typeof FCEStackFrameTracedTypeId = FCEStackFrameTracedTypeId

  constructor(readonly cause: Traced<E.Either<E, A>>) {}
}

const FCEStackFrameThenLeftTypeId = Symbol()
class FCEStackFrameThenLeft<E, A> {
  readonly _typeId: typeof FCEStackFrameThenLeftTypeId = FCEStackFrameThenLeftTypeId

  constructor(readonly cause: Then<E.Either<E, A>>) {}
}
const FCEStackFrameThenRightTypeId = Symbol()
class FCEStackFrameThenRight<E, A> {
  readonly _typeId: typeof FCEStackFrameThenRightTypeId = FCEStackFrameThenRightTypeId

  constructor(readonly cause: Then<E.Either<E, A>>, readonly leftResult: E.Either<Cause<E>, A>) {}
}
const FCEStackFrameBothLeftTypeId = Symbol()
class FCEStackFrameBothLeft<E, A> {
  readonly _typeId: typeof FCEStackFrameBothLeftTypeId = FCEStackFrameBothLeftTypeId

  constructor(readonly cause: Both<E.Either<E, A>>) {}
}
const FCEStackFrameBothRightTypeId = Symbol()
class FCEStackFrameBothRight<E, A> {
  readonly _typeId: typeof FCEStackFrameBothRightTypeId = FCEStackFrameBothRightTypeId

  constructor(readonly cause: Both<E.Either<E, A>>, readonly leftResult: E.Either<Cause<E>, A>) {}
}

type FCEStackFrame<E, A> =
  | FCEStackFrameDone
  | FCEStackFrameTraced<E, A>
  | FCEStackFrameThenLeft<E, A>
  | FCEStackFrameThenRight<E, A>
  | FCEStackFrameBothLeft<E, A>
  | FCEStackFrameBothRight<E, A>

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>` by
 * recursively stripping out any failures with the error `None`.
 */
export function flipCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  let stack: Stack<FCEStackFrame<E, A>> = makeStack(new FCEStackFrameDone())
  let result: E.Either<Cause<E>, A> | undefined
  let c                                 = cause

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
          result = E.left(interrupt(c.fiberId))
          break pushing
        case CauseTag.Die:
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
class FCOStackFrameTraced<E> {
  readonly _typeId: typeof FCOStackFrameTracedTypeId = FCOStackFrameTracedTypeId

  constructor(readonly cause: Traced<O.Option<E>>) {}
}

const FCOStackFrameThenLeftTypeId = Symbol()
class FCOStackFrameThenLeft<E> {
  readonly _typeId: typeof FCOStackFrameThenLeftTypeId = FCOStackFrameThenLeftTypeId

  constructor(readonly cause: Then<O.Option<E>>) {}
}
const FCOStackFrameThenRightTypeId = Symbol()
class FCOStackFrameThenRight<E> {
  readonly _typeId: typeof FCOStackFrameThenRightTypeId = FCOStackFrameThenRightTypeId

  constructor(readonly cause: Then<O.Option<E>>, readonly leftResult: O.Option<Cause<E>>) {}
}
const FCOStackFrameBothLeftTypeId = Symbol()
class FCOStackFrameBothLeft<E> {
  readonly _typeId: typeof FCOStackFrameBothLeftTypeId = FCOStackFrameBothLeftTypeId

  constructor(readonly cause: Both<O.Option<E>>) {}
}
const FCOStackFrameBothRightTypeId = Symbol()
class FCOStackFrameBothRight<E> {
  readonly _typeId: typeof FCOStackFrameBothRightTypeId = FCOStackFrameBothRightTypeId

  constructor(readonly cause: Both<O.Option<E>>, readonly leftResult: O.Option<Cause<E>>) {}
}

type FCOStackFrame<E> =
  | FCOStackFrameDone
  | FCOStackFrameTraced<E>
  | FCOStackFrameThenLeft<E>
  | FCOStackFrameThenRight<E>
  | FCOStackFrameBothLeft<E>
  | FCOStackFrameBothRight<E>

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>` by
 * recursively stripping out any failures with the error `None`.
 */
export function flipCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  let stack: Stack<FCOStackFrame<E>> = makeStack(new FCOStackFrameDone())
  let result: O.Option<Cause<E>> | undefined
  let c                              = cause

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
          result = O.some(interrupt(c.fiberId))
          break pushing
        case CauseTag.Die:
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

function structuralSymmetric<A>(
  f: (x: Cause<A>, y: Cause<A>) => Ev.Eval<boolean>
): (x: Cause<A>, y: Cause<A>) => Ev.Eval<boolean> {
  return (x, y) => Ev.crossWith_(f(x, y), f(y, x), B.or_)
}

function structuralEqualEmpty<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function structuralThenAssociate<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function strcturalThenDistribute<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function structuralEqualThen<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  if (l._tag === CauseTag.Then && r._tag === CauseTag.Then) {
    return Ev.crossWith_(l.left.equalsEval(r.left), l.right.equalsEval(r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function structuralBothAssociate<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function structuralBothDistribute<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function structuralEqualBoth<A>(l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
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

function stepLoop<A>(
  cause: Cause<A>,
  stack: L.List<Cause<A>>,
  parallel: HashSet<Cause<A>>,
  sequential: L.List<Cause<A>>
): readonly [HashSet<Cause<A>>, L.List<Cause<A>>] {
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

function step<A>(cause: Cause<A>): readonly [HashSet<Cause<A>>, L.List<Cause<A>>] {
  return stepLoop(cause, L.empty(), HS.makeDefault(), L.empty())
}

function flattenLoop<A>(causes: L.List<Cause<A>>, flattened: L.List<HashSet<Cause<A>>>): L.List<HashSet<Cause<A>>> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = L.foldl_(
      causes,
      tuple(HS.makeDefault<Cause<A>>(), L.empty<Cause<A>>()),
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

function flat<A>(cause: Cause<A>): L.List<HashSet<Cause<A>>> {
  return flattenLoop(L.single(cause), L.empty())
}

function hashCode<A>(cause: Cause<A>): number {
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

function _equalEmpty<A>(E: P.Eq<A>): (l: Empty, r: Cause<A>) => Ev.Eval<boolean> {
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

function _equalFail<A>(E: P.Eq<A>): (l: Fail<A>, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Fail:
        return Ev.now(E.equals_(l.value, r.value))
      case CauseTag.Both:
      case CauseTag.Then:
        return symmetric(equalEmpty)(E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalFail(E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalDie<A>(E: P.Eq<A>): (l: Die, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Die:
        return Ev.now(St.equals(l.value, r.value))
      case CauseTag.Then:
      case CauseTag.Both:
        return symmetric(equalEmpty)(E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalDie(E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalInterrupt<A>(E: P.Eq<A>): (l: Interrupt, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (r._tag) {
      case CauseTag.Interrupt:
        return Ev.now(eqFiberId.equals_(l.fiberId, r.fiberId))
      case CauseTag.Then:
      case CauseTag.Both:
        return symmetric(equalEmpty)(E, l, r)
      case CauseTag.Traced:
        return Ev.defer(() => _equalInterrupt(E)(l, r.cause))
      default:
        return Ev.now(false)
    }
  }
}

function _equalThen<A>(E: P.Eq<A>): (l: Then<A>, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) =>
    Ev.gen(function* (_) {
      if (r._tag === CauseTag.Traced) {
        return yield* _(_equalThen(E)(l, r.cause))
      }
      return (
        (yield* _(equalThen(E, l, r))) ||
        (yield* _(symmetric(thenAssociate)(E, l, r))) ||
        (yield* _(symmetric(thenDistribute)(E, l, r))) ||
        (yield* _(symmetric(equalEmpty)(E, l, r)))
      )
    })
}

function _equalBoth<A>(E: P.Eq<A>): (l: Both<A>, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) =>
    Ev.gen(function* (_) {
      if (r._tag === CauseTag.Traced) {
        return yield* _(_equalBoth(E)(l, r.cause))
      }
      return (
        (yield* _(equalBoth(E, l, r))) ||
        (yield* _(symmetric(bothAssociate)(E, l, r))) ||
        (yield* _(symmetric(bothDistribute)(E, l, r))) ||
        (yield* _(symmetric(equalEmpty)(E, l, r)))
      )
    })
}

function _equalTraced<A>(E: P.Eq<A>): (l: Traced<A>, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) => Ev.defer(() => (r._tag === CauseTag.Traced ? equals_(E)(l.cause, r.cause) : equals_(E)(l.cause, r)))
}

function equals_<A>(E: P.Eq<A>): (l: Cause<A>, r: Cause<A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (l._tag) {
      case CauseTag.Empty:
        return _equalEmpty(E)(l, r)
      case CauseTag.Fail:
        return _equalFail(E)(l, r)
      case CauseTag.Die:
        return _equalDie(E)(l, r)
      case CauseTag.Interrupt:
        return _equalInterrupt(E)(l, r)
      case CauseTag.Traced:
        return _equalTraced(E)(l, r)
      case CauseTag.Both:
        return _equalBoth(E)(l, r)
      case CauseTag.Then:
        return _equalThen(E)(l, r)
    }
  }
}

function symmetric<A>(
  f: (E: P.Eq<A>, x: Cause<A>, y: Cause<A>) => Ev.Eval<boolean>
): (E: P.Eq<A>, x: Cause<A>, y: Cause<A>) => Ev.Eval<boolean> {
  return (E, x, y) => Ev.crossWith_(f(E, x, y), f(E, y, x), B.or_)
}

function bothAssociate<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
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

function bothDistribute<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
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

function thenAssociate<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
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

function thenDistribute<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
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

function equalBoth<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === CauseTag.Both && r._tag === CauseTag.Both) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalThen<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === CauseTag.Then && r._tag === CauseTag.Then) {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalEmpty<A>(E: P.Eq<A>, l: Cause<A>, r: Cause<A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
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
