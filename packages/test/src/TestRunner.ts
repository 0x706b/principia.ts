import type { Annotations } from './Annotation'
import type { TestReporter } from './api'
import type { ExecutedSpec } from './ExecutedSpec'
import type { XSpec } from './Spec'
import type { TestExecutor } from './TestExecutor'
import type { Has } from '@principia/base/Has'
import type { URIO } from '@principia/base/IO'
import type { Clock } from '@principia/base/IO/Clock'
import type { Platform } from '@principia/base/IO/Fiber'
import type { Layer } from '@principia/base/IO/Layer'

import { parallelN } from '@principia/base/ExecutionStrategy'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import { ClockTag, LiveClock } from '@principia/base/IO/Clock'
import { ConsoleTag, LiveConsole } from '@principia/base/IO/Console'
import * as L from '@principia/base/IO/Layer'

import { defaultTestAnnotationRenderer, report } from './Render'
import { TestLogger } from './TestLogger'

export class TestRunner<R, E> {
  constructor(
    readonly executor: TestExecutor<R>,
    readonly platform: Platform<unknown> = I.defaultRuntime.platform,
    readonly reporter: TestReporter<E> = report(defaultTestAnnotationRenderer),
    readonly bootstrap: Layer<unknown, never, Has<TestLogger> & Has<Clock>> = L.succeed(ConsoleTag)(new LiveConsole())
      ['>=>'](TestLogger.fromConsole)
      ['+++'](L.succeed(ClockTag)(new LiveClock()))
  ) {
    this.run = this.run.bind(this)
  }

  run(spec: XSpec<R & Has<Annotations>, E>): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return pipe(
      this.executor.run(spec, parallelN(10)),
      I.timed,
      I.chain(([duration, results]) => I.as_(this.reporter(duration, results), results))
    )
  }
}
