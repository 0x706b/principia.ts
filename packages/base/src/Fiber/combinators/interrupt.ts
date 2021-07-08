import type { Exit } from '../../Exit'
import type { UIO } from '../../IO/core'
import type { Fiber } from '../core'

import { forkDaemon } from '../../IO/combinators/core-scope'
import * as I from '../../IO/core'

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export function interrupt<E, A>(fiber: Fiber<E, A>): UIO<Exit<E, A>> {
  return I.chain_(I.fiberId(), (id) => fiber.interruptAs(id))
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
