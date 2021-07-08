import type { Fiber } from '../core'

import { done } from '../core'
import * as I from '../internal/io'

/**
 * Lifts an `IO` into a `Fiber`.
 */
export function fromIO<E, A>(effect: I.FIO<E, A>): I.UIO<Fiber<E, A>> {
  return I.map_(I.result(effect), done)
}
