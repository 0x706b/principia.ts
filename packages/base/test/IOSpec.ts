import * as A from '@principia/base/Array'
import * as Ca from '@principia/base/Cause'
import * as Ch from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import { IllegalArgumentError, isIllegalArgumentError, isIllegalStateError } from '@principia/base/Error'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import { flow, identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import {
  all,
  allIO,
  anything,
  assert,
  assert_,
  assertIO_,
  check,
  checkM,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  fails,
  halts,
  isInterrupted,
  isLeft,
  isRight,
  isTrue,
  not,
  suite,
  test,
  testIO
} from '@principia/test'
import { TestClock } from '@principia/test/environment/TestClock'
import * as Gen from '@principia/test/Gen'

const ExampleError   = 'oh noes!'
const IOExampleError = I.fail(ExampleError)
const IOExampleDie   = I.succeedLazy(() => {
  throw ExampleError
})

function exactlyOnce<A, R, A1>(value: A, func: (_: I.UIO<A>) => I.IO<R, string, A1>): I.IO<R, string, A1> {
  return pipe(
    Ref.make(0),
    I.chain((ref) =>
      I.gen(function* (_) {
        const res = yield* _(
          func(
            pipe(
              Ref.update_(ref, (n) => n + 1),
              I.as(value)
            )
          )
        )
        const count = yield* _(ref.get)
        if (count != 1) {
          yield* _(I.fail('Accessed more than once'))
        } else {
          yield* _(I.unit())
        }
        return res
      })
    )
  )
}

class IOSpec extends DefaultRunnableSpec {
  spec = suite(
    'IOSpec',
    suite(
      'absorbWith',
      testIO('on fail', () =>
        assertIO_(pipe(IOExampleError, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testIO('on die', () =>
        assertIO_(pipe(IOExampleDie, I.absorbWith(identity), I.result), fails(equalTo(ExampleError as unknown)))
      ),
      testIO('on success', () =>
        assertIO_(
          pipe(
            I.succeed(1),
            I.absorbWith(() => ExampleError)
          ),
          equalTo(1)
        )
      )
    ),
    testIO('map', () =>
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
      testIO('bracket happy path', () =>
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
      testIO('bracketExit happy path', () =>
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
      testIO('bracketExit error handling', () => {
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
      testIO('bracket happy path', () =>
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
      testIO('bracketExit happy path', () =>
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
      testIO('bracketExit error handling', () => {
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
      testIO('bracketExit "beast mode" error handling', () => {
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
      testIO('returns new instances after duration', () => {
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
      testIO('correctly handles an infinite duration time to live', () =>
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
      testIO('returns new instances after duration', () => {
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
      'catchJustCause',
      testIO('catches matching cause', () =>
        pipe(
          I.interrupt,
          I.catchJustCause(
            (c): M.Maybe<I.IO<unknown, never, boolean>> => (Ca.interrupted(c) ? M.just(I.succeed(true)) : M.nothing())
          ),
          I.sandbox,
          I.map((b) => assert_(b, isTrue))
        )
      ),
      testIO("fails if cause doesn't match", () =>
        pipe(
          I.fiberId(),
          I.chain((fiberId) =>
            pipe(
              I.interrupt,
              I.catchJustCause(
                (c): M.Maybe<I.IO<unknown, never, boolean>> =>
                  Ca.interrupted(c) ? M.nothing() : M.just(I.succeed(true))
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
      'catchJustDefect',
      testIO('recovers from some defects', () => {
        const s  = 'division by zero'
        const io = I.halt(new IllegalArgumentError(s, '#'))
        return pipe(
          io,
          I.catchJustDefect((e) =>
            isIllegalArgumentError(e) ? M.just(I.succeed(e.message)) : M.nothing<I.IO<unknown, never, string>>()
          ),
          I.map(assert(equalTo(s)))
        )
      }),
      testIO('leaves the rest', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.halt(t)
        return pipe(
          io,
          I.catchJustDefect((e) =>
            isIllegalStateError(e) ? M.just(I.succeed(e.message)) : M.nothing<I.IO<unknown, never, string>>()
          ),
          I.result,
          I.map(assert(halts(deepStrictEqualTo(t))))
        )
      }),
      testIO('leaves errors', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.fail(t)
        return pipe(
          io,
          I.catchJustDefect((e) =>
            isIllegalArgumentError(e) ? M.just(I.succeed(e.message)) : M.nothing<I.IO<unknown, never, string>>()
          ),
          I.result,
          I.map(assert(fails(deepStrictEqualTo(t))))
        )
      }),
      testIO('leaves values', () => {
        const t  = new IllegalArgumentError('division by zero', '#')
        const io = I.succeed(t)
        return pipe(
          io,
          I.catchJustDefect((e) =>
            isIllegalArgumentError(e) ? M.just(I.succeed(e.message)) : M.nothing<I.IO<unknown, never, string>>()
          ),
          I.map(assert(deepStrictEqualTo(t)))
        )
      })
    ),
    suite(
      'collect',
      testIO('returns failure ignoring value', () =>
        I.gen(function* (_) {
          const goodCase = yield* _(
            pipe(
              exactlyOnce(
                0,
                I.collect(
                  () => 'value was not 0',
                  (n) => (n === 0 ? M.just(n) : M.nothing())
                )
              ),
              I.sandbox,
              I.either
            )
          )
          const badCase = yield* _(
            pipe(
              exactlyOnce(
                1,
                I.collect(
                  () => 'value was not 0',
                  (n) => (n === 0 ? M.just(n) : M.nothing())
                )
              ),
              I.sandbox,
              I.either,
              I.map(E.match(flow(Ca.failureOrCause, E.left), E.right))
            )
          )
          return all(
            pipe(goodCase, assert(isRight(equalTo(0)))),
            pipe(badCase, assert(isLeft(isLeft(equalTo('value was not 0')))))
          )
        })
      )
    ),
    suite(
      'collectAllPar',
      testIO('returns the list in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = I.collectAllPar(list)
        return assertIO_(res, equalTo(Ch.make(1, 2, 3)))
      }),
      testIO('is referentially transparent', () =>
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
      testIO('returns results in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = I.collectAllParN(2)(list)
        return assertIO_(res, equalTo(Ch.make(1, 2, 3)))
      })
    ),
    suite(
      'collectAllUnitParN',
      testIO('preserves failures', () => {
        const tasks = A.replicate(10, I.fail(new RuntimeException('')))
        return assertIO_(pipe(I.collectAllUnitParN(5)(tasks), I.swap), anything)
      })
    ),
    suite(
      'collectIO',
      testIO('returns failure ignoring value', () =>
        I.gen(function* (_) {
          const goodCase = yield* _(
            pipe(
              exactlyOnce(
                0,
                I.collectIO(
                  () => 'Predicate failed!',
                  (n): M.Maybe<I.UIO<number>> => (n === 0 ? M.just(I.succeed(0)) : M.nothing())
                )
              ),
              I.sandbox,
              I.either
            )
          )
          const partialBadCase = yield* _(
            pipe(
              exactlyOnce(
                0,
                I.collectIO(
                  () => 'Predicate failed!',
                  (n): M.Maybe<I.FIO<string, never>> => (n === 0 ? M.just(I.fail('Partial failed!')) : M.nothing())
                )
              ),
              I.sandbox,
              I.either,
              I.map(E.match(flow(Ca.failureOrCause, E.left), E.right))
            )
          )
          const badCase = yield* _(
            pipe(
              exactlyOnce(
                1,
                I.collectIO(
                  () => 'Predicate failed!',
                  (n): M.Maybe<I.UIO<number>> => (n === 0 ? M.just(I.succeed(n)) : M.nothing())
                )
              ),
              I.sandbox,
              I.either,
              I.map(E.match(flow(Ca.failureOrCause, E.left), E.right))
            )
          )
          return all(
            pipe(goodCase, assert(isRight(equalTo(0)))),
            pipe(partialBadCase, assert(isLeft(isLeft(equalTo('Partial failed!'))))),
            pipe(badCase, assert(isLeft(isLeft(equalTo('Predicate failed!')))))
          )
        })
      )
    ),
    testIO('subsumeEither', () =>
      checkM(Gen.alphaNumericString(), (str) => {
        const ioEither = I.succeed(E.right(str))
        const res      = I.subsumeEither(ioEither)
        return assertIO_(res, equalTo(str))
      })
    ),
    suite(
      'foreachPar',
      testIO('runs single task', () => {
        const as      = [2]
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.single(4)))
      }),
      testIO('runs two tasks', () => {
        const as      = [2, 3]
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.make(4, 6)))
      }),
      testIO('runs many tasks', () => {
        const as      = Ch.range(1, 1000)
        const results = I.foreachPar_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Ch.map_(as, (n) => 2 * n)))
      }),
      testIO('runs a task that fails', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.fail('boom!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom!'))
      }),
      testIO('runs two failed tasks', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.fail('boom1!') : n === 8 ? I.fail('bool2!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom1!')['||'](equalTo('boom2!')))
      }),
      testIO('runs a task that is interrupted', () => {
        const as      = Ch.range(1, 10)
        const results = pipe(
          as,
          I.foreachPar((n) => (n === 5 ? I.interrupt : I.succeed(2 * n))),
          I.result
        )
        return assertIO_(results, isInterrupted)
      }),
      testIO('runs a task that halts', () => {
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
