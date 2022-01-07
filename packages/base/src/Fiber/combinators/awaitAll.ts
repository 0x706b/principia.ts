import type { Conc } from '../../collection/immutable/Conc/core'
import type { Exit } from '../../IO/Exit'
import type { Fiber } from '../core'

import { foreachC_ } from '../../IO/combinators/foreachC'
import * as I from '../internal/io'

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function awaitAll<E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, never, Exit<E, Conc<A>>> {
  return I.result(foreachC_(as, (f) => I.chain_(f.await, I.fromExit)))
}
