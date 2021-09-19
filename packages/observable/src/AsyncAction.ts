import type { AsyncScheduler } from './AsyncScheduler'
import type { SchedulerAction } from './Scheduler'
import type { Subscription } from './Subscription'

import { Action } from './Action'
import { intervalProvider } from './internal/intervalProvider'
import { arrayRemove } from './internal/util'

export class AsyncAction<A> extends Action<A> {
  public id: any
  public state?: A
  // @ts-expect-error Property has no initializer and is not definitely assigned in the constructor
  public delay: number
  protected pending = false

  constructor(protected scheduler: AsyncScheduler, protected work: (this: SchedulerAction<A>, state?: A) => void) {
    super(scheduler, work)
  }

  schedule(state?: A, delay = 0): Subscription {
    if (this.closed) {
      return this
    }

    this.state = state

    const id        = this.id
    const scheduler = this.scheduler

    if (id != null) {
      this.id = this.recycleAsyncId(scheduler, id, delay)
    }

    this.pending = true
    this.delay   = delay
    this.id      = this.id || this.requestAsyncId(scheduler, this.id, delay)

    return this
  }

  protected requestAsyncId(scheduler: AsyncScheduler, _id: any, delay = 0): any {
    return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay)
  }

  protected recycleAsyncId(_scheduler: AsyncScheduler, id: any, delay: number | null = 0): any {
    if (delay != null && this.delay === delay && this.pending === false) {
      return id
    }
    intervalProvider.clearInterval(id)
    return undefined
  }

  public execute(state: A, delay: number): unknown {
    if (this.closed) {
      throw new Error('executing a cancelled action')
    }

    this.pending = false
    const error  = this.executeInternal(state, delay)
    if (error) {
      return error
    } else if (this.pending === false && this.id != null) {
      this.id = this.recycleAsyncId(this.scheduler, this.id, null)
    }
  }

  protected executeInternal(state: A, _delay: number): unknown {
    let errored = false
    let errorValue: unknown
    try {
      this.work(state)
    } catch (e) {
      errored    = true
      errorValue = e ? e : new Error('Scheduled action threw falsy error')
    }
    if (errored) {
      this.unsubscribe()
      return errorValue
    }
  }

  unsubscribe() {
    if (!this.closed) {
      const { id, scheduler } = this
      const { actions }       = scheduler

      this.work    = this.state = this.scheduler = null!
      this.pending = false

      arrayRemove(actions, this)
      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, null)
      }

      this.delay = null!
      super.unsubscribe()
    }
  }
}
