// tracing: off

import type { FIO } from '../core'

import * as Fiber from '../../Fiber'
import { chain_, succeedLazy } from '../core'

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 *
 * @trace 0
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): FIO<E, A> {
  return chain_(succeedLazy(fiber), Fiber.join)
}
