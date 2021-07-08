import type { Chunk } from '../../Chunk'
import type { Fiber } from '../core'

import * as I from '../internal/io'
import { awaitAll } from './awaitAll'

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function joinAll<E, A>(as: Iterable<Fiber<E, A>>): I.FIO<E, Chunk<A>> {
  return I.tap_(I.chain_(awaitAll(as), I.done), () => I.foreach_(as, (f) => f.inheritRefs))
}
