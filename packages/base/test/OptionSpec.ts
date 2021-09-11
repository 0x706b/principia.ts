import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { all, assert, deepStrictEqualTo, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

const double = (n: number) => n * 2

const doubleSome = flow(double, O.some)

const sum = (x: number, y: number) => x + y

class OptionSpec extends DefaultRunnableSpec {
  spec = suite(
    'Option',

    test('map', () =>
      all(
        pipe(O.some(1), O.map(double), assert(deepStrictEqualTo(O.some(2)))),
        pipe(O.none(), O.map(double), assert(deepStrictEqualTo(O.none())))
      )),

    test('chain', () =>
      all(
        pipe(O.some(1), O.chain(doubleSome), assert(deepStrictEqualTo(O.some(2)))),
        pipe(
          O.some(1),
          O.chain((_) => O.none()),
          assert(deepStrictEqualTo(O.none()))
        ),
        pipe(O.none(), O.chain(doubleSome), assert(deepStrictEqualTo(O.none())))
      )),

    test('crossWith', () =>
      all(
        pipe(O.some(1), O.crossWith(O.some(2), sum), assert(deepStrictEqualTo(O.some(3)))),
        pipe(O.none(), O.crossWith(O.some(2), sum), assert(deepStrictEqualTo(O.none()))),
        pipe(O.some(1), O.crossWith(O.none(), sum), assert(deepStrictEqualTo(O.none())))
      )),

    test('fromNullable', () =>
      all(
        pipe(1, O.fromNullable, assert(deepStrictEqualTo(O.some(1)))),
        pipe(undefined, O.fromNullable, assert(deepStrictEqualTo(O.none()))),
        pipe(null, O.fromNullable, assert(deepStrictEqualTo(O.none())))
      )),

    test('fromNullableK', () => {
      const f = O.fromNullableK((n: number) => n + 1)
      const g = O.fromNullableK((_: number): number | undefined => undefined)
      return all(pipe(f(0), assert(deepStrictEqualTo(O.some(1)))), pipe(g(0), assert(deepStrictEqualTo(O.none()))))
    }),

    test('tryCatch', () =>
      all(
        pipe(
          O.tryCatch(() => 1),
          assert(deepStrictEqualTo(O.some(1)))
        ),
        pipe(
          O.tryCatch(() => {
            throw 'error'
          }),
          assert(deepStrictEqualTo(O.none()))
        )
      )),

    test('tryCatchK', () => {
      const f = O.tryCatchK((n: number) => n + 1)
      const g = O.tryCatchK((_: number): number => {
        throw 'error'
      })

      return all(pipe(f(0), assert(deepStrictEqualTo(O.some(1)))), pipe(g(0), assert(deepStrictEqualTo(O.none()))))
    }),

    test('fromPredicate', () => {
      const f = O.fromPredicate((n: number) => n === 1)

      return all(pipe(f(1), assert(deepStrictEqualTo(O.some(1)))), pipe(f(0), assert(deepStrictEqualTo(O.none()))))
    }),

    test('fromEither', () =>
      all(
        pipe(E.right(1), O.fromEither, assert(deepStrictEqualTo(O.some(1)))),
        pipe(E.left('error'), O.fromEither, assert(deepStrictEqualTo(O.none())))
      )),

    test('isNone', () =>
      all(pipe(O.some(1), O.isNone, assert(equalTo(false))), pipe(O.none(), O.isNone, assert(equalTo(true))))),

    test('isSome', () =>
      all(pipe(O.some(1), O.isSome, assert(equalTo(true))), pipe(O.none(), O.isSome, assert(equalTo(false))))),

    test('isOption', () =>
      all(
        pipe(O.some(1), O.isOption, assert(equalTo(true))),
        pipe(O.none(), O.isOption, assert(equalTo(true))),
        pipe(E.left('no'), O.isOption, assert(equalTo(false)))
      )),

    test('match', () =>
      all(
        pipe(
          O.some(1),
          O.match(
            () => 0,
            (n) => n + 1
          ),
          assert(equalTo(2))
        ),
        pipe(
          O.none(),
          O.match(
            () => 0,
            (n: number) => n + 1
          ),
          assert(equalTo(0))
        )
      )),

    test('catchSome', () =>
      all(
        pipe(
          O.some(1),
          O.catchSome(() => O.some(O.some(2))),
          assert(deepStrictEqualTo(O.some(1)))
        ),
        pipe(
          O.none(),
          O.catchSome(() => O.some(O.some(2))),
          assert(deepStrictEqualTo(O.some(2)))
        )
      )),

    test('either', () =>
      all(
        pipe(O.some(1), O.either, assert(deepStrictEqualTo(O.some(E.right(1))))),
        pipe(O.none(), O.either, assert(deepStrictEqualTo(O.some(E.left(undefined)))))
      )),

    test('separate', () =>
      all(
        pipe(O.some(E.right(1)), O.separate, assert(deepStrictEqualTo([O.none(), O.some(1)]))),
        pipe(O.some(E.left(2)), O.separate, assert(deepStrictEqualTo([O.some(2), O.none()]))),
        pipe(O.none(), O.separate, assert(deepStrictEqualTo([O.none(), O.none()])))
      ))
  )
}

export default new OptionSpec()
