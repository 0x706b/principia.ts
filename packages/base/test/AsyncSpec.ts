import * as As from '@principia/base/Async'
import * as Ca from '@principia/base/Cause'
import * as Ex from '@principia/base/Exit'
import { pipe } from '@principia/base/function'
import {
  allAsync,
  assert_,
  assertAsync,
  deepStrictEqualTo,
  equalTo,
  fails,
  isInterrupted,
  suite,
  testAsync
} from '@principia/test'
import { DefaultRunnableSpec } from '@principia/test/DefaultRunnableSpec'

class AsyncSpec extends DefaultRunnableSpec {
  spec = suite(
    'AsyncSpec',
    testAsync('map', () =>
      allAsync(
        pipe(
          As.succeed(1),
          As.map((n) => n + 1),
          assertAsync(equalTo(2))
        ),
        pipe(
          As.fail('failure'),
          As.map((n: number) => n + 1),
          As.matchAsync(As.succeed, As.fail),
          assertAsync(equalTo('failure'))
        )
      )
    ),
    testAsync('matchCauseAsync', () =>
      allAsync(
        pipe(As.fail('error'), As.matchCauseAsync(As.succeed, As.fail), assertAsync(equalTo(Ca.fail('error')))),
        pipe(As.succeed(0), As.matchCauseAsync(As.fail, As.succeed), assertAsync(equalTo(0)))
      )
    ),
    testAsync('crossWithC', () =>
      allAsync(
        pipe(
          As.succeed(1),
          As.crossWithC(As.succeed(2), (x, y) => x + y),
          assertAsync(equalTo(3))
        )
      )
    ),
    testAsync('crossWith', () =>
      allAsync(
        pipe(
          As.succeed(1),
          As.crossWith(As.succeed(2), (x, y) => x + y),
          assertAsync(equalTo(3))
        )
      )
    ),
    testAsync('mapError', () =>
      allAsync(
        pipe(
          As.fail('error'),
          As.mapError((e) => e + '1'),
          As.matchAsync(As.succeed, As.fail),
          assertAsync(equalTo('error1'))
        ),
        pipe(
          As.succeed(1),
          As.mapError((e: string) => e + '1'),
          assertAsync(equalTo(1))
        )
      )
    ),
    suite(
      'foreachC',
      testAsync('runs effects in parallel', () => {
        const results: Array<number> = []
        return pipe(
          [4, 3, 2, 1],
          As.foreachC((n) =>
            As.async<never, void>((resolve) => {
              setTimeout(() => {
                results.push(n)
                resolve()
              }, n)
            })
          ),
          As.chain(() => As.succeedLazy(() => assert_(results, deepStrictEqualTo([1, 2, 3, 4]))))
        )
      }),
      testAsync('interrupts all concurrent effects if one fails', () =>
        pipe(
          [2, 4, 7, 100],
          As.foreachC((n) =>
            pipe(
              As.async<string, number>((resolve, reject) => {
                setTimeout(() => {
                  n % 2 === 0 ? resolve(n) : reject('odd number')
                }, n)
              })
            )
          ),
          As.result,
          assertAsync(fails(equalTo('odd number')))
        )
      )
    ),
    testAsync('chain', () =>
      allAsync(
        pipe(
          As.succeed(1),
          As.chain((n) => As.succeed(n + 2)),
          assertAsync(equalTo(3))
        ),
        pipe(
          As.succeed(1),
          As.chain((n) => As.fail(n + 2)),
          As.result,
          assertAsync(equalTo(Ex.fail(3)))
        ),
        pipe(
          As.fail('error'),
          As.chain((n: number) => As.succeed(n + 2)),
          As.result,
          assertAsync(equalTo(Ex.fail('error')))
        )
      )
    ),
    testAsync('asksAsync / giveAll', () =>
      allAsync(
        pipe(
          As.asksAsync((_: { n: number }) => As.succeed(_.n + 2)),
          As.giveAll({ n: 1 }),
          assertAsync(equalTo(3))
        )
      )
    )
  )
}

export default new AsyncSpec()
