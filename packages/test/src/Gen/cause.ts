import type { Sized } from '../Sized'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as C from '@principia/base/Cause'
import * as L from '@principia/base/collection/immutable/List'
import { none } from '@principia/base/Fiber'
import { Trace } from '@principia/base/Fiber/Trace'
import { pipe } from '@principia/base/function'
import * as M from '@principia/base/Maybe'

import * as G from './core'

export function cause<R, Id, R1, E, R2>(
  id: G.Gen<R, Id>,
  error: G.Gen<R, E>,
  defect: G.Gen<R1, unknown>
): G.Gen<R & R1 & R2 & Has<Random> & Has<Sized>, C.PCause<Id, E>> {
  const failure   = G.map_(error, C.fail)
  const halt      = G.map_(defect, C.halt)
  const empty     = G.constant(C.empty)
  const interrupt = G.map_(id, C.interrupt)
  const traced    = (n: number): G.Gen<R & R1 & R2 & Has<Random>, C.PCause<Id, E>> =>
    G.defer(() =>
      pipe(
        causesN(n - 1),
        G.map((c) => C.traced(c, new Trace(none, L.nil(), L.nil(), M.nothing())))
      )
    )

  const sequential = (n: number): G.Gen<R & R1 & R2 & Has<Random>, C.PCause<Id, E>> =>
    G.defer(() =>
      pipe(
        G.int({ min: 1, max: n - 1 }),
        G.chain((i) => G.crossWith_(causesN(i), causesN(n - i), C.then))
      )
    )

  const parallel = (n: number): G.Gen<R & R1 & R2 & Has<Random>, C.PCause<Id, E>> =>
    G.defer(() =>
      pipe(
        G.int({ min: 1, max: n - 1 }),
        G.chain((i) => G.crossWith_(causesN(i), causesN(n - i), C.both))
      )
    )

  const causesN = (n: number): G.Gen<R & R1 & R2 & Has<Random>, C.PCause<Id, E>> =>
    G.defer(() => {
      if (n === 1) {
        return G.oneOf(empty, failure, halt, interrupt)
      } else if (n === 2) {
        return traced(n)
      } else {
        return G.oneOf(traced(n), sequential(n), parallel(n))
      }
    })

  return G.small(causesN, 1)
}
