import type { Observer } from '../../Observer'
import type { SchedulerLike } from '../../Scheduler'
import type { Observable } from '../core'

import { asyncScheduler } from '../../AsyncScheduler'
import { popScheduler } from '../../internal/args'
import { arrayRemove } from '../../internal/util'
import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'
import { Subscription } from '../../Subscription'

interface WindowRecord<E, A> {
  seen: number
  window: Subject<E, A>
  subs: Subscription
}

export function windowTime_<E, A>(
  fa: Observable<E, A>,
  windowTimeSpan: number,
  scheduler?: SchedulerLike
): Observable<never, Observable<E, A>>
export function windowTime_<E, A>(
  fa: Observable<E, A>,
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: SchedulerLike
): Observable<never, Observable<E, A>>
export function windowTime_<E, A>(
  fa: Observable<E, A>,
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: SchedulerLike
): Observable<never, Observable<E, A>>
export function windowTime_<E, A>(
  fa: Observable<E, A>,
  windowTimeSpan: number,
  ...args: any[]
): Observable<never, Observable<E, A>> {
  const scheduler = popScheduler(args) ?? asyncScheduler
  const windowCreationInterval: number | null = args[0] ?? null
  const maxWindowSize: number                 = args[1] || Infinity

  return operate_(fa, (source, subscriber) => {
    let windowRecords: WindowRecord<E, A>[] | null = []
    let restartOnClose = false
    const closeWindow  = (record: { window: Subject<E, A>, subs: Subscription }) => {
      const { window, subs } = record
      window.complete()
      subs.unsubscribe()
      arrayRemove(windowRecords, record)
      restartOnClose && startWindow()
    }
    const startWindow = () => {
      if (windowRecords) {
        const subs = new Subscription()
        subscriber.add(subs)
        const window = new Subject<E, A>()
        const record = {
          window,
          subs,
          seen: 0
        }
        windowRecords.push(record)
        subscriber.next(window.asObservable())
        subs.add(scheduler.schedule(() => closeWindow(record), windowTimeSpan))
      }
    }

    windowCreationInterval !== null && windowCreationInterval >= 0
      ? subscriber.add(
          scheduler.schedule(function () {
            startWindow()
            !this.closed && subscriber.add(this.schedule(null, windowCreationInterval))
          }, windowCreationInterval)
        )
      : (restartOnClose = true)

    startWindow()

    const loop = (cb: (record: WindowRecord<E, A>) => void) => windowRecords!.slice().forEach(cb)

    const terminate = (cb: (consumer: Observer<never, any>) => void) => {
      loop(({ window }) => cb(window))
      cb(subscriber)
      subscriber.unsubscribe()
    }

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => {
          loop((record) => {
            record.window.next(value)
            maxWindowSize <= ++record.seen && closeWindow(record)
          })
        },
        error: (err) => {
          loop((record) => {
            record.window.error(err)
            maxWindowSize <= ++record.seen && closeWindow(record)
          })
        },
        complete: () => terminate((consumer) => consumer.complete()),
        defect: (err) => terminate((consumer) => consumer.defect(err))
      })
    )

    return () => {
      windowRecords = null!
    }
  })
}

export function windowTime(
  windowTimeSpan: number,
  scheduler?: SchedulerLike
): <E, A>(fa: Observable<E, A>) => Observable<never, Observable<E, A>>
export function windowTime(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: SchedulerLike
): <E, A>(fa: Observable<E, A>) => Observable<never, Observable<E, A>>
export function windowTime(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: SchedulerLike
): <E, A>(fa: Observable<E, A>) => Observable<never, Observable<E, A>>
export function windowTime(
  windowTimeSpan: number,
  ...args: any[]
): <E, A>(fa: Observable<E, A>) => Observable<never, Observable<E, A>> {
  return (fa) => windowTime_(fa, windowTimeSpan, ...args)
}
