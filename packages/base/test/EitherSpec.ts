import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { assert, deepStrictEqualTo, DefaultRunnableSpec, suite, test } from '@principia/test'

class EitherSpec extends DefaultRunnableSpec {
  spec = suite(
    'EitherSpec',
    test('mapLeft', () => {
      const double = (n: number): number => n * 2
      return assert(pipe(E.Right('bar'), E.mapLeft(double)), deepStrictEqualTo(E.Right('bar')))['&&'](
        assert(pipe(E.Left(2), E.mapLeft(double)), deepStrictEqualTo(E.Left(4)))
      )
    }),
    test('alt', () =>
      assertAlt(E.Right(1), E.Right(2), E.Right(1))
        ['&&'](assertAlt(E.Right(1), E.Left('b'), E.Right(1)))
        ['&&'](assertAlt(E.Left('a'), E.Right(2), E.Right(2)))
        ['&&'](assertAlt(E.Left('a'), E.Left('b'), E.Left('b')))),
    test('map', () => {
      const f = (s: string): number => s.length
      return assert(pipe(E.Right('abc'), E.map(f)), deepStrictEqualTo(E.Right(3)))['&&'](
        assert(pipe(E.Left('s'), E.map(f)), deepStrictEqualTo(E.Left('s')))
      )
    }),
    test('ap', () =>
      assertAp(E.Right(1), E.Right(2), E.Right(3))
        ['&&'](assertAp(E.Right(1), E.Left('b'), E.Left('b')))
        ['&&'](assertAp(E.Left('a'), E.Right(2), E.Left('a')))
        ['&&'](assertAp(E.Left('a'), E.Left('b'), E.Left('a')))),
    test('apr', () => assert(pipe(E.Right('a'), E.apr(E.Right(1))), deepStrictEqualTo(E.Right(1)))),
    test('bind', () => {
      const f = (s: string): E.Either<boolean, number> => E.Right(s.length)
      return assert(pipe(E.Right('abc'), E.bind(f)), deepStrictEqualTo(E.Right(3)))['&&'](
        assert(pipe(E.Left<string, string>('maError'), E.bind(f)), deepStrictEqualTo(E.Left('maError')))
      )
    }),
    test('fromNullable', () =>
      assert(
        E.fromNullable_(null, () => 'default'),
        deepStrictEqualTo(E.Left('default'))
      )
        ['&&'](
          assert(
            E.fromNullable_(undefined, () => 'default'),
            deepStrictEqualTo(E.Left('default'))
          )
        )
        ['&&'](
          assert(
            E.fromNullable_(1, () => 'default'),
            deepStrictEqualTo(E.Right(1))
          )
        )),
    test('fromNullableK', () => {
      const f = E.fromNullableK_(
        (n: number) => (n > 0 ? n : null),
        () => 'error'
      )
      return assert(f(1), deepStrictEqualTo(E.Right(1)))['&&'](assert(f(-1), deepStrictEqualTo(E.Left('error'))))
    }),
    test('tryCatch', () =>
      assert(
        E.tryCatch(() => {
          throw 'string error'
        }),
        deepStrictEqualTo(E.Left('string error'))
      )),
    test('do notation', () =>
      assert(
        pipe(
          E.Right(1),
          E.bindToS('a'),
          E.bindS('b', ({ a }) => E.Right(a + 1))
        ),
        deepStrictEqualTo(
          E.Right({
            a: 1,
            b: 2
          })
        )
      )),
    test('catchAll', () =>
      assert(
        pipe(
          E.Left<string, number>('error'),
          E.catchAll((_) => E.Right(1))
        ),
        deepStrictEqualTo(E.Right(1))
      )),
    test('catchSome', () =>
      assert(
        pipe(
          E.Right(1),
          E.bind((n) => E.Left(`error: ${n}`)),
          E.catchSome((s) => (s === 'error: 1' ? O.Some(E.Right('not ' + s)) : O.None()))
        ),
        deepStrictEqualTo(E.Right('not error: 1'))
      )),
    suite(
      'gen',
      test('succeeds', () =>
        assert(
          E.gen(function* (_) {
            const a = yield* _(E.Right(1))
            const b = yield* _(E.Right(2))
            return a + b
          }),
          deepStrictEqualTo(E.Right(3))
        )),
      test('fails', () =>
        assert(
          E.gen(function* (_) {
            const a = yield* _(E.Right(1))
            const b = yield* _(E.Left<string, number>('error'))
            return a + b
          }),
          deepStrictEqualTo(E.Left('error'))
        ))
    )
  )
}

export default new EitherSpec()

const assertAlt = (a: E.Either<string, number>, b: E.Either<string, number>, expected: E.Either<string, number>) =>
  assert(
    pipe(
      a,
      E.alt(() => b)
    ),
    deepStrictEqualTo(expected)
  )

const assertAp = (a: E.Either<string, number>, b: E.Either<string, number>, expected: E.Either<string, number>) =>
  assert(
    pipe(
      a,
      E.map((a) => (b: number) => a + b),
      E.ap(b)
    ),
    deepStrictEqualTo(expected)
  )
