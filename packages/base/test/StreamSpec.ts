import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Managed'
import * as P from '@principia/base/Promise'
import * as S from '@principia/base/Stream'
import { assertCompletes, DefaultRunnableSpec, suite, testM } from '@principia/test'

class StreamSpec extends DefaultRunnableSpec {
  spec = suite(
    'StreamSpec',
    suite(
      'distributedWithDynamic',
      testM('ensures no race between subscription and stream end', () =>
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
              P.make<never, void>(),
              I.bind((onEnd) =>
                pipe(subscribe, S.ensuring(onEnd.succeed()), S.runDrain, I.fork, (_) =>
                  _['*>'](onEnd.await)['*>'](S.runDrain(subscribe))['*>'](I.succeed(assertCompletes))
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
