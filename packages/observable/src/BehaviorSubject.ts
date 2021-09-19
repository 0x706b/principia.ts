import type { Subscriber } from './Subscriber'

import { Subject } from './Subject'

export class BehaviorSubject<E, A> extends Subject<E, A> {
  constructor(private _value: A) {
    super()
  }

  get value(): A {
    return this.getValue()
  }

  getValue(): A {
    const { hasError, thrownError, _value } = this
    if (hasError) {
      throw thrownError
    }
    this.throwIfClosed()
    return _value
  }

  protected subscribeInternal(subscriber: Subscriber<E, A>) {
    const subscription = super.subscribe(subscriber)
    !subscription.closed && subscriber.next(this._value)
    return subscription
  }

  next(value: A): void {
    super.next((this._value = value))
  }
}
