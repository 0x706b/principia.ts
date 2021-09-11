import * as As from '@principia/base/Async'
import { pipe } from '@principia/base/function'
import { allAsync, assert, equalTo, suite, testAsync } from '@principia/test'
import { DefaultRunnableSpec } from '@principia/test/DefaultRunnableSpec'

class AsyncSpec extends DefaultRunnableSpec {
  spec = suite(
    'AsyncSpec',
    testAsync('map', () =>
      allAsync(
        pipe(
          As.succeed(1),
          As.map((n) => n + 1),
          As.map(assert(equalTo(2)))
        ),
        pipe(
          As.fail('failure'),
          As.map((n: number) => n + 1),
          As.match(assert(equalTo('failure')), assert(equalTo(2)))
        )
      )
    )
  )
}

export default new AsyncSpec()
