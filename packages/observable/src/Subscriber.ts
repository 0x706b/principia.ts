import type { Observer } from './Observer'

import { isFunction, isObject } from '@principia/base/prelude'

import { isSubscription, Subscription } from './Subscription'
import { noop, reportUnhandledError } from './util'

export const SubscriberTypeId = Symbol.for('@principia/observable/Subscriber')
export type SubscriberTypeId = typeof SubscriberTypeId

export class Subscriber<E, A> extends Subscription implements Observer<E, A> {
  readonly [SubscriberTypeId]: SubscriberTypeId = SubscriberTypeId

  private isStopped = false
  protected destination: Subscriber<E, A> | Observer<E, A> | null

  constructor(destination?: Subscriber<E, A> | Observer<E, A>) {
    super()
    if (destination) {
      this.destination = destination
      if (isSubscription(destination)) {
        destination.add(this)
      }
    } else {
      this.destination = EMPTY_OBSERVER
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
      this.destination = null
    }
  }

  _next(value: A) {
    this.destination!.next(value)
  }
  _error(err: E) {
    this.destination!.error(err)
  }
  _defect(err: unknown) {
    try {
      this.destination!.defect(err)
    } finally {
      this.unsubscribe()
    }
  }
  _complete() {
    try {
      this.destination!.complete()
    } finally {
      this.unsubscribe()
    }
  }
}

export class SafeSubscriber<E, A> extends Subscriber<E, A> {
  constructor(destination?: Partial<Observer<E, A>> | ((value: A) => void)) {
    super()
    let next: ((value: A) => void) | undefined       = undefined
    let error: ((err: E) => void) | undefined        = undefined
    let complete: (() => void) | undefined           = undefined
    let defect: ((err: unknown) => void) | undefined = undefined
    if(isFunction(destination)) {
      next = destination
    } else if (destination) {
      ({ next, error, complete, defect } = destination)
      next     = next?.bind(destination)
      error    = error?.bind(destination)
      complete = complete?.bind(destination)
      defect   = defect?.bind(destination)
    }
    if (defect) {
      this.destination = {
        next: next ? wrapDefectHandler(next, defect) : noop,
        error: error ? wrapDefectHandler(error, defect) : noop,
        complete: complete ? wrapDefectHandler(complete, defect) : noop,
        defect: wrapThrowHandler(defect)
      }
    } else {
      this.destination = {
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
