import * as Ca from '@principia/base/Cause'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/Ref'
import { assert, assertM, deepStrictEqualTo, DefaultRunnableSpec, equalTo, suite, testM } from '@principia/test'

class IOSpec extends DefaultRunnableSpec {
  spec = suite(
    'IOSpec',
    testM('map', () =>
      assertM(
        pipe(
          I.succeed('Hello'),
          I.map((s) => s.length)
        ),
        equalTo(5)
      )
    ),
    suite(
      'bracket',
      testM('happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.makeRef(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracket(
                (a) => I.effectTotal(() => a + 1),
                (_) => release.set(true)
              )
            )
          )
          const released = yield* _(release.get)
          return assert(result, equalTo(43))['&&'](assert(released, equalTo(true)))
        })
      ),
      testM('bracketExit error handling', () => {
        const releaseDied = new RuntimeException('release died')
        return I.gen(function* (_) {
          const exit  = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                () => I.fail('use failed'),
                () => I.die(releaseDied)
              ),
              I.result
            )
          )
          const cause = yield* _(
            pipe(
              exit,
              Ex.matchM(I.succeed, () => I.fail('effect should have died'))
            )
          )
          return assert(Ca.failures(cause), deepStrictEqualTo(['use failed']))
        })
      })
    )
  )
}

export default new IOSpec()
