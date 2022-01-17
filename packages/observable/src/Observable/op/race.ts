import type { Subscriber } from '../../Subscriber'
import type { Subscription } from '../../Subscription'
import type { ErrorOf, ObservableInput, TypeOf } from '../core'

import { operatorSubscriber } from '../../Operator'
import { from, Observable } from '../core'

export function race<O extends ReadonlyArray<ObservableInput<any, any>>>(
  ...sources: O
): Observable<ErrorOf<O[number]>, TypeOf<O[number]>> {
  return sources.length === 1 ? from(sources[0]) : new Observable(raceInit(sources))
}

export function raceInit<E, A>(sources: ReadonlyArray<ObservableInput<E, A>>) {
  return (subscriber: Subscriber<E, A>) => {
    let subscriptions: Subscription[] = []
    for (let i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
      subscriptions.push(
        from(sources[i]).subscribe(
          operatorSubscriber(subscriber, {
            next: (value) => {
              if (subscriptions) {
                for (let s = 0; s < subscriptions.length; s++) {
                  s !== i && subscriptions[s].unsubscribe()
                }
                subscriptions = null!
              }
              subscriber.next(value)
            }
          })
        )
      )
    }
  }
}
