// tracing: off

import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Exit } from '../../Exit'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as Ex from '../../Exit'
import { pipe } from '../../function'
import { foreachExec as foreachExecIO } from '../../IO/combinators/foreachExec'
import * as O from '../../Option'
import * as Ref from '../../Ref'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'

/**
 * @trace call
 */
export function releaseAll_(rm: RM.ReleaseMap, exit: Exit<any, any>, execStrategy: ExecutionStrategy): I.UIO<any> {
  const trace = accessCallTrace()
  return pipe(
    rm.ref,
    Ref.modify((s): [I.UIO<any>, RM.State] => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            pipe(
              Array.from(RM.finalizers(s)).reverse(),
              foreachExecIO(
                execStrategy,
                traceFrom(trace, ([, f]) => I.result(s.update(f)(exit)))
              ),
              I.chain((e) =>
                pipe(
                  execStrategy._tag === 'Sequential' ? Ex.collectAll(...e) : Ex.collectAllPar(...e),
                  O.getOrElse(() => Ex.succeed([])),
                  I.done
                )
              )
            ),
            new RM.Exited(s.nextKey, exit, s.update)
          ]
        }
      }
    }),
    I.flatten
  )
}

/**
 * @trace call
 */
export function releaseAll(exit: Exit<any, any>, execStrategy: ExecutionStrategy): (rm: RM.ReleaseMap) => I.UIO<any> {
  const trace = accessCallTrace()
  return (rm) => traceCall(releaseAll_, trace)(rm, exit, execStrategy)
}
