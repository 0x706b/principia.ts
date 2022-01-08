import * as A from '@principia/base/collection/immutable/Array'
import * as E from '@principia/base/Either'
import { identity, pipe } from '@principia/base/function'
import * as Id from '@principia/base/Identity'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import * as Ord from '@principia/base/Ord'
import * as Str from '@principia/base/string'
import { tuple } from '@principia/base/tuple'
import { all, assert, assert_, deepStrictEqualTo, equalTo, suite, test } from '@principia/test'
import { DefaultRunnableSpec } from '@principia/test/DefaultRunnableSpec'

class ArraySpec extends DefaultRunnableSpec {
  spec = suite(
    'Array',
    suite(
      'map',
      test('unary (value)', () =>
        pipe(
          [1, 2, 3],
          A.map((n) => n * 2),
          assert(deepStrictEqualTo([2, 4, 6]))
        )),
      test('binary (value, index)', () =>
        pipe(
          [1, 2, 3],
          A.imap((i, n) => n + i),
          assert(deepStrictEqualTo([1, 3, 5]))
        ))
    ),
    suite(
      'chain',
      test('unary (value)', () =>
        pipe(
          [1, 2, 3],
          A.chain((n) => [n + 1, n + 2, n + 3]),
          assert(deepStrictEqualTo([2, 3, 4, 3, 4, 5, 4, 5, 6]))
        )),
      test('binary (value, index)', () =>
        pipe(
          [1, 2, 3],
          A.ichain((i, n) => [n + i, n + i * 2]),
          assert(deepStrictEqualTo([1, 1, 3, 4, 5, 7]))
        ))
    ),
    test('isEmpty', () => assert_(A.isEmpty([]), equalTo(true))['&&'](assert_(A.isEmpty([1]), equalTo(false)))),
    test('isOutOfBound', () => assert_(A.isOutOfBound_([1], 1), equalTo(true))),
    test('crossWith', () =>
      pipe(
        [1, 2, 3],
        A.crossWith([4, 5, 6], (x, y) => x + y),
        assert(deepStrictEqualTo([5, 6, 7, 6, 7, 8, 7, 8, 9]))
      )),
    test('zipWith', () =>
      pipe(
        [1, 2, 3],
        A.zipWith([10, 100], (x, y) => x * y),
        assert(deepStrictEqualTo([10, 200]))
      )),
    test('separate', () =>
      pipe(
        [E.right(1), E.left('a'), E.right(2), E.left('b')],
        A.separate,
        assert(
          deepStrictEqualTo([
            ['a', 'b'],
            [1, 2]
          ])
        )
      )),
    test('extend', () => {
      const sum = A.fold(N.MonoidSum)
      return all(
        pipe([1, 2, 3, 4], A.extend(sum), assert(deepStrictEqualTo([10, 9, 7, 4]))),
        pipe([1, 2, 3, 4], A.extend(identity), assert(deepStrictEqualTo([[1, 2, 3, 4], [2, 3, 4], [3, 4], [4]])))
      )
    }),
    suite(
      'filter',
      test('unary', () => pipe([1, 2, 3, 4], A.filter(isOdd), assert(deepStrictEqualTo([1, 3])))),
      test('binary', () =>
        pipe(
          [1, 2, 3, 4],
          A.ifilter((i, n) => isOdd(n) && i !== 2),
          assert(deepStrictEqualTo([1]))
        ))
    ),
    suite(
      'filterMap',
      test('unary', () => pipe([1, 2, 3, 4], A.filterMap(doubleIfOdd), assert(deepStrictEqualTo([2, 6])))),
      test('binary', () =>
        pipe(
          [1, 2, 3, 4],
          A.ifilterMap((i, n) => (i !== 2 ? doubleIfOdd(n) : M.nothing())),
          assert(deepStrictEqualTo([2]))
        ))
    ),
    suite(
      'partition',
      test('unary', () =>
        pipe(
          [1, 2, 3, 4],
          A.partition(isOdd),
          assert(
            deepStrictEqualTo([
              [2, 4],
              [1, 3]
            ])
          )
        )),
      test('binary', () =>
        pipe(
          [1, 2, 3, 4],
          A.ipartition((i, n) => isOdd(n) && i !== 2),
          assert(deepStrictEqualTo([[2, 3, 4], [1]]))
        ))
    ),
    suite(
      'partitionMap',
      test('unary', () =>
        pipe(
          [1, 2, 3, 4],
          A.partitionMap(doubleIfOddStringifyIfEven),
          assert(
            deepStrictEqualTo([
              ['2', '4'],
              [2, 6]
            ])
          )
        )),
      test('binary', () =>
        pipe(
          [1, 2, 3, 4],
          A.ipartitionMap((i, n) => (i !== 2 ? doubleIfOddStringifyIfEven(n) : E.left('no'))),
          assert(deepStrictEqualTo([['2', 'no', '4'], [2]]))
        ))
    ),
    suite(
      'foldl',
      test('no index', () =>
        pipe(
          ['a', 'b', 'c'],
          A.foldl('', (b, a) => b + a),
          assert(equalTo('abc'))
        )),
      test('with index', () =>
        pipe(
          ['a', 'b', 'c'],
          A.ifoldl('', (i, b, a) => b + i + a),
          assert(equalTo('0a1b2c'))
        ))
    ),
    suite(
      'foldr',
      test('no index', () =>
        pipe(
          ['a', 'b', 'c'],
          A.foldr('', (a, b) => b + a),
          assert(equalTo('cba'))
        )),
      test('with index', () =>
        pipe(
          ['a', 'b', 'c'],
          A.ifoldr('', (i, a, b) => b + i + a),
          assert(equalTo('2c1b0a'))
        ))
    ),
    test('foldMap', () =>
      pipe(
        ['1', '2', '3'],
        A.foldMap(N.MonoidSum)((s) => parseInt(s)),
        assert(equalTo(6))
      )),
    test('fold', () => pipe([1, 2, 3], A.fold(N.MonoidSum), assert(equalTo(6)))),
    test('flatten', () =>
      pipe(
        [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        A.flatten,
        assert(deepStrictEqualTo([1, 2, 3, 4, 5, 6, 7, 8, 9]))
      )),
    suite(
      'chainRec',
      test('depthFirst', () =>
        pipe(
          0 as number,
          A.chainRecDepthFirst((n) => {
            if (n === 0) {
              return [E.left(n - 1), E.right(n), E.left(n + 1)]
            } else if (0 < n && n < 5) {
              return [E.right(n), E.left(n + 1)]
            } else if (-5 < n && n < 0) {
              return [E.left(n - 1), E.right(n)]
            } else {
              return [E.right(n)]
            }
          }),
          assert(deepStrictEqualTo([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]))
        )),
      test('breadthFirst', () =>
        pipe(
          0 as number,
          A.chainRecBreadthFirst((n) => {
            if (n === 0) {
              return [E.left(n - 1), E.right(n), E.left(n + 1)]
            } else if (0 < n && n < 5) {
              return [E.right(n), E.left(n + 1)]
            } else if (-5 < n && n < 0) {
              return [E.left(n - 1), E.right(n)]
            } else {
              return [E.right(n)]
            }
          }),
          assert(deepStrictEqualTo([0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]))
        ))
    ),
    test('traverse', () => {
      const f = (n: number) => (isOdd(n) ? M.just(n) : M.nothing())
      return all(
        pipe([1, 2], A.traverse(M.Applicative)(f), assert(deepStrictEqualTo(M.nothing()))),
        pipe([1, 3], A.traverse(M.Applicative)(f), assert(deepStrictEqualTo(M.just([1, 3]))))
      )
    }),
    test('mapAccumM', () => {
      const f = (_: number, s: string, a: number) => (isOdd(a) ? M.just([a, s + a] as const) : M.nothing())
      return all(
        pipe([1, 2, 3], A.imapAccumM(M.Monad)('', f), assert(deepStrictEqualTo(M.nothing()))),
        pipe([1, 3, 5], A.imapAccumM(M.Monad)('', f), assert(deepStrictEqualTo(M.just([[1, 3, 5], '135']))))
      )
    }),
    test('unfold', () =>
      assert_(
        A.unfold(5, (n) => (n > 0 ? M.just([n, n - 1]) : M.nothing())),
        deepStrictEqualTo([5, 4, 3, 2, 1])
      )),
    test('wither', () => {
      const filterMapA = A.wither(Id.Applicative)((n: number) => (n > 2 ? M.just(n + 1) : M.nothing()))
      return all(
        pipe([], filterMapA, assert(deepStrictEqualTo([]))),
        pipe([1, 3], filterMapA, assert(deepStrictEqualTo([4])))
      )
    }),
    test('wilt', () => {
      const partitionMapA = A.wilt(Id.Applicative)((n: number) => (n > 2 ? E.right(n + 1) : E.left(n - 1)))
      return all(
        pipe([], partitionMapA, assert(deepStrictEqualTo([[], []]))),
        pipe([1, 3], partitionMapA, assert(deepStrictEqualTo([[0], [4]])))
      )
    }),
    test('append', () => pipe([1, 2, 3], A.append(4), assert(deepStrictEqualTo([1, 2, 3, 4])))),
    test('chop', () => {
      const f = A.chop((as: ReadonlyArray<number>) => [as[0] * 2, as.slice(1)])
      const empty: ReadonlyArray<number> = []
      return all(
        pipe(f(empty), assert(deepStrictEqualTo(empty))),
        pipe(f([1, 2, 3]), assert(deepStrictEqualTo([2, 4, 6])))
      )
    }),
    test('chunksOf', () =>
      pipe(
        [1, 2, 3, 4, 5, 6],
        A.chunksOf(2),
        assert(
          deepStrictEqualTo([
            [1, 2],
            [3, 4],
            [5, 6]
          ])
        )
      )),
    test('collectWhile', () =>
      pipe(
        [1, 2, 3, 4, 5, 6],
        A.collectWhile((n) => (n < 5 ? M.just(n * 2) : M.nothing())),
        assert(deepStrictEqualTo([2, 4, 6, 8]))
      )),
    test('comprehension', () =>
      all(
        pipe(
          A.comprehension([[1, 2, 3]], (n) => n * 2),
          assert(deepStrictEqualTo([2, 4, 6]))
        ),
        pipe(
          A.comprehension(
            [
              [1, 2, 3],
              ['a', 'b']
            ],
            tuple
          ),
          assert(
            deepStrictEqualTo([
              [1, 'a'],
              [1, 'b'],
              [2, 'a'],
              [2, 'b'],
              [3, 'a'],
              [3, 'b']
            ])
          )
        )
      )),
    test('concat', () => pipe([1, 2, 3], A.concat([4, 5, 6]), assert(deepStrictEqualTo([1, 2, 3, 4, 5, 6])))),
    test('deleteAt', () => pipe([1, 2, 3], A.deleteAt(1), assert(deepStrictEqualTo(M.just([1, 3]))))),
    test('difference', () => pipe([1, 2, 3], A.difference(N.Eq)([1, 2]), assert(deepStrictEqualTo([3])))),
    test('drop', () => pipe([1, 2, 3], A.drop(1), assert(deepStrictEqualTo([2, 3])))),
    test('dropLast', () => pipe([1, 2, 3], A.dropLast(1), assert(deepStrictEqualTo([1, 2])))),
    test('dropWhile', () =>
      pipe(
        [1, 2, 3],
        A.dropWhile((n) => n < 3),
        assert(deepStrictEqualTo([3]))
      )),
    test('dropLastWhile', () =>
      pipe(
        [1, 2, 3],
        A.dropLastWhile((n) => n > 1),
        assert(deepStrictEqualTo([1]))
      )),
    test('elem', () => pipe(['a', 'b', 'c'], A.elem(Str.Eq)('d'), assert(equalTo(false)))),
    test('findLast', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.findLast((s) => s.length === 2),
        assert(deepStrictEqualTo(M.just('de')))
      )),
    test('findLastMap', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.findLastMap((s) => (s.length === 2 ? M.just(s + 'f') : M.nothing())),
        assert(deepStrictEqualTo(M.just('def')))
      )),
    test('findLastIndex', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.findLastIndex((s) => s.length === 2),
        assert(deepStrictEqualTo(M.just(2)))
      )),
    test('find', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.find((s) => s.length === 2),
        assert(deepStrictEqualTo(M.just('ab')))
      )),
    test('findMap', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.findMap((s) => (s.length === 2 ? M.just(s + 'c') : M.nothing())),
        assert(deepStrictEqualTo(M.just('abc')))
      )),
    test('findIndex', () =>
      pipe(
        ['ab', 'c', 'de'],
        A.findIndex((s) => s.length === 2),
        assert(deepStrictEqualTo(M.just(0)))
      )),
    test('foldlWhile', () =>
      pipe(
        [1, 2, 3, 4, 5],
        A.foldlWhile(
          0,
          (n) => n < 4,
          (b, a) => b + a
        ),
        assert(equalTo(6))
      )),
    test('foldrWhile', () =>
      pipe(
        ['a', 'b', 'c'],
        A.foldrWhile(
          '',
          (s) => s.length < 2,
          (a, b) => b + a
        ),
        assert(equalTo('cb'))
      )),
    test('group', () =>
      pipe([1, 2, 1, 1, 3, 2, 2], A.group(N.Eq), assert(deepStrictEqualTo([[1], [2], [1, 1], [3], [2, 2]])))),
    test('groupBy', () =>
      pipe(
        ['a', 1, 2, 'b', 3, 'c'],
        A.groupBy((x) => typeof x),
        assert(
          deepStrictEqualTo({
            string: ['a', 'b', 'c'],
            number: [1, 2, 3]
          })
        )
      )),
    test('insertAt', () =>
      all(
        pipe([1, 2, 3], A.insertAt(0, 0), assert(deepStrictEqualTo(M.just([0, 1, 2, 3])))),
        pipe([1, 2, 3], A.insertAt(3, 4), assert(deepStrictEqualTo(M.nothing())))
      )),
    test('intersection', () => pipe([1, 2, 3], A.intersection(N.Eq)([2, 3]), assert(deepStrictEqualTo([2, 3])))),
    test('intersperse', () => pipe([1, 2, 3], A.intersperse(0), assert(deepStrictEqualTo([1, 0, 2, 0, 3])))),
    test('lookup', () => pipe([1, 2, 3], A.lookup(1), assert(deepStrictEqualTo(M.just(2))))),
    test('lefts', () =>
      pipe([E.right(1), E.left(2), E.right(3), E.left(4)], A.lefts, assert(deepStrictEqualTo([2, 4])))),
    test('mapAccum', () =>
      pipe(
        [1, 2, 3, 4],
        A.mapAccum('', (s, n) => [n * 2, s + n.toString(10)]),
        assert(deepStrictEqualTo([[2, 4, 6, 8], '1234']))
      )),
    test('modifyAt', () =>
      pipe(
        [1, 2, 3],
        A.modifyAt(1, (n) => n * 2),
        assert(deepStrictEqualTo(M.just([1, 4, 3])))
      )),
    test('prepend', () => pipe([1, 2, 3], A.prepend(0), assert(deepStrictEqualTo([0, 1, 2, 3])))),
    test('prependAll', () => pipe([1, 2, 3], A.prependAll(0), assert(deepStrictEqualTo([0, 1, 0, 2, 0, 3])))),
    test('reverse', () => pipe([1, 2, 3], A.reverse, assert(deepStrictEqualTo([3, 2, 1])))),
    test('rotate', () => pipe([1, 2, 3], A.rotate(1), assert(deepStrictEqualTo([3, 1, 2])))),
    test('scanl', () =>
      pipe(
        [1, 2, 3],
        A.scanl(10, (b, a) => b - a),
        assert(deepStrictEqualTo([10, 9, 7, 4]))
      )),
    test('scanr', () =>
      pipe(
        [1, 2, 3],
        A.scanr(10, (b, a) => b - a),
        assert(deepStrictEqualTo([-8, 9, -7, 10]))
      )),
    test('sortBy', () => {
      interface X {
        readonly a: string
        readonly b: number
        readonly c: boolean
      }
      const byName = pipe(
        Str.Ord,
        Ord.contramap((p: { readonly a: string, readonly b: number }) => p.a)
      )
      const byAge = pipe(
        N.Ord,
        Ord.contramap((p: { readonly a: string, readonly b: number }) => p.b)
      )
      const sortByNameByAge = A.sortBy([byName, byAge])
      const sortByAgeByName = A.sortBy([byAge, byName])

      const xs: ReadonlyArray<X> = [
        { a: 'a', b: 1, c: true },
        { a: 'b', b: 3, c: true },
        { a: 'c', b: 2, c: true },
        { a: 'b', b: 2, c: true }
      ]

      return all(
        pipe(
          xs,
          sortByNameByAge,
          assert(
            deepStrictEqualTo([
              { a: 'a', b: 1, c: true },
              { a: 'b', b: 2, c: true },
              { a: 'b', b: 3, c: true },
              { a: 'c', b: 2, c: true }
            ])
          )
        ),
        pipe(
          xs,
          sortByAgeByName,
          assert(
            deepStrictEqualTo([
              { a: 'a', b: 1, c: true },
              { a: 'b', b: 2, c: true },
              { a: 'c', b: 2, c: true },
              { a: 'b', b: 3, c: true }
            ])
          )
        )
      )
    }),
    test('spanl', () =>
      pipe(
        [1, 3, 2, 4, 5],
        A.spanl((n) => n % 2 === 1),
        assert(
          deepStrictEqualTo([
            [1, 3],
            [2, 4, 5]
          ])
        )
      )),
    test('splitAt', () =>
      pipe(
        [1, 2, 3, 4],
        A.splitAt(2),
        assert(
          deepStrictEqualTo([
            [1, 2],
            [3, 4]
          ])
        )
      )),
    test('splitWhere', () =>
      pipe(
        [1, 4, 2, 3, 4],
        A.splitWhere((n) => n === 4),
        assert(deepStrictEqualTo([[1], [4, 2, 3, 4]]))
      )),
    test('take', () => pipe([1, 2, 3, 4], A.take(2), assert(deepStrictEqualTo([1, 2])))),
    test('takeLast', () => pipe([1, 2, 3, 4], A.takeLast(2), assert(deepStrictEqualTo([3, 4])))),
    test('takeWhile', () =>
      pipe(
        [1, 2, 4, 3, 5],
        A.takeWhile((n) => n < 4),
        assert(deepStrictEqualTo([1, 2]))
      )),
    test('updateAt', () => pipe([1, 2, 3, 4], A.updateAt(3, 5), assert(deepStrictEqualTo(M.just([1, 2, 3, 5]))))),
    test('unzip', () =>
      pipe(
        [
          ['a', 1],
          ['b', 2],
          ['c', 3]
        ] as const,
        A.unzip,
        assert(
          deepStrictEqualTo([
            ['a', 'b', 'c'],
            [1, 2, 3]
          ])
        )
      )),
    test('uniq', () => pipe([1, 2, 2, 3, 4, 5, 4], A.uniq(N.Eq), assert(deepStrictEqualTo([1, 2, 3, 4, 5])))),
    test('union', () =>
      pipe([1, 2, 3, 4], A.union(N.Eq)([1, 2, 4, 5, 6]), assert(deepStrictEqualTo([1, 2, 3, 4, 5, 6])))),
    test('every', () =>
      pipe(
        [1, 2, 3, 4],
        A.every((n) => n < 5),
        assert(equalTo(true))
      )),
    test('exists', () =>
      pipe(
        [1, 2, 3, 4, 5],
        A.exists((n) => n === 5),
        assert(equalTo(true))
      )),
    test('head', () => pipe([1, 2, 3, 4], A.head, assert(deepStrictEqualTo(M.just(1))))),
    test('tail', () => pipe([1, 2, 3, 4], A.tail, assert(deepStrictEqualTo(M.just([2, 3, 4])))))
  )
}

function isOdd(n: number): boolean {
  return n % 2 === 1
}

function doubleIfOdd(n: number): M.Maybe<number> {
  return isOdd(n) ? M.just(n * 2) : M.nothing()
}

function doubleIfOddStringifyIfEven(n: number): E.Either<string, number> {
  return isOdd(n) ? E.right(n * 2) : E.left(n.toString(10))
}

export default new ArraySpec()
