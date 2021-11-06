import { pipe } from '@principia/base/function'
import * as F from '@principia/base/Future'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Managed'
import * as S from '@principia/base/Stream'
import { assertCompletes, DefaultRunnableSpec, suite, testIO } from '@principia/test'

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
              I.map(([_, queue]) => S.collectWhileSuccess(S.fromQueue(queue))),
              S.unwrap
            )
            return pipe(
              F.make<never, void>(),
              I.chain((onEnd) =>
                pipe(subscribe, S.ensuring(F.succeed_(onEnd, undefined)), S.runDrain, I.fork, (_) =>
                  pipe(
                    _,
                    I.crossSecond(F.await(onEnd)),
                    I.crossSecond(S.runDrain(subscribe)),
                    I.crossSecond(I.succeed(assertCompletes))
                  )
                )
              )
            )
          })
        )
      )
    )
  )
}

export default new StreamSpec()
