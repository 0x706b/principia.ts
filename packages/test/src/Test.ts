import type { TestResult } from './Render'

import { flow, pipe } from '@principia/base/function'
import * as IO from '@principia/base/IO'
import * as M from '@principia/base/Maybe'

import * as BA from './FreeBooleanAlgebra'
import * as TF from './TestFailure'
import * as TS from './TestSuccess'

export type Test<R, E> = IO.IO<R, TF.TestFailure<E>, TS.TestSuccess>

export function fromAssertion<R, E>(assertion: () => IO.IO<R, E, TestResult>): Test<R, E> {
  return pipe(
    IO.defer(assertion),
    IO.matchCauseIO(
      flow(TF.failCause, IO.fail),
      flow(
        BA.failures,
        M.match(() => IO.succeed(new TS.Succeeded(BA.success(undefined))), flow(TF.assertion, IO.fail))
      )
    )
  )
}
