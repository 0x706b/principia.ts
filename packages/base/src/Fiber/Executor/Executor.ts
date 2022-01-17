import type * as M from '../../Maybe'
import type { ExecutionMetrics } from './ExecutionMetrics'

import { RejectedExecutionError } from '../../Error'

export abstract class Executor {
  abstract unsafeMetrics: M.Maybe<ExecutionMetrics>
  abstract unsafeSubmit(runnable: () => void): boolean
  abstract yieldOpCount: number

  unsafeSubmitAndYield(runnable: () => void): boolean {
    return this.unsafeSubmit(runnable)
  }

  unsafeSubmitAndYieldOrThrow(runnable: () => void): void {
    if (!this.unsafeSubmitAndYield(runnable)) {
      throw new RejectedExecutionError('Unable to run submitted thunk')
    }
  }

  unsafeSubmitOrThrow(runnable: () => void): void {
    if (!this.unsafeSubmit(runnable)) {
      throw new RejectedExecutionError('Unable to run submitted thunk')
    }
  }
}
