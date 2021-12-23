import type { FiberContext } from './Fiber/FiberContext'
import type { FiberId } from './Fiber/FiberId'

import { none } from './Fiber/FiberId'

/**
 * A `Scope` represents the scope of a fiber lifetime. The scope of a fiber can
 * be retrieved using IO.descriptor, and when forking fibers, you can
 * specify a custom scope to fork them on by using the IO#forkIn.
 */
export abstract class Scope {
  abstract fiberId: FiberId
  abstract unsafeAdd(child: FiberContext<unknown, unknown>): boolean
}
export class Global extends Scope {
  get fiberId(): FiberId {
    return none
  }
  unsafeAdd(_child: FiberContext<unknown, unknown>): boolean {
    return true
  }
}

/**
 * The global scope. Anything forked onto the global scope is not supervised,
 * and will only terminate on its own accord (never from interruption of a
 * parent fiber, because there is no parent fiber).
 */
export const global = new Global()

export class Local extends Scope {
  constructor(readonly fiberId: FiberId, private parentRef: WeakRef<FiberContext<unknown, unknown>>) {
    super()
  }
  unsafeAdd(child: FiberContext<unknown, unknown>): boolean {
    const parent = this.parentRef.deref()
    if (parent != null) {
      parent.unsafeAddChild(child)
      return true
    } else {
      return false
    }
  }
}

export function unsafeMake(fiber: FiberContext<any, any>): Scope {
  return new Local(fiber.id, new WeakRef(fiber))
}
