import type { ExecutedSpec } from './ExecutedSpec'
import type { Spec } from './Spec'
import type { TestAspect } from './TestAspect'
import type { TestLogger } from './TestLogger'
import type { TestRunner } from './TestRunner'
import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type { URIO } from '@principia/base/IO'

import * as A from '@principia/base/collection/immutable/Array'

export abstract class AbstractRunnableSpec<R, E> {
  abstract aspects: ReadonlyArray<TestAspect<R, any>>
  abstract runner: TestRunner<R, E>
  abstract spec: Spec<R, E>

  get _run(): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return this.runSpec(this.spec)
  }

  runSpec(spec: Spec<R, E>): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return this.runner.run(A.foldl_(this.aspects, spec, (b, a) => b['@@'](a)))
  }

  get platform() {
    return this.runner.platform
  }
}
