import * as Ca from '@principia/base/Cause'
import { IllegalArgumentError } from '@principia/base/Error'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/IO/Ref'
import * as O from '@principia/base/Option'
import {
  assert,
  assertM,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  fails,
  isLeft,
  isTrue,
  not,
  suite,
  testM
} from '@principia/test'
import { TestClock } from '@principia/test/environment/TestClock'

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
          const release = yield* _(Ref.make(false))
          const result  = yield* _(
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
          const release = yield* _(Ref.make(false))
          const result  = yield* _(
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
          const exit = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                () => I.fail('use failed'),
                () => I.halt(releaseDied)
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
          const release = yield* _(Ref.make(false))
          const result  = yield* _(
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
          const release = yield* _(Ref.make(false))
          const result  = yield* _(
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
          const exit = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                () => I.fail('use failed'),
                () => I.halt(releaseDied)
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
          const released = yield* _(Ref.make(false))
          const exit     = yield* _(
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
          const cause = yield* _(
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
    ),
    suite(
      'cached',
      testM('returns new instances after duration', () => {
        const incrementAndGet = Ref.updateAndGet((n: number) => n + 1)
        return I.gen(function* (_) {
          const ref   = yield* _(Ref.make(0))
          const cache = yield* _(I.cached(1000 * 60 * 60)(incrementAndGet(ref)))
          const a     = yield* _(cache)
          yield* _(TestClock.adjust(1000 * 60 * 59))
          const b = yield* _(cache)
          yield* _(TestClock.adjust(1000 * 60))
          const c = yield* _(cache)
          yield* _(TestClock.adjust(1000 * 60 * 59))
          const d = yield* _(cache)
          return assert(a, equalTo(b))
            ['&&'](assert(b, not(equalTo(c))))
            ['&&'](assert(c, equalTo(d)))
        })
      }),
      testM('correctly handles an infinite duration time to live', () =>
        I.gen(function* (_) {
          const ref             = yield* _(Ref.make(0))
          const getAndIncrement = Ref.modify_(ref, (n) => [n, n + 1])
          const cached          = yield* _(I.cached(Infinity)(getAndIncrement))
          const a               = yield* _(cached)
          const b               = yield* _(cached)
          const c               = yield* _(cached)
          return assert([a, b, c], deepStrictEqualTo([0, 0, 0]))
        })
      )
    ),
    suite(
      'cachedInvalidate',
      testM('returns new instances after duration', () => {
        const incrementAndGet = Ref.updateAndGet((n: number) => n + 1)
        return I.gen(function* (_) {
          const ref                  = yield* _(Ref.make(0))
          const [cached, invalidate] = yield* _(I.cachedInvalidate(1000 * 60 * 60)(incrementAndGet(ref)))
          const a                    = yield* _(cached)
          yield* _(TestClock.adjust(1000 * 60 * 59))
          const b = yield* _(cached)
          yield* _(invalidate)
          const c = yield* _(cached)
          yield* _(TestClock.adjust(1000 * 60))
          const d = yield* _(cached)
          yield* _(TestClock.adjust(1000 * 60 * 59))
          const e = yield* _(cached)
          return assert(a, equalTo(b))
            ['&&'](assert(b, not(equalTo(c))))
            ['&&'](assert(c, equalTo(d)))
            ['&&'](assert(d, not(equalTo(e))))
        })
      })
    ),
    suite(
      'catchSomeCause',
      testM('catches matching cause', () =>
        pipe(
          I.interrupt,
          I.catchSomeCause(
            (c): O.Option<I.IO<unknown, never, boolean>> => (Ca.interrupted(c) ? O.some(I.succeed(true)) : O.none())
          ),
          I.sandbox,
          I.map((b) => assert(b, isTrue))
        )
      ),
      testM("fails if cause doesn't match", () =>
        pipe(
          I.fiberId(),
          I.chain((fiberId) =>
            pipe(
              I.interrupt,
              I.catchSomeCause(
                (c): O.Option<I.IO<unknown, never, boolean>> => (Ca.interrupted(c) ? O.none() : O.some(I.succeed(true)))
              ),
              I.sandbox,
              I.either,
              I.map((e) => assert(e, isLeft(deepStrictEqualTo(Ca.interrupt(fiberId)))))
            )
          )
        )
      )
    )
  )
}

export default new IOSpec()
