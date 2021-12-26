import type { FiberRefs } from '@principia/base/FiberRefs'

import * as Fi from '@principia/base/Fiber'
import * as FR from '@principia/base/FiberRef'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as Q from '@principia/base/Queue'
import { assert, isTrue, suite, testIO } from '@principia/test'
import { DefaultRunnableSpec } from '@principia/test/DefaultRunnableSpec'

class FiberRefsSpec extends DefaultRunnableSpec {
  spec = suite(
    'FiberRefs',
    testIO('propagate FiberRef values across fiber boundaries', () =>
      I.gen(function* (_) {
        const fiberRef = yield* _(FR.make(false))
        const queue    = yield* _(Q.makeUnbounded<FiberRefs>())
        const producer = yield* _(
          pipe(
            fiberRef,
            FR.set(true),
            I.apSecond(
              pipe(
                I.getFiberRefs,
                I.chain((fiberRefs) => Q.offer_(queue, fiberRefs))
              )
            ),
            I.fork
          )
        )
        const consumer = yield* _(pipe(Q.take(queue), I.chain(I.setFiberRefs), I.apSecond(FR.get(fiberRef)), I.fork))
        yield* _(Fi.join(producer))
        const value = yield* _(Fi.join(consumer))
        return pipe(value, assert(isTrue))
      })
    )
  )
}

export default new FiberRefsSpec()
