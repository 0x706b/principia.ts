import type { Action } from '../Action'
import type { Subscriber } from '../Subscriber'
import type { Subscription } from '../Subscription'

import { isObject } from '@principia/base/prelude'

import { AsyncAction } from '../Action'

export interface SchedulerLike extends TimestampProvider {
  schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription
}

export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription
}

export interface TimestampProvider {
  now(): number
}

export const dateTimestampProvider: TimestampProvider = {
  now() {
    return Date.now()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Scheduler
 * -------------------------------------------------------------------------------------------------
 */

export const SchedulerTypeId = Symbol.for('@principia/observable/Scheduler')
export type SchedulerTypeId = typeof SchedulerTypeId

export class Scheduler implements SchedulerLike {
  readonly [SchedulerTypeId]: SchedulerTypeId = SchedulerTypeId

  public now: () => number
  constructor(private actionConstructor: typeof Action, now: () => number = Scheduler.now) {
    this.now = now
  }
  schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription {
    return new this.actionConstructor(this, work).schedule(state, delay)
  }
  public static now: () => number = dateTimestampProvider.now
}

export function isScheduler(u: unknown): u is Scheduler {
  return isObject(u) && SchedulerTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * AsyncScheduler
 * -------------------------------------------------------------------------------------------------
 */

export class AsyncScheduler extends Scheduler {
  public actions: Array<AsyncAction<any>> = []

  private active         = false
  private scheduled: any = undefined

  constructor(actionConstructor: typeof Action, now: () => number = Scheduler.now) {
    super(actionConstructor, now)
  }

  flush(action: AsyncAction<any>) {
    const { actions } = this

    if (this.active) {
      actions.push(action)
      return
    }

    let error: unknown
    this.active = true

    do {
      if ((error = action.execute(action.state))) {
        break
      }
      // eslint-disable-next-line no-param-reassign
    } while ((action = actions.shift()!))

    this.active = false

    if (error) {
      // eslint-disable-next-line no-param-reassign
      while ((action = actions.shift()!)) {
        action.unsubscribe()
      }
      throw error
    }
  }
}

export const asyncScheduler = new AsyncScheduler(AsyncAction)

export function caughtSchedule<E, A>(
  subscriber: Subscriber<E, A>,
  scheduler: SchedulerLike,
  execute: (this: SchedulerAction<any>) => void,
  delay = 0
): Subscription {
  const subscription = scheduler.schedule(function () {
    try {
      execute.call(this)
    } catch (err) {
      subscriber.defect(err)
    }
  }, delay)
  subscriber.add(subscription)
  return subscription
}
