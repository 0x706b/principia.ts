// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as F from '../../Future'
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
    const p = yield* _(F.make<E | E1, A>())
    const r = yield* _(runtime<R & R1>())
    const a = yield* _(
      uninterruptibleMask(
        traceAs(register, ({ restore }) =>
          pipe(
            register((k) => {
              r.unsafeRun(fulfill(p)(k))
            }),
            I.catchAllCause((c) => F.failCause_(p, c)),
            restore,
            I.fork,
            I.apSecond(restore(F.await(p)))
          )
        )
      )
    )
    return a
  })
}
