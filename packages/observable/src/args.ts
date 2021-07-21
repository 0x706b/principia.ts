import type { SchedulerLike } from './Scheduler'

import { isScheduler } from './Scheduler'

function last<A>(arr: A[]): A | undefined {
  return arr[arr.length - 1]
}

export function popNumber(args: any[], defaultValue: number): number {
  return typeof last(args) === 'number' ? args.pop()! : defaultValue
}

export function popScheduler(args: any[]): SchedulerLike | undefined {
  return isScheduler(last(args)) ? args.pop() : undefined
}
