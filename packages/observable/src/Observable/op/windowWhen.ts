import type { Subscriber } from '../../Subscriber'
import type { Observable, ObservableInput } from '../core'

import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'
import { from } from '../core'

export function windowWhen_<E, A, E1>(
  fa: Observable<E, A>,
  closingSelector: () => ObservableInput<E1, any>
): Observable<E1, Observable<E, A>> {
  return operate_(fa, (source, subscriber) => {
    let window: Subject<E, A> | null
    let closingSubscriber: Subscriber<E1, any> | undefined

    const handleError = (err: any) => {
      window!.defect(err)
      subscriber.defect(err)
    }

    const openWindow = () => {
      closingSubscriber?.unsubscribe()
      window?.complete()
      window = new Subject()
      subscriber.next(window.asObservable())
      let closingNotifier: Observable<E1, any>
      try {
        closingNotifier = from(closingSelector())
      } catch (err) {
        handleError(err)
        return
      }

      closingNotifier.subscribe(
        (closingSubscriber = operatorSubscriber(subscriber, {
          next: openWindow,
          complete: openWindow,
          defect: handleError
        }))
      )
    }

    openWindow()

    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => window!.next(value),
          error: (err) => window!.error(err),
          complete: () => {
            window!.complete()
            subscriber.complete()
          },
          defect: handleError
        },
        () => {
          closingSubscriber?.unsubscribe()
          window = null!
        }
      )
    )
  })
}

export function windowWhen<E1>(
  closingSelector: () => ObservableInput<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E1, Observable<E, A>> {
  return (fa) => windowWhen_(fa, closingSelector)
}
