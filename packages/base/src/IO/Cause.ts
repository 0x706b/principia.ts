import type { FiberId } from '../Fiber/FiberId'

import * as A from '../Array/core'
import * as C from '../Cause'
import { prettyTrace } from '../Fiber/Trace'
import { pipe } from '../function'

export * from '../Cause'

export type Cause<E> = C.PCause<FiberId, E>

export const defaultRenderer: C.Renderer<FiberId> = {
  renderError: C.renderError,
  // TODO: do this better
  renderId: (id) =>
    id._tag === 'None'
      ? 'None'
      : id._tag === 'Runtime'
      ? `#${id.seqNumber}`
      : pipe(
          A.from(id.fiberIds),
          A.map((r) => r.seqNumber.toFixed(0)),
          A.join('\n')
        ),
  renderTrace: prettyTrace,
  renderUnknown: C.defaultErrorToLines,
  renderFailure: C.defaultErrorToLines
}

export const defaultPrettyPrint = C.makePrettyPrint(defaultRenderer)

export class FiberFailure<E> extends Error {
  readonly _tag = 'FiberFailure'
  readonly pretty = defaultPrettyPrint(this.cause)

  constructor(readonly cause: C.PCause<FiberId, E>) {
    super()

    this.name  = this._tag
    this.stack = undefined
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u['_tag'] === 'FiberFailure'
}
