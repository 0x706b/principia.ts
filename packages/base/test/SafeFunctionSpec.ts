import * as E from '@principia/base/Either'
import { identity } from '@principia/base/function'
import * as F from '@principia/base/SafeFunction'
import { assert, DefaultRunnableSpec, equalTo, isRight, suite, test } from '@principia/test'

class EitherSpec extends DefaultRunnableSpec {
  spec = suite(
    'SafeFunction',
    test('stack-safe compositon', () => {
      let f = F.single((x: number) => x + 1)
      for (let i = 0; i < 100000; i++) {
        f = F.andThen_(f, (x) => x + 1)
      }
      return assert(
        E.tryCatch(() => f(0), identity),
        isRight(equalTo(100001))
      )
    })
  )
}

export default new EitherSpec()
