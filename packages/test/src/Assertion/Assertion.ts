import type { Render, RenderParam } from '../Render'
import type { WidenLiteral } from '../util/util'
import type { Eq } from '@principia/base/Eq'
import type { Show } from '@principia/base/Show'

import * as A from '@principia/base/collection/immutable/Array'
import * as V from '@principia/base/collection/immutable/Vector'
import * as It from '@principia/base/collection/Iterable'
import * as E from '@principia/base/Either'
import * as Ev from '@principia/base/Eval'
import * as Ex from '@principia/base/Exit'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as C from '@principia/base/IO/Cause'
import * as O from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import * as S from '@principia/base/Show'
import * as Str from '@principia/base/string'
import * as St from '@principia/base/Structural'
import assert from 'assert'

import * as BA from '../FreeBooleanAlgebra'
import { field, fn, infix, param, quoted } from '../Render'
import { asFailure, AssertionData, asSuccess } from './AssertionData'
import { AssertionIO } from './AssertionM'
import { AssertionValue } from './AssertionValue'

export type AssertResult<A> = BA.FreeBooleanAlgebra<AssertionValue<A>>

export class Assertion<A> extends AssertionIO<A> {
  constructor(readonly render: Render, readonly run: (actual: A) => AssertResult<A>) {
    super(render, (actual) => I.succeed(run(actual)))
  }

  test(a: A): boolean {
    return BA.isTrue(this.run(a))
  }

  ['&&'](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(param(this), '&&', param(that)), (actual) => BA.and_(this.run(actual), that.run(actual)))
  }

  ['||'](this: Assertion<A>, that: Assertion<A>): Assertion<A> {
    return new Assertion(infix(param(this), '||', param(that)), (actual) => BA.or_(this.run(actual), that.run(actual)))
  }

  [':'](string: string): Assertion<A> {
    return new Assertion(infix(param(this), ':', param(quoted(string))), this.run)
  }
}

interface Custom<A> {
  eq?: Eq<A>
  show?: Show<A>
}

function getShow<A>(_?: Custom<A>): O.Maybe<Show<A>> {
  return O.fromNullable(_?.show)
}

function getEq<A>(_?: Custom<A>): O.Maybe<Eq<A>> {
  return O.fromNullable(_?.eq)
}

export function and<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self['&&'](that)
}

export function or<A>(that: Assertion<A>): (self: Assertion<A>) => Assertion<A> {
  return (self) => self['||'](that)
}

export function assertion<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => boolean,
  show?: S.Show<A>
): Assertion<A> {
  const assertion = Ev.later(
    (): Assertion<A> =>
      assertionDirect(name, params, (actual) => {
        const result = Ev.later((): BA.FreeBooleanAlgebra<AssertionValue<A>> => {
          if (run(actual)) {
            return BA.success(new AssertionValue(actual, assertion, result, show))
          } else {
            return BA.failure(new AssertionValue(actual, assertion, result, show))
          }
        })
        return Ev.run(result)
      })
  )
  return Ev.run(assertion)
}

export function assertionDirect<A>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  run: (actual: A) => BA.FreeBooleanAlgebra<AssertionValue<A>>
): Assertion<A> {
  return new Assertion(fn(name, V.single(V.from(params))), run)
}

export function assertionRec<A, B>(
  name: string,
  params: ReadonlyArray<RenderParam>,
  assertion: Assertion<B>,
  get: (_: A) => O.Maybe<B>,
  orElse: (data: AssertionData<A>) => BA.FreeBooleanAlgebra<AssertionValue<A>> = asFailure
): Assertion<A> {
  const resultAssertion: Ev.Eval<Assertion<A>> = Ev.later(() =>
    assertionDirect(name, params, (a) =>
      O.match_(
        get(a),
        () => orElse(AssertionData(Ev.run(resultAssertion), a)),
        (b) => {
          const innerResult = assertion.run(b)
          const result      = Ev.later((): BA.FreeBooleanAlgebra<AssertionValue<any>> => {
            if (BA.isTrue(innerResult)) {
              return BA.success(new AssertionValue(a, resultAssertion, result))
            } else {
              return BA.failure(new AssertionValue(b, Ev.now(assertion), Ev.now(innerResult)))
            }
          })
          return Ev.run(result)
        }
      )
    )
  )
  return Ev.run(resultAssertion)
}

export const anything: Assertion<any> = assertion('anything', [], () => true)

export function approximatelyEquals(reference: number, tolerance: number): Assertion<number> {
  return assertion(
    'approximatelyEquals',
    [param(reference), param(tolerance)],
    (actual) => {
      const max = reference + tolerance
      const min = reference - tolerance
      return actual >= min && actual <= max
    },
    N.Show
  )
}

export function contains<A>(element: A, custom?: Custom<A>): Assertion<ReadonlyArray<A>> {
  return assertion(
    'contains',
    [param(element, custom?.show)],
    A.elem(
      pipe(
        getEq(custom),
        O.getOrElse(() => St.DefaultEq)
      )
    )(element),
    pipe(getShow(custom), O.map(A.getShow), O.toUndefined)
  )
}

