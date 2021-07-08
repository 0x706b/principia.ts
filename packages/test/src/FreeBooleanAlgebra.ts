import type { Eq } from '@principia/base/Eq'
import type { Eval } from '@principia/base/Eval'
import type { IO } from '@principia/base/IO'

import * as B from '@principia/base/boolean'
import * as E from '@principia/base/Either'
import * as Ev from '@principia/base/Eval'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as O from '@principia/base/Option'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

abstract class FreeBooleanAlgebraSyntax {
  ['&&']<A>(this: FreeBooleanAlgebra<A>, that: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
    return and_(this, that)
  }
  ['||']<A>(this: FreeBooleanAlgebra<A>, that: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
    return or_(this, that)
  }
  ['==>']<A>(this: FreeBooleanAlgebra<A>, that: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
    return implies_(this, that)
  }
  ['<==>']<A>(this: FreeBooleanAlgebra<A>, that: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
    return iff_(this, that)
  }
}

export class Value<A> extends FreeBooleanAlgebraSyntax {
  readonly _tag = 'Value'
  constructor(readonly value: A) {
    super()
  }
}

export class And<A> extends FreeBooleanAlgebraSyntax {
  readonly _tag = 'And'
  constructor(readonly left: FreeBooleanAlgebra<A>, readonly right: FreeBooleanAlgebra<A>) {
    super()
  }
}

export class Or<A> extends FreeBooleanAlgebraSyntax {
  readonly _tag = 'Or'
  constructor(readonly left: FreeBooleanAlgebra<A>, readonly right: FreeBooleanAlgebra<A>) {
    super()
  }
}

export class Not<A> extends FreeBooleanAlgebraSyntax {
  readonly _tag = 'Not'
  constructor(readonly result: FreeBooleanAlgebra<A>) {
    super()
  }
}

export type FreeBooleanAlgebra<A> = Value<A> | And<A> | Or<A> | Not<A>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function success<A>(a: A): FreeBooleanAlgebra<A> {
  return new Value(a)
}

