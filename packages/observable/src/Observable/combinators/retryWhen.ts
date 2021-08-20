import type { Subscription } from '../../Subscription'
import type { Observable } from '../core'

import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'

export function retryWhen_<E, A, E1>(
  fa: Observable<E, A>,
  notifier: (defects: Observable<never, any>) => Observable<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let innerSub: Subscription | null
    let syncResub = false
    let defects$: Subject<never, any>

    const loop = () => {
      innerSub = source.subscribe(
        operatorSubscriber(subscriber, {
          defect: (err) => {
            if (!defects$) {
              defects$ = new Subject()
              notifier(defects$).subscribe(
                operatorSubscriber(subscriber, {
                  next: () => (innerSub ? loop() : (syncResub = true))
                })
              )
            }
            if (defects$) {
              defects$.next(err)
            }
          }
        })
      )
      if (syncResub) {
        innerSub.unsubscribe()
        innerSub  = null
        syncResub = false
        loop()
      }
    }

    loop()
  })
}

export function retryWhen<E1>(
  notifier: (errors: Observable<never, any>) => Observable<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => retryWhen_(fa, notifier)
}
