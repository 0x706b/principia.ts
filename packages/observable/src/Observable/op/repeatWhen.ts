import type { Subscription } from '../../Subscription'
import type { Observable } from '../core'

import { operate_, operatorSubscriber } from '../../Operator'
import { Subject } from '../../Subject'

export function repeatWhen_<E, A, E1>(
  fa: Observable<E, A>,
  notifier: (notifications: Observable<never, void>) => Observable<E1, any>
): Observable<E | E1, A> {
  return operate_(fa, (source, subscriber) => {
    let innerSub: Subscription | null
    let syncResub = false
    let completions$: Subject<never, void>
    let isNotifierComplete = false
    let isMainComplete     = false

    const checkComplete = () => isMainComplete && isNotifierComplete && (subscriber.complete(), true)

    const getCompletionSubject = () => {
      if (!completions$) {
        completions$ = new Subject()
        notifier(completions$).subscribe(
          operatorSubscriber(subscriber, {
            next: () => {
              if (innerSub) {
                loop()
              } else {
                syncResub = true
              }
            },
            complete: () => {
              isNotifierComplete = true
              checkComplete()
            }
          })
        )
      }
      return completions$
    }

    const loop = () => {
      isMainComplete = false
      innerSub       = source.subscribe(
        operatorSubscriber(subscriber, {
          complete: () => {
            isMainComplete = true
            !checkComplete() && getCompletionSubject().next()
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

export function repeatWhen<E1>(
  notifier: (notifications: Observable<never, void>) => Observable<E1, any>
): <E, A>(fa: Observable<E, A>) => Observable<E | E1, A> {
  return (fa) => repeatWhen_(fa, notifier)
}
