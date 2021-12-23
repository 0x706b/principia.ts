// tracing: off

import { traceCall } from '@principia/compile/util'

import { pipe } from '../../function'
import * as F from '../../Future'
import * as HM from '../../HashMap'
import { fulfill } from '../../IO/combinators/fulfill'
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
    const fiberId = yield* _(I.fiberId())
    const ref     = yield* _(Ref.make(HM.makeDefault<A, F.Future<E, B>>()))
    const scope   = yield* _(scopeManaged())

    return (a: A) =>
      pipe(
        ref,
        Ref.modify((map) =>
          pipe(
            map,
            HM.get(a),
            M.match(
              () => {
                const promise = F.unsafeMake<E, B>(fiberId)
                return [
                  pipe(
                    traceCall(scope.apply, f['$trace'])(f(a)),
                    I.map(([_, b]) => b),
                    fulfill(promise),
                    I.apSecond(F.await(promise))
                  ),
                  HM.set_(map, a, promise)
                ]
              },
              (promise) => [F.await(promise), map]
            )
          )
        ),
        I.flatten
      )
  })
}
