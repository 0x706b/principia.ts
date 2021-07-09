import * as Ca from '@principia/base/Cause'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/Ref'
import {
  assert,
  assertM,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  fails,
  isTrue,
  suite,
  testM
} from '@principia/test'

const ExampleError   = 'oh noes!'
const IOExampleError = I.fail(ExampleError)
const IOExampleDie   = I.succeedLazy(() => {
  throw ExampleError
})

class IOSpec extends DefaultRunnableSpec {
  spec = suite(
    'IOSpec',
    suite(
      'absorbWith',
      testM('on fail', () =>
        assertM(pipe(IOExampleError, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testM('on die', () =>
        assertM(pipe(IOExampleDie, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testM('on success', () =>
        assertM(
          pipe(
            I.succeed(1),
            I.absorbWith(() => ExampleError)
          ),
          equalTo(1)
        )
      )
    ),
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
      testM('bracket happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.make(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracket(
                (a) => I.succeedLazy(() => a + 1),
                (_) => release.set(true)
              )
            )
          )
          const released = yield* _(release.get)
          return assert(result, equalTo(43))['&&'](assert(released, equalTo(true)))
        })
      ),
      testM('bracketExit happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.make(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                (_) => I.succeed(0),
                (_, __) => Ref.set_(release, true)
              )
            )
          )
          const released = yield* _(Ref.get(release))
          return assert(result, equalTo(0))['&&'](assert(released, isTrue))
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
              Ex.matchIO(I.succeed, () => I.fail('effect should have died'))
            )
          )
          return assert(Ca.failures(cause), deepStrictEqualTo(['use failed']))
        })
      })
    ),
    suite(
      'bracket + disconnect',
      testM('bracket happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.make(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracket(
                (a) => I.succeed(a + 1),
                (_) => Ref.set_(release, true)
              ),
              I.disconnect
            )
          )
          const released = yield* _(Ref.get(release))
          return assert(result, equalTo(43))['&&'](assert(released, isTrue))
        })
      ),
      testM('bracketExit happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.make(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                (_) => I.succeed(0),
                (_, __) => Ref.set_(release, true)
              ),
              I.disconnect
            )
          )
          const released = yield* _(Ref.get(release))
          return assert(result, equalTo(0))['&&'](assert(released, isTrue))
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
              I.disconnect,
              I.result
            )
          )
          const cause = yield* _(
            pipe(
              exit,
              Ex.matchIO(
                (cause) => I.succeed(cause),
                () => I.fail('effect should have failed')
              )
            )
          )
          return assert(Ca.failures(cause), deepStrictEqualTo(['use failed']))['&&'](
            assert(Ca.defects(cause), deepStrictEqualTo([releaseDied]))
          )
        })
      }),
      testM('bracketExit "beast mode" error handling', () => {
        const releaseDied = new RuntimeException('release died')
        return I.gen(function* (_) {
          const released   = yield* _(Ref.make(false))
          const exit       = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                () => {
                  throw releaseDied
                },
                () => Ref.set_(released, true)
              ),
              I.disconnect,
              I.result
            )
          )
          const cause      = yield* _(
            pipe(
              exit,
              Ex.matchIO(
                (cause) => I.succeed(cause),
                () => I.fail('effect should have failed')
              )
            )
          )
          const isReleased = yield* _(Ref.get(released))
          return assert(Ca.defects(cause), deepStrictEqualTo([releaseDied]))['&&'](assert(isReleased, isTrue))
        })
      })
    )
  )
}

export default new IOSpec()
