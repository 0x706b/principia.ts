import * as A from '@principia/base/Array'
import * as Ca from '@principia/base/Cause'
import * as Co from '@principia/base/collection/immutable/Conc'
import * as E from '@principia/base/Either'
import { IllegalArgumentError, isIllegalArgumentError, isIllegalStateError } from '@principia/base/Error'
import { RuntimeException } from '@principia/base/Exception'
import * as Ex from '@principia/base/Exit'
import * as Fi from '@principia/base/Fiber'
import * as FiberId from '@principia/base/Fiber/FiberId'
import { decrement, flow, identity, increment, pipe } from '@principia/base/function'
import * as Fu from '@principia/base/Future'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as N from '@principia/base/number'
import * as Ref from '@principia/base/Ref'
import * as S from '@principia/base/Set'
import {
  all,
  anything,
  assert,
  assert_,
  assertCompletes,
  assertIO,
  assertIO_,
  checkM,
  deepStrictEqualTo,
  DefaultRunnableSpec,
  equalTo,
  fails,
  halts,
  isInterrupted,
  isJust,
  isLeft,
  isRight,
  isTrue,
  not,
  suite,
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
          I.fiberId,
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
      'sequenceIterableC',
      testIO('returns the list in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = I.sequenceIterableC(list)
        return assertIO_(res, equalTo(Co.make(1, 2, 3)))
      }),
      testIO('is referentially transparent', () =>
        I.gen(function* (_) {
          const counter      = yield* _(Ref.make(0))
          const op           = Ref.getAndUpdate_(counter, (n) => n + 1)
          const ops3         = I.sequenceIterableC([op, op, op])
          const ops6         = I.crossC_(ops3, ops3)
          const [res1, res2] = yield* _(ops6)
          return assert_(res1, not(equalTo(res2)))
        })
      )
    ),
    suite(
      'sequenceIterableCN',
      testIO('returns results in the same order', () => {
        const list = [1, 2, 3].map(I.succeed)
        const res  = pipe(I.sequenceIterableC(list), I.withConcurrency(2))
        return assertIO_(res, equalTo(Co.make(1, 2, 3)))
      })
    ),
    suite(
      'sequenceIterableUnitCN',
      testIO('preserves failures', () => {
        const tasks = A.replicate(10, I.fail(new RuntimeException('')))
        return assertIO_(pipe(I.sequenceIterableUnitC(tasks), I.withConcurrency(5), I.swap), anything)
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
    suite(
      'fromExit',
      testIO('lifts exit into IO', () => {
        const id    = new FiberId.Runtime(0, 123)
        const error = ExampleError
        return I.gen(function* (_) {
          const completed   = yield* _(I.fromExit(Ex.succeed(1)))
          const interrupted = yield* _(pipe(I.fromExit(Ex.interrupt(id)), I.result))
          const terminated  = yield* _(pipe(I.fromExit(Ex.halt(error)), I.result))
          const failed      = yield* _(pipe(I.fromExit(Ex.fail(error)), I.result))
          return all(
            pipe(completed, assert(equalTo(1))),
            pipe(interrupted, assert(isInterrupted)),
            pipe(terminated, assert(halts(equalTo(error)))),
            pipe(failed, assert(fails(equalTo(error))))
          )
        })
      })
    ),
    suite(
      'repeatUntil',
      testIO('repeats until condition is true', () =>
        I.gen(function* (_) {
          const inp = yield* _(Ref.make(10))
          const out = yield* _(Ref.make(0))
          yield* _(
            pipe(
              inp,
              Ref.updateAndGet(decrement),
              I.apFirst(pipe(out, Ref.update(increment))),
              I.repeatUntil((n) => n === 0)
            )
          )
          const result = yield* _(out.get)
          return pipe(result, assert(equalTo(10)))
        })
      ),
      testIO('always evaluates effect at least once', () =>
        I.gen(function* (_) {
          const ref = yield* _(Ref.make(0))
          yield* _(
            pipe(
              ref,
              Ref.update(increment),
              I.repeatUntil(() => true)
            )
          )
          const result = yield* _(ref.get)
          return pipe(result, assert(equalTo(1)))
        })
      )
    ),
    suite(
      'repeatUntilIO',
      testIO('repeats until effectful condition is true', () =>
        I.gen(function* (_) {
          const inp = yield* _(Ref.make(10))
          const out = yield* _(Ref.make(0))
          yield* _(
            pipe(
              inp,
              Ref.updateAndGet(decrement),
              I.apFirst(pipe(out, Ref.update(increment))),
              I.repeatUntilIO((v) => I.succeed(v === 0))
            )
          )
          const result = yield* _(out.get)
          return pipe(result, assert(equalTo(10)))
        })
      ),
      testIO('always evaluates effect at least once', () =>
        I.gen(function* (_) {
          const ref = yield* _(Ref.make(0))
          yield* _(
            pipe(
              ref,
              Ref.update(increment),
              I.repeatUntilIO(() => I.succeed(true))
            )
          )
          const result = yield* _(Ref.get(ref))
          return pipe(result, assert(equalTo(1)))
        })
      )
    ),
    suite(
      'repeatWhile',
      testIO('repeats while condition is true', () =>
        I.gen(function* (_) {
          const inp = yield* _(Ref.make(10))
          const out = yield* _(Ref.make(0))
          yield* _(
            pipe(
              inp,
              Ref.updateAndGet(decrement),
              I.apFirst(pipe(out, Ref.update(increment))),
              I.repeatWhile((n) => n >= 0)
            )
          )
          const result = yield* _(out.get)
          return pipe(result, assert(equalTo(11)))
        })
      ),
      testIO('always evaluates effect at least once', () =>
        I.gen(function* (_) {
          const ref = yield* _(Ref.make(0))
          yield* _(
            pipe(
              ref,
              Ref.update(increment),
              I.repeatWhile(() => false)
            )
          )
          const result = yield* _(ref.get)
          return pipe(result, assert(equalTo(1)))
        })
      )
    ),
    suite(
      'repeatWhileIO',
      testIO('repeats while effectful condition is true', () =>
        I.gen(function* (_) {
          const inp = yield* _(Ref.make(10))
          const out = yield* _(Ref.make(0))
          yield* _(
            pipe(
              inp,
              Ref.updateAndGet(decrement),
              I.apFirst(pipe(out, Ref.update(increment))),
              I.repeatWhileIO((v) => I.succeed(v >= 0))
            )
          )
          const result = yield* _(out.get)
          return pipe(result, assert(equalTo(11)))
        })
      ),
      testIO('always evaluates effect at least once', () =>
        I.gen(function* (_) {
          const ref = yield* _(Ref.make(0))
          yield* _(
            pipe(
              ref,
              Ref.update(increment),
              I.repeatWhileIO(() => I.succeed(false))
            )
          )
          const result = yield* _(Ref.get(ref))
          return pipe(result, assert(equalTo(1)))
        })
      )
    ),
    suite(
      'eventually',
      testIO('succeeds eventually', () => {
        const effect = (ref: Ref.URef<number>) =>
          pipe(
            ref,
            Ref.get,
            I.chain((n) => (n < 10 ? pipe(ref, Ref.update(increment), I.apSecond(I.fail('Ouch'))) : I.succeed(n)))
          )
        const test = I.gen(function* (_) {
          const ref = yield* _(Ref.make(0))
          return yield* _(pipe(ref, effect, I.eventually))
        })
        return assertIO_(test, equalTo(10))
      })
    ),
    suite(
      'filter',
      testIO('filters a collection using an effectual predicate', () => {
        const as = [2, 4, 6, 3, 5, 6]
        return I.gen(function* (_) {
          const ref     = yield* _(Ref.make(Co.empty<number>()))
          const results = yield* _(
            pipe(
              as,
              I.filter((a) => pipe(ref, Ref.update(Co.append(a)), I.as(a % 2 === 0)))
            )
          )
          const effects = yield* _(ref.get)
          return all(
            pipe(results, assert(equalTo(Co.make(2, 4, 6, 6)))),
            pipe(effects, assert(equalTo(Co.make(2, 4, 6, 3, 5, 6))))
          )
        })
      }),
      testIO('filters a set using an effectual predicate', () => {
        const as = new Set([2, 3, 4, 5, 6, 7])
        return I.gen(function* (_) {
          const ref     = yield* _(Ref.make(S.empty<number>()))
          const results = yield* _(
            pipe(
              as,
              I.filter((a) => pipe(ref, Ref.update(S.insert(N.Eq)(a)), I.as(a % 2 === 0)))
            )
          )
          const effects = yield* _(pipe(ref, Ref.get, I.map(S.map(N.Eq)(increment))))
          return all(
            pipe(results, assert(equalTo(Co.make(2, 4, 6)))),
            pipe(effects, assert(deepStrictEqualTo(new Set([3, 4, 5, 6, 7, 8]))))
          )
        })
      })
    ),
    suite(
      'foreach',
      testIO('returns the list of results', () =>
        pipe(
          [1, 2, 3, 4, 5, 6],
          I.foreach((a) => I.succeed(a + 1)),
          assertIO(equalTo(Co.make(2, 3, 4, 5, 6, 7)))
        )
      ),
      testIO('both evaluates effects and returns the list of results in the same order', () => {
        const list: ReadonlyArray<string> = ['1', '2', '3']
        return I.gen(function* (_) {
          const ref = yield* _(Ref.make(A.empty<string>()))
          const res = yield* _(
            pipe(
              list,
              I.foreach((x) =>
                pipe(
                  ref,
                  Ref.update((xs) => [...xs, x]),
                  I.apSecond(I.succeedLazy(() => parseInt(x)))
                )
              )
            )
          )
          const effects = yield* _(Ref.get(ref))
          return all(pipe(effects, assert(deepStrictEqualTo(list))), pipe(res, assert(equalTo(Co.make(1, 2, 3)))))
        })
      })
    ),
    testIO('subsumeEither', () =>
      checkM(Gen.alphaNumericString(), (str) => {
        const ioEither = I.succeed(E.right(str))
        const res      = I.subsumeEither(ioEither)
        return assertIO_(res, equalTo(str))
      })
    ),
    suite(
      'foreachC',
      testIO('runs single task', () => {
        const as      = [2]
        const results = I.foreachC_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Co.single(4)))
      }),
      testIO('runs two tasks', () => {
        const as      = [2, 3]
        const results = I.foreachC_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Co.make(4, 6)))
      }),
      testIO('runs many tasks', () => {
        const as      = Co.range(1, 1000)
        const results = I.foreachC_(as, (n) => I.succeed(2 * n))
        return assertIO_(results, equalTo(Co.map_(as, (n) => 2 * n)))
      }),
      testIO('runs a task that fails', () => {
        const as      = Co.range(1, 10)
        const results = pipe(
          as,
          I.foreachC((n) => (n === 5 ? I.fail('boom!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom!'))
      }),
      testIO('runs two failed tasks', () => {
        const as      = Co.range(1, 10)
        const results = pipe(
          as,
          I.foreachC((n) => (n === 5 ? I.fail('boom1!') : n === 8 ? I.fail('bool2!') : I.succeed(2 * n))),
          I.swap
        )
        return assertIO_(results, equalTo('boom1!')['||'](equalTo('boom2!')))
      }),
      testIO('runs a task that is interrupted', () => {
        const as      = Co.range(1, 10)
        const results = pipe(
          as,
          I.foreachC((n) => (n === 5 ? I.interrupt : I.succeed(2 * n))),
          I.result
        )
        return assertIO_(results, isInterrupted)
      }),
      testIO('runs a task that halts', () => {
        const as      = Co.range(1, 10)
        const results = pipe(
          as,
          I.foreachC((n) => (n === 5 ? I.halt('boom!') : I.succeed(2 * n))),
          I.result
        )
        return assertIO_(results, halts(equalTo('boom!')))
      })
    ),
    suite(
      'foreachCN',
      testIO('returns the list of results in the appropriate order', () => {
        const list = [1, 2, 3]
        const res  = pipe(
          I.foreachC_(list, (x) => I.succeedLazy(() => x.toString())),
          I.withConcurrency(2)
        )
        return assertIO_(res, equalTo(Co.make('1', '2', '3')))
      }),
      testIO('works on large lists', () => {
        const n   = 10
        const seq = Co.range(0, 100000)
        const res = pipe(I.foreachC_(seq, I.succeed), I.withConcurrency(n))
        return assertIO_(res, equalTo(seq))
      }),
      testIO('runs effects in parallel', () => {
        const io = I.gen(function* (_) {
          const p = yield* _(Fu.make<never, void>())
          yield* _(pipe([I.never, Fu.succeed_(p, undefined)], I.foreachC(identity), I.withConcurrency(2), I.fork))
          yield* _(Fu.await(p))
          return true
        })
        return assertIO_(io, isTrue)
      }),
      testIO('propagates error', () => {
        const ints = [1, 2, 3, 4, 5, 6]
        const odds = pipe(
          I.foreachC_(ints, (n) => (n % 2 !== 0 ? I.succeed(n) : I.fail('not odd'))),
          I.withConcurrency(4)
        )
        return assertIO_(I.either(odds), isLeft(equalTo('not odd')))
      }),
      testIO('interrupts effects on first failure', () => {
        const actions = [I.never, I.succeed(1), I.fail('C')]
        const io      = pipe(I.foreachC_(actions, identity), I.withConcurrency(4))
        return assertIO_(I.either(io), isLeft(equalTo('C')))
      })
    ),
    suite(
      'forkAll',
      testIO('returns the list of results in the same order', () => {
        const list = [1, 2, 3].map((n) => I.succeedLazy(() => n))
        const res  = pipe(I.forkAll(list), I.chain(Fi.join))
        return assertIO_(res, equalTo(Co.make(1, 2, 3)))
      }),
      testIO('happy path', () => {
        const list = A.range(1, 1000)
        return pipe(
          list,
          A.map((n) => I.succeedLazy(() => n)),
          I.forkAll,
          I.chain(Fi.join),
          assertIO(equalTo(Co.range(1, 1000)))
        )
      }),
      testIO('empty input', () => {
        return assertIO_(pipe(I.forkAll(A.empty<I.IO<unknown, never, void>>()), I.chain(Fi.join)), equalTo(Co.empty()))
      }),
      testIO('propagates failures', () => {
        const boom = new Error()
        const fail = I.fail(boom)
        return I.gen(function* (_) {
          const fiber  = yield* _(I.forkAll([fail]))
          const result = yield* _(pipe(Fi.join(fiber), I.swap))
          return assert_(result, equalTo(boom))
        })
      }),
      testIO('propagates defects', () => {
        const boom       = new Error('boom')
        const halt       = I.halt(boom)
        const joinDefect = (fiber: Fi.Fiber<never, any>) => pipe(fiber, Fi.join, I.sandbox, I.swap)
        return I.gen(function* (_) {
          const fiber1 = yield* _(I.forkAll([halt]))
          const fiber2 = yield* _(I.forkAll([halt, I.succeed(42)]))
          const fiber3 = yield* _(I.forkAll([halt, I.succeed(42), I.never]))

          const result1 = yield* _(joinDefect(fiber1))
          const result2 = yield* _(joinDefect(fiber2))
          const result3 = yield* _(joinDefect(fiber3))

          return all(
            pipe(result1, assert(equalTo(Ca.halt(boom)))),
            pipe(result2, assert(equalTo(Ca.halt(boom))))['||'](
              all(
                pipe(result2, Ca.haltOption, assert(isJust(equalTo(boom as unknown)))),
                pipe(result2, Ca.interrupted, assert(isTrue))
              )
            ),
            pipe(result3, Ca.haltOption, assert(isJust(equalTo(boom as unknown)))),
            pipe(result3, Ca.interrupted, assert(isTrue))
          )
        })
      })
    ),
    suite(
      'forkWithErrorHandler',
      testIO('calls provided function when task fails', () =>
        I.gen(function* (_) {
          const f = yield* _(Fu.make<never, void>())
          yield* _(
            pipe(
              I.fail(undefined),
              I.forkWithErrorHandler(() => pipe(f, Fu.succeed<void>(undefined), I.asUnit))
            )
          )
          yield* _(Fu.await(f))
          return assertCompletes
        })
      )
    )
  )
}

export default new IOSpec()
