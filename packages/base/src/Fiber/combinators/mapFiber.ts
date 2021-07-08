import type { Fiber } from '../core'

import * as Ex from '../../Exit/core'
import * as F from '../core'
import * as I from '../internal/io'

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export function mapFiber_<A, E, E1, A1>(fiber: Fiber<E, A>, f: (a: A) => Fiber<E1, A1>): I.UIO<Fiber<E | E1, A1>> {
  return I.map_(fiber.await, Ex.match(F.halt, f))
}

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export function mapFiber<E1, A, B>(f: (a: A) => Fiber<E1, B>): <E>(fiber: Fiber<E, A>) => I.UIO<Fiber<E | E1, B>> {
  return (fiber) => mapFiber_(fiber, f)
}
