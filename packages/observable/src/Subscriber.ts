import type { Observer } from './Observer'

import { isObject } from '@principia/base/prelude'

import { isSubscription, Subscription } from './Subscription'
import { noop, reportUnhandledError } from './util'

export const SubscriberTypeId = Symbol()
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
      this.destination!.next(value)
    }
  }
  fail(err: E) {
    if (!this.isStopped) {
      this.destination!.fail(err)
    }
  }
  defect(err: unknown) {
    if (!this.isStopped) {
      this.isStopped = true
      try {
        this.destination!.defect(err)
      } finally {
        this.unsubscribe()
      }
    }
  }
  complete() {
    if (!this.isStopped) {
      this.isStopped = true
      try {
        this.destination!.complete()
      } finally {
        this.unsubscribe()
      }
    }
  }

  unsubscribe(): void {
    if (!this.closed) {
      this.isStopped = true
      super.unsubscribe()
      this.destination = null
    }
  }
}

export class SafeSubscriber<E, A> extends Subscriber<E, A> {
  constructor(destination?: Partial<Observer<E, A>>) {
    super()
    let next: ((value: A) => void) | undefined       = undefined
    let fail: ((err: E) => void) | undefined         = undefined
    let complete: (() => void) | undefined           = undefined
    let defect: ((err: unknown) => void) | undefined = undefined
    if (destination) {
      ({ next, fail, complete, defect } = destination)
    }
    next     = next?.bind(destination)
    fail     = fail?.bind(destination)
    complete = complete?.bind(destination)
    defect   = defect?.bind(destination)
    if (defect) {
      this.destination = {
        next: next ? wrapDefectHandler(next, defect) : noop,
        fail: fail ? wrapDefectHandler(fail, defect) : noop,
        complete: complete ? wrapDefectHandler(complete, defect) : noop,
        defect: wrapThrowHandler(defect)
      }
    } else {
      this.destination = {
        next: next ? wrapThrowHandler(next) : noop,
        fail: wrapThrowHandler(fail ?? defaultErrorHandler),
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
  fail: defaultErrorHandler,
  complete: noop,
  defect: defaultErrorHandler
}

export function isSubscriber(u: unknown): u is Subscriber<any, any> {
  return isObject(u) && SubscriberTypeId in u
}
