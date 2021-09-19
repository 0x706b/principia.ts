import type { Subscribable } from './Observable/core'
import type { Observer } from './Observer'
import type { Operator } from './Operator'
import type { Subscriber } from './Subscriber'
import type { Finalizer, SubscriptionLike } from './Subscription'

import * as E from '@principia/base/Either'

import { arrayRemove } from './internal/util'
import { Observable } from './Observable/core'
import { EMPTY_SUBSCRIPTION, Subscription } from './Subscription'

export interface SubjectLike<E, A> extends Observer<E, A>, Subscribable<E, A> {}

export class Subject<E, A> extends Observable<E, A> implements SubscriptionLike {
  closed = false
  /** @internal */
  protected observers: Array<Observer<E, A>> = []
  /** @internal */
  protected isStopped = false
  /** @internal */
  protected hasError = false
  /** @internal */
  protected thrownError: any = null

  constructor() {
    super()
  }

  /** @internal */
  lift<E1, B>(operator: Operator<E1, B>): Observable<E1, B> {
    const subject    = new AnonymousSubject(this, this)
    subject.operator = operator as any
    return subject as any
  }

  next(value: A) {
    this.throwIfClosed()
    if (!this.isStopped) {
      const copy = this.observers.slice()
      for (const observer of copy) {
        observer.next(value)
      }
    }
  }

  error(err: E) {
    this.throwIfClosed()
    if (!this.isStopped) {
      const copy = this.observers.slice()
      for (const observer of copy) {
        observer.error(err)
      }
    }
  }

  defect(err: unknown) {
    this.throwIfClosed()
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
    this.throwIfClosed()
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

  /** @internal */
  protected throwIfClosed() {
    if (this.closed) {
      throw new Error('Object Unsubscribed')
    }
  }

  /** @internal */
  protected trySubscribe(subscriber: Subscriber<E, A>): Finalizer {
    this.throwIfClosed()
    return super.trySubscribe(subscriber)
  }

  /** @internal */
  protected subscribeInternal(subscriber: Subscriber<E, A>): Subscription {
    this.throwIfClosed()
    this.checkFinalizedStatuses(subscriber)
    return this.innerSubscribe(subscriber)
  }

  /** @internal */
  protected innerSubscribe(subscriber: Subscriber<E, A>): Subscription {
    const { hasError, isStopped, observers } = this
    return hasError || isStopped
      ? EMPTY_SUBSCRIPTION
      : (observers.push(subscriber), new Subscription(() => arrayRemove(observers, subscriber)))
  }

  /** @internal */
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
  error(err: E) {
    this.destination?.error?.(err)
  }
  defect(err: unknown) {
    this.destination?.defect?.(err)
  }
  complete() {
    this.destination?.complete?.()
  }

  /** @internal */
  protected subscribeInternal<E, A>(subscriber: Subscriber<E, A>) {
    return this.source?.subscribe(subscriber) ?? EMPTY_SUBSCRIPTION
  }
}

export class AsyncSubject<E, A> extends Subject<E, A> {
  private value: E.Either<E, A> | null = null
  private hasValue                     = false
  private isComplete                   = false

  /** @internal */
  protected checkFinalizedStatuses(subscriber: Subscriber<E, A>) {
    const { hasError, hasValue, value, thrownError, isStopped, isComplete } = this
    if (hasError) {
      subscriber.defect(thrownError)
    } else if (isStopped || isComplete) {
      hasValue &&
        E.match_(
          value!,
          (e) => subscriber.error(e),
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

  error(err: E) {
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
          (e) => super.error(e),
          (a) => super.next(a)
        )
      super.complete()
    }
  }
}
