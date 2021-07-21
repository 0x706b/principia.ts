import type { Subscribable } from './Observable/core'
import type { Observer } from './Observer'
import type { Operator } from './Operator'
import type { Subscriber } from './Subscriber'
import type { SubscriptionLike } from './Subscription'

import * as E from '@principia/base/Either'

import { Observable } from './Observable/core'
import { EMPTY_SUBSCRIPTION, Subscription } from './Subscription'
import { arrayRemove } from './util'

export interface SubjectLike<E, A> extends Observer<E, A>, Subscribable<E, A> {}

export class Subject<E, A> extends Observable<E, A> implements SubscriptionLike {
  closed = false
  protected observers: Array<Observer<E, A>> = []
  protected isStopped        = false
  protected hasError         = false
  protected thrownError: any = null
  constructor() {
    super()
  }

  lift<E1, B>(operator: Operator<E1, B>): Observable<E1, B> {
    const subject    = new AnonymousSubject(this, this)
    subject.operator = operator as any
    return subject as any
  }

  next(value: A) {
    if (!this.isStopped) {
      const copy = this.observers.slice()
      for (const observer of copy) {
        observer.next(value)
      }
    }
  }

  fail(err: E) {
    if (!this.isStopped) {
      const copy = this.observers.slice()
      for (const observer of copy) {
        observer.fail(err)
      }
    }
  }

  defect(err: unknown) {
    if (!this.isStopped) {
      this.hasError       = this.isStopped = true
      this.thrownError    = err
      const { observers } = this
      while (observers.length) {
        observers.shift()!.defect(err)
      }
    }
  }

  complete() {
    if (!this.isStopped) {
      this.isStopped      = true
      const { observers } = this
      while (observers.length) {
        observers.shift()!.complete()
      }
    }
  }

  unsubscribe() {
    this.isStopped = this.closed = true
    this.observers = null!
  }

  get observed() {
    return this.observers?.length > 0
  }

  protected subscribeInternal(subscriber: Subscriber<E, A>) {
    this.checkFinalizedStatuses(subscriber)
    const { hasError, isStopped, observers } = this
    return hasError || isStopped
      ? EMPTY_SUBSCRIPTION
      : (observers.push(subscriber), new Subscription(() => arrayRemove(observers, subscriber)))
  }

  protected checkFinalizedStatuses(subscriber: Subscriber<any, any>) {
    const { hasError, thrownError, isStopped } = this
    if (hasError) {
      subscriber.defect(thrownError)
    } else if (isStopped) {
      subscriber.complete()
    }
  }

  asObservable(): Observable<E, A> {
    const observable: any = new Observable<E, A>()
    observable.source     = this
    return observable
  }
}

export class AnonymousSubject<E, A> extends Subject<E, A> {
  constructor(protected destination?: Observer<E, A>, source?: Observable<E, A>) {
    super()
    this.source = source
  }
  next(value: A) {
    this.destination?.next?.(value)
  }
  fail(err: E) {
    this.destination?.fail?.(err)
  }
  defect(err: unknown) {
    this.destination?.defect?.(err)
  }
  complete() {
    this.destination?.complete?.()
  }

  protected subscribeInternal<E, A>(subscriber: Subscriber<E, A>) {
    return this.source?.subscribe(subscriber) ?? EMPTY_SUBSCRIPTION
  }
}

export class AsyncSubject<E, A> extends Subject<E, A> {
  private value: E.Either<E, A> | null = null
  private hasValue                     = false
  private isComplete                   = false
  protected checkFinalizedStatuses(subscriber: Subscriber<E, A>) {
    const { hasError, hasValue, value, thrownError, isStopped, isComplete } = this
    if (hasError) {
      subscriber.defect(thrownError)
    } else if (isStopped || isComplete) {
      hasValue &&
        E.match_(
          value!,
          (e) => subscriber.fail(e),
          (a) => subscriber.next(a)
        )
      subscriber.complete()
    }
  }

  next(value: A) {
    if (!this.isStopped) {
      this.value    = E.right(value)
      this.hasValue = true
    }
  }

  fail(err: E) {
    if (!this.isStopped) {
      this.value    = E.left(err)
      this.hasValue = true
    }
  }

  complete() {
    const { hasValue, value, isComplete } = this
    if (!isComplete) {
      this.isComplete = true
      hasValue &&
        E.match_(
          value!,
          (e) => super.fail(e),
          (a) => super.next(a)
        )
      super.complete()
    }
  }
}
