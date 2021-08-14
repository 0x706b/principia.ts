import type { FiberId } from './Fiber/FiberId'

import * as C from '../Cause'
import { prettyTrace } from '../IO/Fiber/trace'

export * from '../Cause'

export type Cause<E> = C.GenericCause<FiberId, E>

export const defaultRenderer: C.Renderer<FiberId> = {
  renderError: C.renderError,
  renderId: (id) => `#${id.seqNumber}`,
  renderTrace: prettyTrace,
  renderUnknown: C.defaultErrorToLines,
  renderFailure: C.defaultErrorToLines
}

export const defaultPrettyPrint = C.makePrettyPrint(defaultRenderer)

export class FiberFailure<E> extends Error {
  readonly _tag   = 'FiberFailure'
  readonly pretty = defaultPrettyPrint(this.cause)

  constructor(readonly cause: C.GenericCause<FiberId, E>) {
    super()

    this.name  = this._tag
    this.stack = undefined
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u['_tag'] === 'FiberFailure'
}
