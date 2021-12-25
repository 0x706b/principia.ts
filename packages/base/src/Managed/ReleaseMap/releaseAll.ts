// tracing: off

import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Exit } from '../../IO/Exit'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import { foreachExec as foreachExecIO } from '../../IO/combinators/foreachExec'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import * as Ref from '../../Ref'
import * as I from '../internal/io'
import * as RM from './core'

/**
 * @trace call
 */
export function releaseAll_(
  releaseMap: RM.ReleaseMap,
  exit: Exit<any, any>,
  execStrategy: ExecutionStrategy
): I.UIO<any> {
  const trace = accessCallTrace()
  return pipe(
    RM.ReleaseMap.reverseGet(releaseMap),
    Ref.modify((s): [I.UIO<any>, RM.State] => {
      switch (s._tag) {
        case 'Exited': {
          return [I.unit(), s]
        }
        case 'Running': {
          return [
            pipe(
              Array.from(s.finalizers).reverse(),
              foreachExecIO(
                execStrategy,
                traceFrom(trace, ([, f]) => I.result(s.update(f)(exit)))
              ),
              I.chain((e) =>
                pipe(
                  execStrategy._tag === 'Sequential' ? Ex.collectAll(...e) : Ex.collectAllC(...e),
                  M.getOrElse(() => Ex.succeed([])),
                  I.fromExit
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
