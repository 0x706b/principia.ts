import type { FiberId } from '../Fiber'
import type { GenericCause } from './generic'
import type { Renderer } from './render'

import { prettyTrace } from '../Fiber/trace'
import { defaultErrorToLines, makePrettyPrint, renderError } from './render'

export * from './generic'
export * from './render'

export type Cause<E> = GenericCause<FiberId, E>

export const defaultRenderer: Renderer<FiberId> = {
  renderError,
  renderId: (id) => `#${id.seqNumber}`,
  renderTrace: prettyTrace,
  renderUnknown: defaultErrorToLines,
  renderFailure: defaultErrorToLines
}

export const defaultPrettyPrint = makePrettyPrint(defaultRenderer)

export class FiberFailure<E> extends Error {
  readonly _tag   = 'FiberFailure'
  readonly pretty = defaultPrettyPrint(this.cause)

  constructor(readonly cause: GenericCause<FiberId, E>) {
    super()

    this.name  = this._tag
    this.stack = undefined
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u['_tag'] === 'FiberFailure'
}
