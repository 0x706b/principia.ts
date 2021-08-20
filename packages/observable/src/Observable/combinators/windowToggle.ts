import type { Observable, ObservableInput } from '../core'

import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'
import { Subscription } from '../../Subscription'
import { arrayRemove, noop } from '../../util'
import { from } from '../core'

export function windowToggle_<E, A, E1, B, E2>(
  fa: Observable<E, A>,
  openings: ObservableInput<E1, B>,
  closingSelector: (openValue: B) => ObservableInput<E2, any>
): Observable<E1 | E2, Observable<E, A>> {
  return operate_(fa, (source, subscriber) => {
    const windows: Subject<E, A>[] = []

    const handleError = (err: unknown) => {
      while (0 < windows.length) {
        windows.shift()!.defect(err)
      }
      subscriber.defect(err)
    }

    from(openings).subscribe(
      operatorSubscriber(subscriber, {
        next: (openValue) => {
          const window = new Subject<E, A>()
          windows.push(window)
          const closingSubscription = new Subscription()
          const closeWindow         = () => {
            arrayRemove(windows, window)
            window.complete()
            closingSubscription.unsubscribe()
          }

          let closingNotifier: Observable<E2, any>

          try {
            closingNotifier = from(closingSelector(openValue))
          } catch (err) {
            handleError(err)
            return
          }

          subscriber.next(window.asObservable())

          closingSubscription.add(
            closingNotifier.subscribe(
              operatorSubscriber(subscriber, {
                next: closeWindow,
                complete: noop,
                fail: closeWindow,
                defect: handleError
              })
            )
          )
        },
        complete: noop
      })
    )

    source.subscribe(
      operatorSubscriber(
        subscriber,
        {
          next: (value) => {
            const windowsCopy = windows.slice()
            for (const window of windowsCopy) {
              window.next(value)
            }
          },
          fail: (err) => {
            const windowsCopy = windows.slice()
            for (const window of windowsCopy) {
              window.fail(err)
            }
          },
          complete: () => {
            while (0 < windows.length) {
              windows.shift()!.complete()
            }
            subscriber.complete()
          },
          defect: handleError
        },
        () => {
          while (0 < windows.length) {
            windows.shift()!.unsubscribe()
          }
        }
      )
    )
  })
}

export function windowToggle<E1, B, E2>(
  openings: ObservableInput<E1, B>,
  closingSelector: (openValue: B) => ObservableInput<E2, any>
): <E, A>(fa: Observable<E, A>) => Observable<E1 | E2, Observable<E, A>> {
  return (fa) => windowToggle_(fa, openings, closingSelector)
}
