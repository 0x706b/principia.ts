import { isObject } from '@principia/base/prelude'

import { arrayRemove } from './util'

export interface Unsubscribable {
  readonly unsubscribe: () => void
}

export interface SubscriptionLike extends Unsubscribable {
  readonly closed: boolean
}

export type Finalizer = Unsubscribable | (() => void) | void

export const SubscriptionTypeId = Symbol('@principia/observable/Subscription')
export type SubscriptionTypeId = typeof SubscriptionTypeId

export class Subscription implements SubscriptionLike {
  readonly [SubscriptionTypeId]: SubscriptionTypeId = SubscriptionTypeId

  closed = false
  private finalizers: Set<Finalizer> | null   = null
  private parents: Array<Subscription> | null = null

  constructor(private initialFinalizer?: () => void) {}

  unsubscribe(): void {
    let errors: unknown[] | undefined

    if (!this.closed) {
      this.closed = true

      const { parents, initialFinalizer, finalizers } = this

      if (parents) {
        this.parents = null
        for (const parent of parents) {
          parent.remove(this)
        }
      }

      if (initialFinalizer) {
        try {
          initialFinalizer()
        } catch (e) {
          errors = e instanceof UnsubscribeError ? e.errors : [e]
        }
      }

      if (finalizers) {
        this.finalizers = null
        for (const finalizer of finalizers) {
          try {
            executeFinalizer(finalizer)
          } catch (e) {
            errors = errors ?? []
            if (e instanceof UnsubscribeError) {
              errors = [...errors, ...e.errors]
            } else {
              errors.push(e)
            }
          }
        }
      }
    }

    if (errors) {
      throw new UnsubscribeError(errors)
    }
  }

  add(finalizer: Finalizer): void {
    if (finalizer && finalizer !== this) {
      if (this.closed) {
        executeFinalizer(finalizer)
      } else {
        if (finalizer instanceof Subscription) {
          if (finalizer.closed || finalizer.hasParent(this)) {
            return
          }
          finalizer.addParent(this)
        }
        (this.finalizers = this.finalizers ?? new Set()).add(finalizer)
      }
    }
  }

  private hasParent(parent: Subscription) {
    const parentage = this.parents
    return parentage ? parentage.includes(parent) : false
  }

  private addParent(parent: Subscription) {
    const parentage = this.parents
    this.parents    = parentage ? (parentage.push(parent), parentage) : [parent]
  }

  private removeParent(parent: Subscription) {
    const parentage = this.parents
    parentage && arrayRemove(parentage, parent)
  }

  remove(finalizer: Finalizer): void {
    this.finalizers?.delete(finalizer)

    if (isSubscription(finalizer)) {
      finalizer.removeParent(this)
    }
  }
}

export function isSubscription(u: unknown): u is Subscription {
  return isObject(u) && SubscriptionTypeId in u
}

function executeFinalizer(finalizer: Finalizer): void {
  return finalizer && ('unsubscribe' in finalizer ? finalizer.unsubscribe() : finalizer())
}

export class UnsubscribeError {
  constructor(readonly errors: unknown[]) {}
}

export const EMPTY_SUBSCRIPTION = (() => {
  const empty  = new Subscription()
  empty.closed = true
  return empty
})()
