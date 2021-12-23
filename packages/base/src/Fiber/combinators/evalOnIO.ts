import type { Fiber } from '../core'

import { pipe } from '../../function'
import * as F from '../../Future'
import { fulfill } from '../../IO/combinators/fulfill'
import * as I from '../../IO/core'
import { evalOn } from '../core'

/**
 * A fully-featured, but much slower version of `evalOn`, which is useful
 * when environment and error are required.
 */
export function evalOnIO_<E, A, R1, E1, B, R2, E2, C>(
  fiber: Fiber<E, A>,
  effect: I.IO<R1, E1, B>,
  orElse: I.IO<R2, E2, C>
): I.IO<R1 & R2, E1 | E2, B | C> {
  return I.gen(function* (_) {
    const r = yield* _(I.ask<R1 & R2>())
    const f = yield* _(F.make<E1 | E2, B | C>())
    yield* _(pipe(fiber, evalOn(pipe(effect, I.give(r), fulfill(f)), pipe(orElse, I.give(r), fulfill(f)))))
    return yield* _(F.await(f))
  })
}

/**
 * A fully-featured, but much slower version of `evalOn`, which is useful
 * when environment and error are required.
 */
export function evalOnIO<R1, E1, B, R2, E2, C>(
  effect: I.IO<R1, E1, B>,
  orElse: I.IO<R2, E2, C>
): <E, A>(fiber: Fiber<E, A>) => I.IO<R1 & R2, E1 | E2, B | C> {
  return (fiber) => evalOnIO_(fiber, effect, orElse)
}
