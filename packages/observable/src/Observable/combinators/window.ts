import type { Observable } from '../core'

import { noop } from '../../internal/util'
import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'

export function window_<E, A, E1>(
  fa: Observable<E, A>,
  windowBoundaries: Observable<E1, any>
): Observable<E1, Observable<E, A>> {
  return operate_(fa, (source, subscriber) => {
    let windowSubject: Subject<E, A> = new Subject()
    subscriber.next(windowSubject.asObservable())

    const errorHandler = (err: unknown) => {
      windowSubject.defect(err)
      subscriber.defect(err)
    }

    source.subscribe(
      operatorSubscriber(subscriber, {
        next: (value) => windowSubject.next(value),
        error: (err) => windowSubject.error(err),
        complete: () => {
          windowSubject.complete()
          subscriber.complete()
        },
        defect: errorHandler
      })
    )

    windowBoundaries.subscribe(
      operatorSubscriber(subscriber, {
        next: () => {
          windowSubject.complete()
          subscriber.next((windowSubject = new Subject()))
        },
        complete: noop,
        defect: errorHandler
      })
    )

    return () => {
      windowSubject.unsubscribe()
      windowSubject = null!
    }
  })
}

export function window<E1>(
  windowBoundaries: Observable<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E1, Observable<E, A>> {
  return (fa) => window_(fa, windowBoundaries)
}
