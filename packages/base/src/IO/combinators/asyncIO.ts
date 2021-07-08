// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as P from '../../Promise'
import * as I from '../core'
import { runtime } from '../runtime'
import { fulfill } from './fulfill'
import { uninterruptibleMask } from './interrupt'

/**
 * Imports an asynchronous effect into an `IO`. This formulation is
 * necessary when the effect is itself expressed in terms of `IO`.
 *
 * @trace 0
 */
export function asyncIO<R, E, R1, E1, A>(
  register: (k: (_: IO<R1, E1, A>) => void) => IO<R, E, any>
): IO<R & R1, E | E1, A> {
  return I.gen(function* (_) {
    const p = yield* _(P.make<E | E1, A>())
    const r = yield* _(runtime<R & R1>())
    const a = yield* _(
      uninterruptibleMask(
        traceAs(register, ({ restore }) =>
          pipe(
            register((k) => {
              r.run_(fulfill(p)(k))
            }),
            I.catchAllCause((c) => P.halt_(p, c)),
            restore,
            I.fork,
            I.crossSecond(restore(P.await(p)))
          )
        )
      )
    )
    return a
  })
}
