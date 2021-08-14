// tracing: off

import { traceCall } from '@principia/compile/util'

import * as HM from '../../../HashMap'
import * as O from '../../../Option'
import { pipe } from '../../../prelude'
import * as P from '../../Promise'
import { fulfill } from '../../IO/combinators/fulfill'
import * as I from '../../IO/core'
import * as Ref from '../../Ref/core'
import * as M from '../core'
import { scope as scopeManaged } from './scope'

/**
 * @trace 0
 */
export function memoize<R, E, A, B>(
  f: (a: A) => M.Managed<R, E, B>
): M.Managed<unknown, never, (a: A) => I.IO<R, E, B>> {
  return M.gen(function* (_) {
    const fiberId = yield* _(I.fiberId())
    const ref     = yield* _(Ref.make(HM.makeDefault<A, P.Promise<E, B>>()))
    const scope   = yield* _(scopeManaged())

    return (a: A) =>
      pipe(
        ref,
        Ref.modify((map) =>
          pipe(
            map,
            HM.get(a),
            O.match(
              () => {
                const promise = P.unsafeMake<E, B>(fiberId)
                return [
                  pipe(
                    traceCall(scope.apply, f['$trace'])(f(a)),
                    I.map(([_, b]) => b),
                    fulfill(promise),
                    I.crossSecond(P.await(promise))
                  ),
                  HM.set_(map, a, promise)
                ]
              },
              (promise) => [P.await(promise), map]
            )
          )
        ),
        I.flatten
      )
  })
}
