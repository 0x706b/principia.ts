import { FiberRefs } from '../../FiberRefs'
import * as I from '../core'
import { FiberRefGetAll } from '../primitives'

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 */
export const getFiberRefs: I.UIO<FiberRefs> = new FiberRefGetAll((fiberRefLocals) =>
  I.succeed(new FiberRefs(fiberRefLocals))
)