export function failure<A>(a: A): FreeBooleanAlgebra<A> {
  return not(success(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isValue<A>(ba: FreeBooleanAlgebra<A>): ba is Value<A> {
  return ba._tag === 'Value'
}

export function isAnd<A>(ba: FreeBooleanAlgebra<A>): ba is And<A> {
  return ba._tag === 'And'
}

export function isOr<A>(ba: FreeBooleanAlgebra<A>): ba is Or<A> {
  return ba._tag === 'Or'
}

export function isNot<A>(ba: FreeBooleanAlgebra<A>): ba is Not<A> {
  return ba._tag === 'Not'
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

export function and_<A>(left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return new And(left, right)
}

export function and<A>(right: FreeBooleanAlgebra<A>): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => and_(left, right)
}

export function or_<A>(left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return new Or(left, right)
}

export function or<A>(right: FreeBooleanAlgebra<A>): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => or_(left, right)
}

export function not<A>(ba: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return new Not(ba)
}

export function implies_<A>(left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return pipe(not(left), or(right))
}

export function implies<A>(right: FreeBooleanAlgebra<A>): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => implies_(left, right)
}

export function iff_<A>(left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>): FreeBooleanAlgebra<A> {
  return pipe(left, implies(right), and(pipe(right, implies(left))))
}

export function iff<A>(right: FreeBooleanAlgebra<A>): (left: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<A> {
  return (left) => iff_(left, right)
}

export function doubleNegative<A>(E: Eq<A>): (left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>) => boolean {
  return (left, right) => {
    if (isValue(left) && isNot(right) && isNot(right.result) && isValue(right.result.result)) {
      return E.equals_(left.value, right.result.result.value)
    }
    return false
  }
}

export function symmetric<A>(f: (a1: A, a2: A) => boolean): (a1: A, a2: A) => boolean {
  return (a1, a2) => f(a1, a2) || f(a2, a1)
}

export function deMorganLaws_<A>(E: Eq<A>): (left: FreeBooleanAlgebra<A>, right: FreeBooleanAlgebra<A>) => boolean {
  return (left, right) => {
    switch (left._tag) {
      case 'And': {
        if (
          isNot(left.left) &&
          isNot(left.right) &&
          isValue(left.left.result) &&
          isValue(left.right.result) &&
          isNot(right) &&
          isOr(right.result) &&
          isValue(right.result.left) &&
          isValue(right.result.right)
        ) {
          return B.and_(
            E.equals_(left.left.result.value, right.result.left.value),
            E.equals_(left.right.result.value, right.result.right.value)
          )
        } else {
          return false
        }
      }
      case 'Or': {
        if (
          isNot(left.left) &&
          isValue(left.left.result) &&
          isNot(left.right) &&
          isValue(left.right.result) &&
          isNot(right) &&
          isAnd(right.result) &&
          isValue(right.result.left) &&
          isValue(right.result.right)
        ) {
          return B.and_(
            E.equals_(left.left.result.value, right.result.left.value),
            E.equals_(left.right.result.value, right.result.right.value)
          )
        } else {
          return false
        }
      }
      case 'Not': {
        if (
          isOr(left.result) &&
          isValue(left.result.left) &&
          isValue(left.result.right) &&
          isAnd(right) &&
          isNot(right.left) &&
          isValue(right.left.result) &&
          isNot(right.right) &&
          isValue(right.right.result)
        ) {
          return B.and_(
            E.equals_(left.result.left.value, right.left.result.value),
            E.equals_(left.result.right.value, right.right.result.value)
          )
        } else if (
          isAnd(left.result) &&
          isValue(left.result.left) &&
          isValue(left.result.right) &&
          isOr(right) &&
          isNot(right.left) &&
          isValue(right.left.result) &&
          isNot(right.right) &&
          isValue(right.right.result)
        ) {
          return B.and_(
            E.equals_(left.result.left.value, right.left.result.value),
            E.equals_(left.result.right.value, right.right.result.value)
          )
        } else {
          return false
        }
      }
      default:
        return false
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Fold
 * -------------------------------------------------------------------------------------------------
 */

export function foldSafe_<A, B>(
  ba: FreeBooleanAlgebra<A>,
  onValue: (a: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): Eval<B> {
  return Ev.gen(function* (_) {
    switch (ba._tag) {
      case 'Value':
        return onValue(ba.value)
      case 'And':
        return onAnd(
          yield* _(foldSafe_(ba.left, onValue, onAnd, onOr, onNot)),
          yield* _(foldSafe_(ba.right, onValue, onAnd, onOr, onNot))
        )
      case 'Or':
        return onOr(
          yield* _(foldSafe_(ba.left, onValue, onAnd, onOr, onNot)),
          yield* _(foldSafe_(ba.right, onValue, onAnd, onOr, onNot))
        )
      case 'Not':
        return onNot(yield* _(foldSafe_(ba.result, onValue, onAnd, onOr, onNot)))
    }
  })
}

export function fold_<A, B>(
  ba: FreeBooleanAlgebra<A>,
  onValue: (_: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): B {
  return Ev.evaluate(foldSafe_(ba, onValue, onAnd, onOr, onNot))
}

export function fold<A, B>(
  onValue: (_: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): (ba: FreeBooleanAlgebra<A>) => B {
  return (ba) => fold_(ba, onValue, onAnd, onOr, onNot)
}

export function isTrue<A>(ba: FreeBooleanAlgebra<A>): boolean {
  return fold_(ba, (): boolean => true, B.and_, B.or_, B.invert)
}

export function isFalse<A>(ba: FreeBooleanAlgebra<A>): boolean {
  return !isTrue(ba)
}

export function failures<A>(ba: FreeBooleanAlgebra<A>): O.Option<FreeBooleanAlgebra<A>> {
  return E.match_(
    fold_<A, E.Either<FreeBooleanAlgebra<A>, FreeBooleanAlgebra<A>>>(
      ba,
      (a) => E.right(success(a)),
      (l, r) =>
        E.isRight(l)
          ? E.isRight(r)
            ? E.right(and_(l.right, r.right))
            : r
          : E.isRight(r)
          ? l
          : E.left(and_(l.left, r.left)),
      (l, r) =>
        E.isRight(l)
          ? E.isRight(r)
            ? E.right(or_(l.right, r.right))
            : l
          : E.isRight(r)
          ? r
          : E.left(or_(l.left, r.left)),
      E.swap
    ),
    O.some,
    () => O.none()
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: FreeBooleanAlgebra<A>, f: (a: A) => B): FreeBooleanAlgebra<B> {
  return chain_(fa, flow(f, success))
}

export function map<A, B>(f: (a: A) => B): (fa: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: FreeBooleanAlgebra<A>, f: (a: A) => FreeBooleanAlgebra<B>): FreeBooleanAlgebra<B> {
  return fold_(ma, f, and_, or_, not)
}

export function chain<A, B>(f: (a: A) => FreeBooleanAlgebra<B>): (ma: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: FreeBooleanAlgebra<FreeBooleanAlgebra<A>>): FreeBooleanAlgebra<A> {
  return chain_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * IO
 * -------------------------------------------------------------------------------------------------
 */

export type FreeBooleanAlgebraM<R, E, A> = IO<R, E, FreeBooleanAlgebra<A>>

export function andM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.crossWith_(ma, mb, (ba, bb) => and_(ba, bb))
}

export function andM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => andM_(ma, mb)
}

export function orM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.crossWith_(ma, mb, (ba, bb) => or_(ba, bb))
}

export function orM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => orM_(ma, mb)
}

export function notM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): FreeBooleanAlgebraM<R, E, A> {
  return I.map_(ma, not)
}

export function impliesM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.crossWith_(ma, mb, (ba, bb) => implies_(ba, bb))
}

export function impliesM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => impliesM_(ma, mb)
}

export function iffM_<R, E, A extends A1, R1, E1, A1>(
  ma: FreeBooleanAlgebraM<R, E, A>,
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return I.crossWith_(ma, mb, (ba, bb) => iff_(ba, bb))
}

export function iffM<R1, E1, A1>(
  mb: FreeBooleanAlgebraM<R1, E1, A1>
): <R, E, A extends A1>(ma: FreeBooleanAlgebraM<R, E, A>) => FreeBooleanAlgebraM<R & R1, E | E1, A | A1> {
  return (ma) => iffM_(ma, mb)
}

export function isTrueM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): IO<R, E, boolean> {
  return I.map_(ma, isTrue)
}

export function isFalseM<R, E, A>(ma: FreeBooleanAlgebraM<R, E, A>): IO<R, E, boolean> {
  return I.map_(ma, isFalse)
}

export function successM<A>(a: A): FreeBooleanAlgebraM<unknown, never, A> {
  return I.succeed(success(a))
}

export function failureM<A>(a: A): FreeBooleanAlgebraM<unknown, never, A> {
  return I.succeed(failure(a))
}

export function fromIO<R, E, A>(io: IO<R, E, A>): FreeBooleanAlgebraM<R, E, A> {
  return I.map_(io, success)
}
