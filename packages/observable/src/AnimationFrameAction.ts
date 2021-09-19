import type { AnimationFrameScheduler } from './AnimationFrameScheduler'
import type { SchedulerAction } from './Scheduler'

import { AsyncAction } from './AsyncAction'
import { animationFrameProvider } from './internal/animationFrameProvider'

export class AnimationFrameAction<A> extends AsyncAction<A> {
  constructor(
    protected scheduler: AnimationFrameScheduler,
    protected work: (this: SchedulerAction<A>, state?: A) => void
  ) {
    super(scheduler, work)
  }

  protected requestAsyncId(scheduler: AnimationFrameScheduler, id?: any, delay = 0): any {
    if (delay !== null && delay > 0) {
      return super.requestAsyncId(scheduler, id, delay)
    }
    scheduler.actions.push(this)
    return (
      scheduler._scheduled ||
      (scheduler._scheduled = animationFrameProvider.requestAnimationFrame(() => scheduler.flush(undefined)))
    )
  }

  protected recycleAsyncId(scheduler: AnimationFrameScheduler, id?: any, delay = 0): any {
    if ((delay != null && delay > 0) || (delay == null && this.delay > 0)) {
      super.recycleAsyncId(scheduler, id, delay)
    }
    if (scheduler.actions.length === 0) {
      animationFrameProvider.cancelAnimationFrame(id)
      scheduler._scheduled = undefined
    }
    return undefined
  }
}
