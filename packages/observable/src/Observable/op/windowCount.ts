import type { Observable } from '../core'

import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'

export function windowCount_<E, A>(
  fa: Observable<E, A>,
  windowSize: number,
  startWindowEvery = 0
): Observable<never, Observable<E, A>> {
  const startEvery = startWindowEvery > 0 ? startWindowEvery : windowSize

  return operate_(fa, (source, subscriber) => {
    let windows = [new Subject<E, A>()]
    let count   = 0

    subscriber.next(windows[0].asObservable())

    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            for (const window of windows) {
              window.next(value)
            }

            const c = count - windowSize + 1
            if (c >= 0 && c % startEvery === 0) {
              windows.shift()!.complete()
            }

            if (++count && startEvery === 0) {
              const window = new Subject<E, A>()
              windows.push(window)
              subscriber.next(window.asObservable())
            }
          },
          complete: () => {
            while (windows.length > 0) {
              windows.shift()!.complete()
            }
            subscriber.complete()
          },
          error: (err) => {
            for (const window of windows) {
              window.error(err)
            }

            const c = count - windowSize + 1
            if (c >= 0 && c % startEvery === 0) {
              windows.shift()!.complete()
            }

            if (++count && startEvery === 0) {
              const window = new Subject<E, A>()
              windows.push(window)
              subscriber.next(window.asObservable())
            }
          },
          defect: (err) => {
            while (windows.length > 0) {
              windows.shift()!.defect(err)
            }
            subscriber.defect(err)
          }
        },
        () => {
          windows = null!
        }
      )
    )
  })
}

export function windowCount(
  windowSize: number,
  startWindowEvery = 0
): <E, A>(fa: Observable<E, A>) => Observable<never, Observable<E, A>> {
  return (fa) => windowCount_(fa, windowSize, startWindowEvery)
}
