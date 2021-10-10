import { apTF } from '@principia/base/Apply'
import * as E from '@principia/base/Either'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import { gt } from '@principia/base/Ord'
import * as S from '@principia/base/string'
import {
  all,
  allIO,
  assert,
  assert_,
  assertIO,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  suite,
  test,
  testIO
} from '@principia/test'
import * as BA from '@principia/test/FreeBooleanAlgebra'

class EitherSpec extends DefaultRunnableSpec {
  spec = suite(
    'EitherSpec',

    test('mapLeft', () =>
      assert_(pipe(E.right('bar'), E.mapLeft(double)), deepStrictEqualTo(E.right('bar')))['&&'](
        assert_(pipe(E.left(2), E.mapLeft(double)), deepStrictEqualTo(E.left(4)))
      )),

    test('alt', () =>
      assertAlt(E.right(1), E.right(2), E.right(1))
        ['&&'](assertAlt(E.right(1), E.left('b'), E.right(1)))
        ['&&'](assertAlt(E.left('a'), E.right(2), E.right(2)))
        ['&&'](assertAlt(E.left('a'), E.left('b'), E.left('b')))),

    test('map', () => {
      const f = (s: string): number => s.length
      return assert_(pipe(E.right('abc'), E.map(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert_(pipe(E.left('s'), E.map(f)), deepStrictEqualTo(E.left('s')))
      )
    }),

    test('ap', () =>
      assertAp(E.right(1), E.right(2), E.right(3))
        ['&&'](assertAp(E.right(1), E.left('b'), E.left('b')))
        ['&&'](assertAp(E.left('a'), E.right(2), E.left('a')))
        ['&&'](assertAp(E.left('a'), E.left('b'), E.left('a')))),

    test('crossSecond', () => assert_(pipe(E.right('a'), E.crossSecond(E.right(1))), deepStrictEqualTo(E.right(1)))),

    test('chain', () => {
      const f = (s: string): E.Either<boolean, number> => E.right(s.length)
      return assert_(pipe(E.right('abc'), E.chain(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert_(pipe(E.left<string, string>('maError'), E.chain(f)), deepStrictEqualTo(E.left('maError')))
      )
    }),

    test('tap', () => {
      const f = E.chain((s: string) => E.right(s.length))
      return pipe(
        assert_(pipe(E.right('abc'), f), deepStrictEqualTo(E.right(3))),
        BA.and(assert_(pipe(E.left('maError'), f), deepStrictEqualTo(E.left('maError'))))
      )
    }),

    test('duplicate', () => assert_(pipe(E.right('a'), E.duplicate), deepStrictEqualTo(E.right(E.right('a'))))),

    test('extend', () =>
      assert_(
        pipe(
          E.right(1),
          E.extend(() => 2)
        ),
        deepStrictEqualTo(E.right(2))
      )['&&'](
        assert_(
          pipe(
            E.left('err'),
            E.extend(() => 2)
          ),
          deepStrictEqualTo(E.left('err'))
        )
      )),

    test('flatten', () => assert_(pipe(E.right(E.right('a')), E.flatten), deepStrictEqualTo(E.right('a')))),

    test('bimap', () => {
      const f = E.bimap((s: string) => s.length, gt(N.Ord)(2))
      return assert_(pipe(E.right(1), f), deepStrictEqualTo(E.right(false)))
    }),

    test('foldMap', () => {
      const f = E.foldMap(S.Monoid)((s: string) => s)
      return all(assert_(pipe(E.right('a'), f), equalTo('a')), assert_(pipe(E.left(1), f), equalTo('')))
    }),

    test('foldl', () => {
      const f = (b: string, a: string) => b + a
      return all(
        pipe(E.right('bar'), E.foldl('foo', f), assert(equalTo('foobar'))),
        pipe(E.left('bar'), E.foldl('foo', f), assert(equalTo('foo')))
      )
    }),

    test('foldr', () => {
      const f = (a: string, b: string) => b + a
      return all(
        pipe(E.right('a'), E.foldr('', f), assert(equalTo('a'))),
        pipe(E.left(1), E.foldr('', f), assert(equalTo('')))
      )
    }),

    test('mapA', () => {
      const mapA = E.mapA(M.Applicative)((n: number) => (n >= 2 ? M.just(n) : M.nothing()))
      return all(
        pipe(E.left('a'), mapA, assert(deepStrictEqualTo(M.just(E.left('a'))))),
        pipe(E.right(1), mapA, assert(deepStrictEqualTo(M.nothing()))),
        pipe(E.right(3), mapA, assert(deepStrictEqualTo(M.just(E.right(3)))))
      )
    }),

    test('match', () => {
      const f     = (s: string) => `left${s.length}`
      const g     = (s: string) => `right${s.length}`
      const match = E.match(f, g)
      return all(assert_(match(E.left('abc')), equalTo('left3')), assert_(match(E.right('abc')), equalTo('right3')))
    }),

    test('getOrElse', () =>
      all(
        pipe(
          E.right(12),
          E.getOrElse(() => 17),
          assert(equalTo(12))
        ),
        pipe(
          E.left('a'),
          E.getOrElse(() => 17),
          assert(equalTo(17))
        ),
        pipe(
          E.left('a'),
          E.getOrElse((l) => l.length + 1),
          assert(equalTo(2))
        )
      )),

    test('swap', () =>
      all(
        assert_(E.swap(E.right('a')), deepStrictEqualTo(E.left('a'))),
        assert_(E.swap(E.left('b')), deepStrictEqualTo(E.right('b')))
      )),

    test('fromNullable', () =>
      all(
        assert_(
          E.fromNullable_(null, () => 'default'),
          deepStrictEqualTo(E.left('default'))
        ),
        assert_(
          E.fromNullable_(undefined, () => 'default'),
          deepStrictEqualTo(E.left('default'))
        ),
        assert_(
          E.fromNullable_(1, () => 'default'),
          deepStrictEqualTo(E.right(1))
        )
      )),

    test('fromNullableK', () => {
      const f = E.fromNullableK(
        (n: number) => (n > 0 ? n : null),
        () => 'error'
      )
      return all(assert_(f(1), deepStrictEqualTo(E.right(1))), assert_(f(-1), deepStrictEqualTo(E.left('error'))))
    }),

    test('tryCatch', () =>
      assert_(
        E.tryCatch(() => {
          throw 'string error'
        }, identity),
        deepStrictEqualTo(E.left('string error'))
      )),

    test('getEq', () => {
      const equals = E.getEq(S.Eq, N.Eq).equals
      return all(
        pipe(E.right(1), equals(E.right(1)), assert(equalTo(true))),
        pipe(E.right(1), equals(E.right(2)), assert(equalTo(false))),
        pipe(E.right(1), equals(E.left('foo')), assert(equalTo(false))),
        pipe(E.left('foo'), equals(E.left('foo')), assert(equalTo(true))),
        pipe(E.left('foo'), equals(E.left('bar')), assert(equalTo(false))),
        pipe(E.left('foo'), equals(E.right(1)), assert(equalTo(false)))
      )
    }),

    suite(
      'getCompactable',
      test('compact', () => {
        const C = E.getCompactable(S.Monoid)
        return all(
          pipe(C.compact(E.left('1')), assert(deepStrictEqualTo(E.left('1')))),
          pipe(C.compact(E.right(M.nothing())), assert(deepStrictEqualTo(E.left(S.Monoid.nat)))),
          pipe(C.compact(E.right(M.just(123))), assert(deepStrictEqualTo(E.right(123))))
        )
      }),
      test('separate', () => {
        const C = E.getCompactable(S.Monoid)
        return all(
          pipe(C.separate(E.left('123')), assert(deepStrictEqualTo([E.left('123'), E.left('123')]))),
          pipe(C.separate(E.right(E.left('123'))), assert(deepStrictEqualTo([E.right('123'), E.left(S.Monoid.nat)]))),
          pipe(C.separate(E.right(E.right('123'))), assert(deepStrictEqualTo([E.left(S.Monoid.nat), E.right('123')])))
        )
      })
    ),

    suite(
      'getFilterable',
      test('partition', () => {
        const F = E.getFilterable(S.Monoid)
        const p = (n: number) => n > 2
        return all(
          pipe(E.left('123'), F.partition(p), assert(deepStrictEqualTo([E.left('123'), E.left('123')]))),
          pipe(E.right(1), F.partition(p), assert(deepStrictEqualTo([E.right(1), E.left(S.Monoid.nat)]))),
          pipe(E.right(3), F.partition(p), assert(deepStrictEqualTo([E.left(S.Monoid.nat), E.right(3)])))
        )
      }),
      test('partitionMap', () => {
        const F = E.getFilterable(S.Monoid)
        const p = (n: number) => n > 2
        const f = (n: number) => (p(n) ? E.right(n + 1) : E.left(n - 1))
        return all(
          pipe(E.left('123'), F.partitionMap(f), assert(deepStrictEqualTo([E.left('123'), E.left('123')]))),
          pipe(E.right(1), F.partitionMap(f), assert(deepStrictEqualTo([E.right(0), E.left(S.Monoid.nat)]))),
          pipe(E.right(3), F.partitionMap(f), assert(deepStrictEqualTo([E.left(S.Monoid.nat), E.right(4)])))
        )
      }),
      test('filter', () => {
        const F = E.getFilterable(S.Monoid)
        const p = (n: number) => n > 2
        return all(
          pipe(E.left('123'), F.filter(p), assert(deepStrictEqualTo(E.left('123')))),
          pipe(E.right(1), F.filter(p), assert(deepStrictEqualTo(E.left(S.Monoid.nat)))),
          pipe(E.right(3), F.filter(p), assert(deepStrictEqualTo(E.right(3))))
        )
      }),
      test('filterMap', () => {
        const F = E.getFilterable(S.Monoid)
        const p = (n: number) => n > 2
        const f = (n: number) => (p(n) ? M.just(n + 1) : M.nothing())
        return all(
          pipe(E.left('123'), F.filterMap(f), assert(deepStrictEqualTo(E.left('123')))),
          pipe(E.right(1), F.filterMap(f), assert(deepStrictEqualTo(E.left(S.Monoid.nat)))),
          pipe(E.right(3), F.filterMap(f), assert(deepStrictEqualTo(E.right(4))))
        )
      })
    ),

    suite(
      'getWitherable',
      testIO('filterMapA', () => {
        const filterMapA = E.getWitherable(S.Monoid).filterMapA(I.ApplicativePar)
        const p          = (n: number) => n > 2
        const f          = (n: number) => I.succeed(p(n) ? M.just(n + 1) : M.nothing())
        return allIO(
          pipe(E.left('foo'), filterMapA(f), assertIO(deepStrictEqualTo(E.left('foo')))),
          pipe(E.right(1), filterMapA(f), assertIO(deepStrictEqualTo(E.left(S.Monoid.nat)))),
          pipe(E.right(3), filterMapA(f), assertIO(deepStrictEqualTo(E.right(4))))
        )
      }),
      testIO('partitionMapA', () => {
        const partitionMapA = E.getWitherable(S.Monoid).partitionMapA(I.ApplicativePar)
        const p             = (n: number) => n > 2
        const f             = (n: number) => I.succeed(p(n) ? E.right(n + 1) : E.left(n - 1))
        return allIO(
          pipe(E.left('foo'), partitionMapA(f), assertIO(deepStrictEqualTo([E.left('foo'), E.left('foo')]))),
          pipe(E.right(1), partitionMapA(f), assertIO(deepStrictEqualTo([E.right(0), E.left(S.Monoid.nat)]))),
          pipe(E.right(3), partitionMapA(f), assertIO(deepStrictEqualTo([E.left(S.Monoid.nat), E.right(4)])))
        )
      })
    ),

    test('getSemigroup', () => {
      const S = E.getSemigroup(N.SemigroupSum)
      return all(
        pipe(E.left('a'), S.combine(E.left('b')), assert(deepStrictEqualTo(E.left('a')))),
        pipe(E.left('a'), S.combine(E.right(2)), assert(deepStrictEqualTo(E.right(2)))),
        pipe(E.right(1), S.combine(E.left('b')), assert(deepStrictEqualTo(E.right(1)))),
        pipe(E.right(1), S.combine(E.right(2)), assert(deepStrictEqualTo(E.right(3))))
      )
    }),

    test('getShow', () => {
      const Sh = E.getShow(S.Show, S.Show)
      return all(
        pipe(Sh.show(E.left('a')), assert(equalTo('left("a")'))),
        pipe(Sh.show(E.right('a')), assert(equalTo('right("a")')))
      )
    }),

    test('getApplicativeValidation', () => {
      const A = E.getApplicativeValidation(S.Monoid)

      const apT = apTF(A)

      return all(
        pipe(E.left('a'), apT(E.left('b')), assert(deepStrictEqualTo(E.left('ab')))),
        pipe(E.right([1]), apT(E.left('b')), assert(deepStrictEqualTo(E.left('b')))),
        pipe(E.right([1]), apT(E.right(2)), assert(deepStrictEqualTo(E.right([1, 2]))))
      )
    }),

    test('getAltValidation', () => {
      const A = E.getAltValidation(S.Monoid)
      return all(
        pipe(
          E.left('a'),
          A.alt(() => E.left('b')),
          assert(deepStrictEqualTo(E.left('ab')))
        ),
        pipe(
          E.right(1),
          A.alt(() => E.left('b')),
          assert(deepStrictEqualTo(E.right(1)))
        ),
        pipe(
          E.left('a'),
          A.alt(() => E.right(2)),
          assert(deepStrictEqualTo(E.right(2)))
        )
      )
    }),

    test('fromOption', () =>
      all(
        pipe(
          M.nothing(),
          E.fromMaybe(() => 'none'),
          assert(deepStrictEqualTo(E.left('none')))
        ),
        pipe(
          M.just(1),
          E.fromMaybe(() => 'none'),
          assert(deepStrictEqualTo(E.right(1)))
        )
      )),

    test('do notation', () =>
      assert_(
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
      assert_(
        pipe(
          E.left<string, number>('error'),
          E.catchAll((_) => E.right(1))
        ),
        deepStrictEqualTo(E.right(1))
      )),

    test('catchSome', () =>
      assert_(
        pipe(
          E.right(1),
          E.chain((n) => E.left(`error: ${n}`)),
          E.catchJust((s) => (s === 'error: 1' ? M.just(E.right('not ' + s)) : M.nothing()))
        ),
        deepStrictEqualTo(E.right('not error: 1'))
      )),

    suite(
      'gen',

      test('succeeds', () =>
        assert_(
          E.gen(function* (_) {
            const a = yield* _(E.right(1))
            const b = yield* _(E.right(2))
            return a + b
          }),
          deepStrictEqualTo(E.right(3))
        )),

      test('fails', () =>
        assert_(
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
  assert_(
    pipe(
      a,
      E.alt(() => b)
    ),
    deepStrictEqualTo(expected)
  )

const assertAp = (a: E.Either<string, number>, b: E.Either<string, number>, expected: E.Either<string, number>) =>
  assert_(
    pipe(
      a,
      E.map((a) => (b: number) => a + b),
      E.ap(b)
    ),
    deepStrictEqualTo(expected)
  )

const double = (x: number) => x * 2
