import type { Action } from './Action'
import type { TimestampProvider } from './internal/timestampProvider'
import type { Subscriber } from './Subscriber'
import type { Subscription } from './Subscription'

import { isObject } from '@principia/base/prelude'

import { dateTimestampProvider } from './internal/timestampProvider'

export interface SchedulerLike extends TimestampProvider {
  schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription
}

export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription
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
