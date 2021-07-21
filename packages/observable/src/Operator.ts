import type { Observable } from './Observable/core'
import type { Observer } from './Observer'
import type { Finalizer } from './Subscription'

import { Subscriber } from './Subscriber'

export interface Operator<E, A> {
  call(subscriber: Subscriber<E, A>, source: any): Finalizer
}

export class OperatorSubscriber<E, A> extends Subscriber<E, A> {
  constructor(destination: Subscriber<any, any>, observer: Partial<Observer<E, A>>, private onFinalize?: () => void) {
    super(destination)
    this.next = observer.next
      ? function (this: OperatorSubscriber<E, A>, value: A) {
          try {
            observer.next!(value)
          } catch (err) {
            destination.defect(err)
          }
        }
      : super.next
    this.fail = observer.fail
      ? function (this: OperatorSubscriber<E, A>, error: E) {
          try {
            observer.fail!(error)
          } catch (err) {
            destination.defect(err)
          }
        }
      : super.fail
    this.complete = observer.complete
      ? function (this: OperatorSubscriber<E, A>) {
          try {
            observer.complete!()
          } catch (err) {
            destination.defect(err)
          } finally {
            this.unsubscribe()
          }
        }
      : super.complete
    this.defect = observer.defect
      ? function (this: OperatorSubscriber<E, A>, defect: unknown) {
          try {
            observer.defect!(defect)
          } catch (err) {
            destination.defect(err)
          } finally {
            this.unsubscribe
          }
        }
      : super.defect
  }

  unsubscribe() {
    const { closed } = this
    super.unsubscribe()
    !closed && this.onFinalize?.()
  }
}

export function operatorSubscriber<E, A, E1, A1>(
  destination: Subscriber<E1, A1>,
  observer: Partial<Observer<E, A>>,
  onFinalize?: () => void
): OperatorSubscriber<E, A> {
  return new OperatorSubscriber(destination, observer, onFinalize)
}

export function operate_<E, A, E1, A1>(
  source: Observable<E, A>,
  f: (source: Observable<E, A>, subscriber: Subscriber<E1, A1>) => (() => void) | void
): Observable<E1, A1> {
  return source.lift(function (this: Subscriber<E1, A1>, liftedSource: Observable<E, A>) {
    f(liftedSource, this)
  })
}
