import type { TestEnvironment } from './environment/TestEnvironment'

import { defaultTestRunner } from './api'
import { RunnableSpec } from './RunnableSpec'
import { timeoutWarning } from './TestAspect'

export abstract class DefaultRunnableSpec extends RunnableSpec<TestEnvironment, any> {
  aspects = [timeoutWarning(60000)]
  runner  = defaultTestRunner
}
