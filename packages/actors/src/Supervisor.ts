import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'

import * as T from '@principia/base/IO'
import * as SCH from '@principia/base/Schedule'

export class Supervisor<R, E> {
  readonly _R!: (r: R) => void
  readonly _E!: () => E

  constructor(readonly supervise: <R0, A>(zio: T.IO<R0, E, A>, error: E) => T.IO<R & R0 & Has<Clock>, void, A>) {}
}

export const none: Supervisor<unknown, any> = retry(SCH.once)

export function retry<R, E, A>(policy: SCH.Schedule<R, E, A>): Supervisor<R, E> {
  return retryOrElse(policy, (_, __) => T.unit())
}

export function retryOrElse<R, E, A>(
  policy: SCH.Schedule<R, E, A>,
  orElse: (e: E, a: A) => T.IO<R, E, void>
): Supervisor<R, E> {
  return new Supervisor<R, E>((zio, error) =>
    T.mapError_(
      T.retryOrElse_(zio, policy, (e, a) => T.apSecond_(orElse(e, a), T.fail(error))),
      () => undefined
    )
  )
}
