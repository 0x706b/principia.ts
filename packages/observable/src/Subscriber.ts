import type { Observer } from './Observer'

import { isFunction, isObject } from '@principia/base/prelude'

import { noop, reportUnhandledError } from './internal/util'
import { isSubscription, Subscription } from './Subscription'

export const SubscriberTypeId = Symbol.for('@principia/observable/Subscriber')
export type SubscriberTypeId = typeof SubscriberTypeId

export class Subscriber<E, A> extends Subscription implements Observer<E, A> {
  readonly [SubscriberTypeId]: SubscriberTypeId = SubscriberTypeId

  private isStopped = false
  protected observer: Subscriber<E, A> | Observer<E, A> | null

  constructor(observer?: Subscriber<E, A> | Observer<E, A>) {
    super()
    if (observer) {
      this.observer = observer
      if (isSubscription(observer)) {
        observer.add(this)
      }
    } else {
      this.observer = EMPTY_OBSERVER
    }
  }
  next(value: A) {
    if (!this.isStopped) {
      this._next(value)
    }
  }
  error(err: E) {
    if (!this.isStopped) {
      this._error(err)
    }
  }
  defect(err: unknown) {
    if (!this.isStopped) {
      this.isStopped = true
      this._defect(err)
    }
  }
  complete() {
    if (!this.isStopped) {
      this.isStopped = true
      this._complete()
    }
  }
  unsubscribe(): void {
    if (!this.closed) {
      this.isStopped = true
      super.unsubscribe()
      this.observer = null
    }
  }

  _next(value: A) {
    this.observer!.next(value)
  }
  _error(err: E) {
    this.observer!.error(err)
  }
  _defect(err: unknown) {
    try {
      this.observer!.defect(err)
    } finally {
      this.unsubscribe()
    }
  }
  _complete() {
    try {
      this.observer!.complete()
    } finally {
      this.unsubscribe()
    }
  }
}

export class SafeSubscriber<E, A> extends Subscriber<E, A> {
  constructor(observer?: Partial<Observer<E, A>> | ((value: A) => void)) {
    super()
    let next: ((value: A) => void) | undefined       = undefined
    let error: ((err: E) => void) | undefined        = undefined
    let complete: (() => void) | undefined           = undefined
    let defect: ((err: unknown) => void) | undefined = undefined
    if (isFunction(observer)) {
      next = observer
    } else if (observer) {
      ({ next, error, complete, defect } = observer)
      next     = next?.bind(observer)
      error    = error?.bind(observer)
      complete = complete?.bind(observer)
      defect   = defect?.bind(observer)
    }
    if (defect) {
      this.observer = {
        next: next ? wrapDefectHandler(next, defect) : noop,
        error: error ? wrapDefectHandler(error, defect) : noop,
        complete: complete ? wrapDefectHandler(complete, defect) : noop,
        defect: wrapThrowHandler(defect)
      }
    } else {
      this.observer = {
        next: next ? wrapThrowHandler(next) : noop,
        error: wrapThrowHandler(error ?? defaultErrorHandler),
        complete: complete ? wrapThrowHandler(complete) : noop,
        defect: wrapThrowHandler(defaultErrorHandler)
      }
    }
  }
}

function wrapDefectHandler(handler: (arg?: any) => void, onDefect: (err: unknown) => void) {
  return (...args: any[]) => {
    try {
      handler(...args)
    } catch (err) {
      onDefect(err)
    }
  }
}

function wrapThrowHandler(handler: (arg?: any) => void) {
  return (...args: any[]) => {
    try {
      handler(...args)
    } catch (err) {
      reportUnhandledError(err)
    }
  }
}

function defaultErrorHandler(error: any) {
  throw error
}

export const EMPTY_OBSERVER: Readonly<Observer<any, any>> & { closed: true } = {
  closed: true,
  next: noop,
  error: defaultErrorHandler,
  complete: noop,
  defect: defaultErrorHandler
}

export function isSubscriber(u: unknown): u is Subscriber<any, any> {
  return isObject(u) && SubscriberTypeId in u
}
