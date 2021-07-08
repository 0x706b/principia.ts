import type { FIO } from '../../IO/core'
import type { Fiber } from '../core'

import * as I from '../../IO/core'

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export function join<E, A>(fiber: Fiber<E, A>): FIO<E, A> {
  return I.tap_(I.chain_(fiber.await, I.done), () => fiber.inheritRefs)
}
