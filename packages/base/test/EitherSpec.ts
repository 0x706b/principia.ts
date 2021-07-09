import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { identity, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { assert, deepStrictEqualTo, DefaultRunnableSpec, suite, test } from '@principia/test'

class EitherSpec extends DefaultRunnableSpec {
  spec = suite(
    'EitherSpec',
    test('mapLeft', () => {
      const double = (n: number): number => n * 2
      return assert(pipe(E.right('bar'), E.mapLeft(double)), deepStrictEqualTo(E.right('bar')))['&&'](
        assert(pipe(E.left(2), E.mapLeft(double)), deepStrictEqualTo(E.left(4)))
      )
    }),
    test('alt', () =>
      assertAlt(E.right(1), E.right(2), E.right(1))
        ['&&'](assertAlt(E.right(1), E.left('b'), E.right(1)))
        ['&&'](assertAlt(E.left('a'), E.right(2), E.right(2)))
        ['&&'](assertAlt(E.left('a'), E.left('b'), E.left('b')))),
    test('map', () => {
      const f = (s: string): number => s.length
      return assert(pipe(E.right('abc'), E.map(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert(pipe(E.left('s'), E.map(f)), deepStrictEqualTo(E.left('s')))
      )
    }),
    test('ap', () =>
      assertAp(E.right(1), E.right(2), E.right(3))
        ['&&'](assertAp(E.right(1), E.left('b'), E.left('b')))
        ['&&'](assertAp(E.left('a'), E.right(2), E.left('a')))
        ['&&'](assertAp(E.left('a'), E.left('b'), E.left('a')))),
    test('apr', () => assert(pipe(E.right('a'), E.crossSecond(E.right(1))), deepStrictEqualTo(E.right(1)))),
    test('bind', () => {
      const f = (s: string): E.Either<boolean, number> => E.right(s.length)
      return assert(pipe(E.right('abc'), E.chain(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert(pipe(E.left<string, string>('maError'), E.chain(f)), deepStrictEqualTo(E.left('maError')))
      )
    }),
    test('fromNullable', () =>
      assert(
        E.fromNullable_(null, () => 'default'),
        deepStrictEqualTo(E.left('default'))
      )
        ['&&'](
          assert(
            E.fromNullable_(undefined, () => 'default'),
            deepStrictEqualTo(E.left('default'))
          )
        )
        ['&&'](
          assert(
            E.fromNullable_(1, () => 'default'),
            deepStrictEqualTo(E.right(1))
          )
        )),
    test('fromNullableK', () => {
      const f = E.fromNullableK_(
        (n: number) => (n > 0 ? n : null),
        () => 'error'
      )
      return assert(f(1), deepStrictEqualTo(E.right(1)))['&&'](assert(f(-1), deepStrictEqualTo(E.left('error'))))
    }),
    test('tryCatch', () =>
      assert(
        E.tryCatch(() => {
          throw 'string error'
        }, identity),
        deepStrictEqualTo(E.left('string error'))
      )),
    test('do notation', () =>
      assert(
        pipe(
          E.right(1),
          E.toS('a'),
          E.chainS('b', ({ a }) => E.right(a + 1))
        ),
        deepStrictEqualTo(
          E.right({
            a: 1,
            b: 2
          })
        )
      )),
    test('catchAll', () =>
      assert(
        pipe(
          E.left<string, number>('error'),
          E.catchAll((_) => E.right(1))
        ),
        deepStrictEqualTo(E.right(1))
      )),
    test('catchSome', () =>
      assert(
        pipe(
          E.right(1),
          E.chain((n) => E.left(`error: ${n}`)),
          E.catchSome((s) => (s === 'error: 1' ? O.some(E.right('not ' + s)) : O.none()))
        ),
        deepStrictEqualTo(E.right('not error: 1'))
      )),
    suite(
      'gen',
      test('succeeds', () =>
        assert(
          E.gen(function* (_) {
            const a = yield* _(E.right(1))
            const b = yield* _(E.right(2))
            return a + b
          }),
          deepStrictEqualTo(E.right(3))
        )),
      test('fails', () =>
        assert(
          E.gen(function* (_) {
            const a = yield* _(E.right(1))
            const b = yield* _(E.left<string, number>('error'))
            return a + b
          }),
          deepStrictEqualTo(E.left('error'))
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
