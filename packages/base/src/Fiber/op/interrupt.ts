import type { UIO } from '../../IO/core'
import type { Exit } from '../../IO/Exit'
import type { Fiber } from '../core'

import * as I from '../../IO/core'
import { forkDaemon } from '../../IO/op/core-scope'

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export function interrupt<E, A>(fiber: Fiber<E, A>): UIO<Exit<E, A>> {
  return I.chain_(I.fiberId, (id) => fiber.interruptAs(id))
}

/**
 *
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export function interruptFork<E, A>(fiber: Fiber<E, A>): UIO<void> {
  return I.asUnit(forkDaemon(interrupt(fiber)))
}
