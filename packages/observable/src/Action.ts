/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Scheduler, SchedulerAction } from './Scheduler'

import { Subscription } from './Subscription'

export class Action<A> extends Subscription {
  constructor(scheduler: Scheduler, work: (this: SchedulerAction<A>, state?: A) => void) {
    super()
  }

  public schedule(state?: A, delay = 0): Subscription {
    return this
  }
}