export function containsCause<E>(cause: C.Cause<E>): Assertion<C.Cause<E>> {
  return assertion('containsCause', [param(cause, S.Show<C.Cause<E>>(C.defaultPrettyPrint))], C.contains(cause))
}

export function containsString(element: string): Assertion<string> {
  return assertion('containsString', [param(element)], Str.contains(element), Str.Show)
}

export function deepStrictEqualTo(expected: unknown, show?: S.Show<unknown>): Assertion<unknown> {
  return assertion('deepStrictEquals', [param(expected, show)], (actual) =>
    pipe(
      O.tryCatch(() => assert.deepStrictEqual(actual, expected)),
      O.match(
        () => false,
        () => true
      )
    )
  )
}

export function halts(assertion0: Assertion<any>): Assertion<Ex.PExit<any, any, any>> {
  return assertionRec(
    'halts',
    [param(assertion0)],
    assertion0,
    Ex.match(C.haltOption, () => O.nothing())
  )
}

export function exists<A>(assertion: Assertion<A>): Assertion<Iterable<A>> {
  return assertionRec('exists', [param(assertion)], assertion, It.find(assertion.test))
}

export function fails<E>(assertion: Assertion<E>): Assertion<Ex.PExit<any, E, any>> {
  return assertionRec(
    'fails',
    [param(assertion)],
    assertion,
    Ex.match(flow(C.failures, A.head), () => O.nothing())
  )
}

export function forall<A>(assertion: Assertion<A>): Assertion<Iterable<A>> {
  return assertionRec(
    'forall',
    [param(assertion)],
    assertion,
    It.find((a) => !assertion.test(a)),
    asSuccess
  )
}

export function hasField<A, B>(name: string, proj: (a: A) => B, assertion: Assertion<B>): Assertion<A> {
  return assertionRec('hasField', [param(quoted(name)), param(field(name)), param(assertion)], assertion, (actual) =>
    O.just(proj(actual))
  )
}

export function hasMessage(message: Assertion<string>): Assertion<Error> {
  return assertionRec('hasMessage', [param(message)], message, (error) => O.just(error.message))
}

export function endsWith<A>(suffix: ReadonlyArray<A>, custom?: Custom<A>): Assertion<ReadonlyArray<A>> {
  const show = pipe(getShow(custom), O.map(A.getShow), O.toUndefined)
  const eq   = pipe(
    getEq(custom),
    O.getOrElse(() => St.DefaultEq)
  )
  return assertion(
    'endsWith',
    [param(suffix, show)],
    (as) => {
      const dropped = A.drop_(as, as.length - suffix.length)
      if (dropped.length !== suffix.length) {
        return false
      }
      for (let i = 0; i < dropped.length; i++) {
        if (!eq.equals_(dropped[i], suffix[i])) {
          return false
        }
      }
      return true
    },
    show
  )
}

export function equalTo<A>(expected: WidenLiteral<A>, custom?: Custom<WidenLiteral<A>>): Assertion<WidenLiteral<A>> {
  const show = pipe(getShow(custom), O.toUndefined)
  const eq   = pipe(
    getEq(custom),
    O.getOrElse(() => St.DefaultEq)
  )
  return assertion('equalTo', [param(expected, show)], (actual) => eq.equals_(actual, expected))
}

export const isTrue: Assertion<boolean> = assertion('isTrue', [], identity)

export const isFalse: Assertion<boolean> = assertion('isFalse', [], (b) => !b)

export function isLeft<A>(assertion: Assertion<A>): Assertion<E.Either<A, any>> {
  return assertionRec(
    'isLeft',
    [param(assertion)],
    assertion,
    E.match(O.just, () => O.nothing())
  )
}

export const isNothing: Assertion<O.Maybe<any>> = assertion('isNothing', [], O.isNothing)

export function isRight<A>(assertion: Assertion<A>): Assertion<E.Either<any, A>> {
  return assertionRec(
    'isRight',
    [param(assertion)],
    assertion,
    E.match(() => O.nothing(), O.just)
  )
}

export function isJust<A>(assertion: Assertion<A>): Assertion<O.Maybe<A>> {
  return assertionRec('isJust', [param(assertion)], assertion, identity)
}

export function not<A>(assertion: Assertion<A>): Assertion<A> {
  return assertionDirect('not', [param(assertion)], (actual) => BA.not(assertion.run(actual)))
}

export function succeeds<A>(assertion: Assertion<A>): Assertion<Ex.PExit<any, any, A>> {
  return assertionRec(
    'succeeds',
    [param(assertion)],
    assertion,
    Ex.match(() => O.nothing(), O.just)
  )
}

export const isInterrupted: Assertion<Ex.PExit<any, any, any>> = assertion(
  'isInterrupted',
  [],
  Ex.match(C.interrupted, () => false)
)
