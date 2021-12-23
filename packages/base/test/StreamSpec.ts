import type { Has } from '@principia/base/Has'
import type { TestResult } from '@principia/test/Render'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import { Clock } from '@principia/base/Clock'
import * as Fi from '@principia/base/Fiber'
import { pipe } from '@principia/base/function'
import * as F from '@principia/base/Future'
import * as I from '@principia/base/IO'
import * as Ex from '@principia/base/IO/Exit'
import * as M from '@principia/base/Managed'
import * as Mb from '@principia/base/Maybe'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import * as S from '@principia/base/Stream'
import { assertCompletes, assertIO, DefaultRunnableSpec, equalTo, suite, testIO } from '@principia/test'
import { TestClock } from '@principia/test/environment/TestClock'

interface ChunkCoordination<A> {
  readonly queue: Q.UQueue<Ex.Exit<Mb.Maybe<never>, C.Chunk<A>>>
  readonly offer: I.UIO<boolean>
  readonly proceed: I.UIO<void>
  readonly awaitNext: I.UIO<void>
}

export function assertWithChunkCoordination<A>(
  chunks: ReadonlyArray<C.Chunk<A>>,
  assertion: (c: ChunkCoordination<A>) => I.IO<Has<Clock> & Has<TestClock>, never, TestResult>
): I.IO<Has<Clock> & Has<TestClock>, never, TestResult> {
  return I.gen(function* (_) {
    const q   = yield* _(Q.makeUnbounded<Ex.Exit<Mb.Maybe<never>, C.Chunk<A>>>())
    const ps  = yield* _(Q.makeUnbounded<void>())
    const ref = yield* _(
      Ref.make<ReadonlyArray<ReadonlyArray<Ex.Exit<Mb.Maybe<never>, C.Chunk<A>>>>>(
        pipe(
          chunks,
          A.init,
          Mb.getOrElse((): ReadonlyArray<C.Chunk<A>> => []),
          A.map((chunk) => [Ex.succeed(chunk)]),
          A.concat(
            pipe(
              chunks,
              A.last,
              Mb.map((chunk) => [[Ex.succeed(chunk), Ex.fail(Mb.nothing())]]),
              Mb.getOrElse(() => [[]])
            )
          )
        )
      )
    )
    const chunkCoordination: ChunkCoordination<A> = {
      queue: q,
      offer: pipe(
        ref,
        Ref.modify((chunks) =>
          pipe(
            chunks,
            A.unprepend,
            Mb.getOrElse(
              () =>
                [[], []] as [
                  ReadonlyArray<Ex.Exit<Mb.Maybe<never>, C.Chunk<A>>>,
                  ReadonlyArray<ReadonlyArray<Ex.Exit<Mb.Maybe<never>, C.Chunk<A>>>>
                ]
            )
          )
        ),
        I.chain((exits) => Q.offerAll_(q, exits))
      ),
      proceed: pipe(ps, Q.offer(undefined), I.asUnit),
      awaitNext: Q.take(ps)
    }
    return yield* _(assertion(chunkCoordination))
  })
}

class StreamSpec extends DefaultRunnableSpec {
  spec = suite(
    'StreamSpec',
    suite(
      'distributedWithDynamic',
      testIO('ensures no race between subscription and stream end', () =>
        pipe(
          S.empty,
          S.distributedWithDynamic(1, () => I.succeed(() => true)),
          M.use((add) => {
            const subscribe = pipe(
              add,
              I.map(([_, queue]) => S.collectWhileSuccess(S.fromQueue_(queue))),
              S.unwrap
            )
            return pipe(
              F.make<never, void>(),
              I.chain((onEnd) =>
                pipe(subscribe, S.ensuring(F.succeed_(onEnd, undefined)), S.runDrain, I.fork, (_) =>
                  pipe(
                    _,
                    I.apSecond(F.await(onEnd)),
                    I.apSecond(S.runDrain(subscribe)),
                    I.apSecond(I.succeed(assertCompletes))
                  )
                )
              )
            )
          })
        )
      )
    ),
    suite(
      'debounce',
      testIO('should drop earlier chunks within waitTime', () =>
        assertWithChunkCoordination([C.make(1), C.make(3, 4), C.make(5), C.make(6, 7)], (c) => {
          const stream = pipe(
            S.fromQueue_(c.queue),
            S.collectWhileSuccess,
            S.debounce(1000),
            S.tap(() => c.proceed)
          )

          return pipe(
            I.gen(function* (_) {
              const fiber = yield* _(pipe(stream, S.runCollect, I.fork))
              yield* _(I.fork(c.offer))
              yield* _(pipe(Clock.sleep(500), I.apSecond(c.offer), I.fork))
              yield* _(pipe(Clock.sleep(2000), I.apSecond(c.offer), I.fork))
              yield* _(pipe(Clock.sleep(2500), I.apSecond(c.offer), I.fork))
              yield* _(TestClock.adjust(3500))
              return yield* _(Fi.join(fiber))
            }),
            assertIO(equalTo(C.make(C.make(3, 4), C.make(6, 7))))
          )
        })
      )
    )
  )
}

export default new StreamSpec()
