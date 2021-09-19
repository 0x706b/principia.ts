import { isObject } from '@principia/base/prelude'

export interface Unsubscribable {
  readonly unsubscribe: () => void
}

export interface SubscriptionLike extends Unsubscribable {
  readonly closed: boolean
}

export type Finalizer = Unsubscribable | (() => void) | void

export const SubscriptionTypeId = Symbol.for('@principia/observable/Subscription')
export type SubscriptionTypeId = typeof SubscriptionTypeId

export class Subscription implements SubscriptionLike {
  readonly [SubscriptionTypeId]: SubscriptionTypeId = SubscriptionTypeId

  public closed = false
  private finalizers: Set<Finalizer> | null = null
  private parents: Set<Subscription> | null = null

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
          errors = isUnsubscribeError(e) ? e.errors : [e]
        }
      }

      if (finalizers) {
        this.finalizers = null
        for (const finalizer of finalizers) {
          try {
            executeFinalizer(finalizer)
          } catch (e) {
            errors ||= []
            if (isUnsubscribeError(e)) {
              errors.push(...e.errors)
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
        if (isSubscription(finalizer)) {
          if (finalizer.closed || finalizer.hasParent(this)) {
            return
          }
          finalizer.addParent(this)
        }
        if (!this.finalizers) {
          this.finalizers = new Set()
        }
        this.finalizers.add(finalizer)
      }
    }
  }

  private hasParent(parent: Subscription) {
    const parentage = this.parents
    return parentage ? parentage.has(parent) : false
  }

  private addParent(parent: Subscription) {
    if (!this.parents) {
      this.parents = new Set()
    }
    this.parents.add(parent)
  }

  private removeParent(parent: Subscription) {
    this.parents?.delete(parent)
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

export const EMPTY_SUBSCRIPTION = (() => {
  const empty  = new Subscription()
  empty.closed = true
  return empty
})()

export const UnsubscribeErrorTypeId = Symbol.for('@principia/observable/UnsubscribeError')
export type UnsubscribeErrorTypeId = typeof UnsubscribeErrorTypeId

export class UnsubscribeError {
  readonly [UnsubscribeErrorTypeId]: UnsubscribeErrorTypeId = UnsubscribeErrorTypeId
  constructor(readonly errors: unknown[]) {}
}

export function isUnsubscribeError(u: unknown): u is UnsubscribeError {
  return isObject(u) && UnsubscribeErrorTypeId in u
}
