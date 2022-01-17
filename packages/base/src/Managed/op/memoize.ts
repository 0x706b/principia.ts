// tracing: off

import { traceAs } from '@principia/compile/util'

import * as HM from '../../collection/immutable/HashMap'
import { pipe } from '../../function'
import * as F from '../../Future'
import { fulfill } from '../../IO/op/fulfill'
import * as I from '../../IO/core'
import * as M from '../../Maybe'
import * as Ref from '../../Ref/core'
import * as Ma from '../core'
import { scope as scopeManaged } from './scope'

/**
 * @trace 0
 */
export function memoize<R, E, A, B>(
  f: (a: A) => Ma.Managed<R, E, B>
): Ma.Managed<unknown, never, (a: A) => I.IO<R, E, B>> {
  return Ma.gen(function* (_) {
    const fiberId = yield* _(I.fiberId)
    const ref     = yield* _(Ref.make(HM.makeDefault<A, F.Future<E, B>>()))
    const scope   = yield* _(scopeManaged)

    return (a: A) =>
      pipe(
        ref,
        Ref.modify((map) =>
          pipe(
            map,
            HM.get(a),
            M.match(
              () => {
                const future = F.unsafeMake<E, B>(fiberId)
                return [
                  pipe(
                    traceAs(f, scope.apply)(f(a)),
                    I.map(([_, b]) => b),
                    fulfill(future),
                    I.apSecond(F.await(future))
                  ),
                  HM.set_(map, a, future)
                ]
              },
              (future) => [F.await(future), map]
            )
          )
        ),
        I.flatten
      )
  })
}
