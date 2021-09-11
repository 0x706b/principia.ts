import * as Ca from '@principia/base/Cause'
import * as Ch from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import { IllegalArgumentError, isIllegalArgumentError, isIllegalStateError } from '@principia/base/Error'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/IO/Ref'
import * as O from '@principia/base/Option'
import {
  assert,
  assert_,
  assertIO_,
  checkM,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  fails,
  halts,
  isInterrupted,
  isLeft,
  isTrue,
  not,
  suite,
  testM } from '@principia/test'
import { TestClock } from '@principia/test/environment/TestClock'
import * as Gen from '@principia/test/Gen'

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
        assertIO_(pipe(IOExampleError, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testM('on die', () =>
        assertIO_(pipe(IOExampleDie, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testM('on success', () =>
        assertIO_(
          pipe(
            I.succeed(1),
            I.absorbWith(() => ExampleError)
          ),
          equalTo(1)
        )
      )
    ),
    testM('map', () =>
      assertIO_(
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
          return assert_(result, equalTo(43))['&&'](assert_(released, equalTo(true)))
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
          return assert_(result, equalTo(0))['&&'](assert_(released, isTrue))
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
          return assert_(Ca.failures(cause), deepStrictEqualTo(['use failed']))
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
          return assert_(result, equalTo(43))['&&'](assert_(released, isTrue))
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
          return assert_(result, equalTo(0))['&&'](assert_(released, isTrue))
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
          return assert_(Ca.failures(cause), deepStrictEqualTo(['use failed']))['&&'](
            assert_(Ca.defects(cause), deepStrictEqualTo([releaseDied]))
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
          return assert_(Ca.defects(cause), deepStrictEqualTo([releaseDied]))['&&'](assert_(isReleased, isTrue))
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
          return assert_(a, equalTo(b))
            ['&&'](assert_(b, not(equalTo(c))))
            ['&&'](assert_(c, equalTo(d)))
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
          return assert_([a, b, c], deepStrictEqualTo([0, 0, 0]))
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
          return assert_(a, equalTo(b))
            ['&&'](assert_(b, not(equalTo(c))))
            ['&&'](assert_(c, equalTo(d)))
            ['&&'](assert_(d, not(equalTo(e))))
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
          I.map((b) => assert_(b, isTrue))
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
              I.map((e) => assert_(e, isLeft(deepStrictEqualTo(Ca.interrupt(fiberId)))))
            )
          )
        )
      )
    ),
    suite(
      'catchSomeDefect',
      testM('recovers from some defects', () => {
        const s  = 'division by zero'
        const io = I.halt(new IllegalArgumentError(s, '#'))
        return pipe(
          io,
          I.catchSomeDefect((e) =>
            isIllegalArgumentError(e) ? O.some(I.succeed(e.message)) : O.none<I.IO<unknown, never, string>>()
          ),
          I.map(assert(equalTo(s)))
        )
      }),
      testM('leaves the rest', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.halt(t)
        return pipe(
          io,
          I.catchSomeDefect((e) =>
            isIllegalStateError(e) ? O.some(I.succeed(e.message)) : O.none<I.IO<unknown, never, string>>()
          ),
          I.result,
          I.map(assert(halts(deepStrictEqualTo(t))))
        )
      }),
      testM('leaves errors', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.fail(t)
        return pipe(
          io,
          I.catchSomeDefect((e) =>
            isIllegalArgumentError(e) ? O.some(I.succeed(e.message)) : O.none<I.IO<unknown, never, string>>()
          ),
          I.result,
          I.map(assert(fails(deepStrictEqualTo(t))))
        )
      }),
      testM('leaves values', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.succeed(t)
        return pipe(
          io,
          I.catchSomeDefect((e) =>
            isIllegalArgumentError(e) ? O.some(I.succeed(e.message)) : O.none<I.IO<unknown, never, string>>()
          ),
          I.map(assert(deepStrictEqualTo(t)))
        )
      })
    ),
    suite(
      'collectAllPar',
      testM('returns the list in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = I.collectAllPar(list)
        return assertIO_(res, equalTo(Ch.make(1, 2, 3)))
      }),
      testM('is referentially transparent', () =>
        I.gen(function* (_) {
          const counter      = yield* _(Ref.make(0))
          const op           = Ref.getAndUpdate_(counter, (n) => n + 1)
          const ops3         = I.collectAllPar([op, op, op])
          const ops6         = I.crossPar_(ops3, ops3)
          const [res1, res2] = yield* _(ops6)
          return assert_(res1, not(equalTo(res2)))
        })
      )
    ),
    suite(
      'collectAllParN',
      testM('returns results in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = I.collectAllParN(2)(list)
        return assertIO_(res, equalTo(Ch.make(1, 2, 3)))
      })
    ),
    testM('subsumeEither', () =>
      checkM(Gen.alphaNumericString(), (str) => {
        const ioEither = I.succeed(E.right(str))
        const res      = I.subsumeEither(ioEither)
        return assertIO_(res, equalTo(str))
      })
    ),
    suite(
      'foreachPar',
      testM('runs single task', () => {
        const as      = [2]
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.single(4)))
      }),
      testM('runs two tasks', () => {
        const as      = [2, 3]
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.make(4, 6)))
      }),
      testM('runs many tasks', () => {
        const as      = Ch.range(1, 1000)
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.map_(as, (n) => 2 * n)))
      }),
      testM('runs a task that fails', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.fail('boom!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom!'))
      }),
      testM('runs two failed tasks', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.fail('boom1!') : n === 8 ? I.fail('bool2!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom1!')['||'](equalTo('boom2!')))
      }),
      testM('runs a task that is interrupted', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.interrupt : I.succeed(2 * n))),
          I.result
        )
        return assertIO_(results, isInterrupted)
      }),
      testM('runs a task that halts', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.halt('boom!') : I.succeed(2 * n))),
          I.result
        )
        return assertIO_(results, halts(equalTo('boom!')))
      })
    )
  )
}

export default new IOSpec()
