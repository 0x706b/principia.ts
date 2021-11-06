import type { UIO } from '../../IO/core'
import type { Fiber } from '../core'
import type { FiberId } from '../FiberId'

import * as I from '../../IO/core'
import * as Iter from '../../Iterable'

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export function interruptAllAs_(fs: Iterable<Fiber<any, any>>, id: FiberId): UIO<void> {
  return Iter.foldl_(fs, I.unit() as UIO<void>, (io, f) => I.asUnit(I.chain_(io, () => f.interruptAs(id))))
}

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export function interruptAllAs(id: FiberId): (fs: Iterable<Fiber<any, any>>) => UIO<void> {
  return (fs: Iterable<Fiber<any, any>>) => interruptAllAs_(fs, id)
}

/**
 * Interrupts all fibers and awaits their interruption
 */
export function interruptAll(fs: Iterable<Fiber<any, any>>): UIO<void> {
  return I.chain_(I.fiberId(), (id) => interruptAllAs_(fs, id))
}
