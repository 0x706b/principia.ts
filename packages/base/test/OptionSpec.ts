import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as M from '@principia/base/Maybe'
import { all, assert, deepStrictEqualTo, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

const double = (n: number) => n * 2

const doubleSome = flow(double, M.just)

const sum = (x: number, y: number) => x + y

class OptionSpec extends DefaultRunnableSpec {
  spec = suite(
    'Option',

    test('map', () =>
      all(
        pipe(M.just(1), M.map(double), assert(deepStrictEqualTo(M.just(2)))),
        pipe(M.nothing(), M.map(double), assert(deepStrictEqualTo(M.nothing())))
      )),

    test('chain', () =>
      all(
        pipe(M.just(1), M.chain(doubleSome), assert(deepStrictEqualTo(M.just(2)))),
        pipe(
          M.just(1),
          M.chain((_) => M.nothing()),
          assert(deepStrictEqualTo(M.nothing()))
        ),
        pipe(M.nothing(), M.chain(doubleSome), assert(deepStrictEqualTo(M.nothing())))
      )),

    test('crossWith', () =>
      all(
        pipe(M.just(1), M.crossWith(M.just(2), sum), assert(deepStrictEqualTo(M.just(3)))),
        pipe(M.nothing(), M.crossWith(M.just(2), sum), assert(deepStrictEqualTo(M.nothing()))),
        pipe(M.just(1), M.crossWith(M.nothing(), sum), assert(deepStrictEqualTo(M.nothing())))
      )),

    test('fromNullable', () =>
      all(
        pipe(1, M.fromNullable, assert(deepStrictEqualTo(M.just(1)))),
        pipe(undefined, M.fromNullable, assert(deepStrictEqualTo(M.nothing()))),
        pipe(null, M.fromNullable, assert(deepStrictEqualTo(M.nothing())))
      )),

    test('fromNullableK', () => {
      const f = M.fromNullableK((n: number) => n + 1)
      const g = M.fromNullableK((_: number): number | undefined => undefined)
      return all(pipe(f(0), assert(deepStrictEqualTo(M.just(1)))), pipe(g(0), assert(deepStrictEqualTo(M.nothing()))))
    }),

    test('tryCatch', () =>
      all(
        pipe(
          M.tryCatch(() => 1),
          assert(deepStrictEqualTo(M.just(1)))
        ),
        pipe(
          M.tryCatch(() => {
            throw 'error'
          }),
          assert(deepStrictEqualTo(M.nothing()))
        )
      )),

    test('tryCatchK', () => {
      const f = M.tryCatchK((n: number) => n + 1)
      const g = M.tryCatchK((_: number): number => {
        throw 'error'
      })

      return all(pipe(f(0), assert(deepStrictEqualTo(M.just(1)))), pipe(g(0), assert(deepStrictEqualTo(M.nothing()))))
    }),

    test('fromPredicate', () => {
      const f = M.fromPredicate((n: number) => n === 1)

      return all(pipe(f(1), assert(deepStrictEqualTo(M.just(1)))), pipe(f(0), assert(deepStrictEqualTo(M.nothing()))))
    }),

    test('fromEither', () =>
      all(
        pipe(E.right(1), M.fromEither, assert(deepStrictEqualTo(M.just(1)))),
        pipe(E.left('error'), M.fromEither, assert(deepStrictEqualTo(M.nothing())))
      )),

    test('isNothing', () =>
      all(pipe(M.just(1), M.isNothing, assert(equalTo(false))), pipe(M.nothing(), M.isNothing, assert(equalTo(true))))),

    test('isJust', () =>
      all(pipe(M.just(1), M.isJust, assert(equalTo(true))), pipe(M.nothing(), M.isJust, assert(equalTo(false))))),

    test('isMaybe', () =>
      all(
        pipe(M.just(1), M.isMaybe, assert(equalTo(true))),
        pipe(M.nothing(), M.isMaybe, assert(equalTo(true))),
        pipe(E.left('no'), M.isMaybe, assert(equalTo(false)))
      )),

    test('match', () =>
      all(
        pipe(
          M.just(1),
          M.match(
            () => 0,
            (n) => n + 1
          ),
          assert(equalTo(2))
        ),
        pipe(
          M.nothing(),
          M.match(
            () => 0,
            (n: number) => n + 1
          ),
          assert(equalTo(0))
        )
      )),

    test('catchJust', () =>
      all(
        pipe(
          M.just(1),
          M.catchJust(() => M.just(M.just(2))),
          assert(deepStrictEqualTo(M.just(1)))
        ),
        pipe(
          M.nothing(),
          M.catchJust(() => M.just(M.just(2))),
          assert(deepStrictEqualTo(M.just(2)))
        )
      )),

    test('either', () =>
      all(
        pipe(M.just(1), M.either, assert(deepStrictEqualTo(M.just(E.right(1))))),
        pipe(M.nothing(), M.either, assert(deepStrictEqualTo(M.just(E.left(undefined)))))
      )),

    test('separate', () =>
      all(
        pipe(M.just(E.right(1)), M.separate, assert(deepStrictEqualTo([M.nothing(), M.just(1)]))),
        pipe(M.just(E.left(2)), M.separate, assert(deepStrictEqualTo([M.just(2), M.nothing()]))),
        pipe(M.nothing(), M.separate, assert(deepStrictEqualTo([M.nothing(), M.nothing()])))
      ))
  )
}

export default new OptionSpec()
