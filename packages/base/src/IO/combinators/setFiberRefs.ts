import type { FiberRefs } from '../../FiberRefs'

import * as I from '../core'

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 */
export function setFiberRefs(fiberRefs: FiberRefs): I.UIO<void> {
  return I.defer(() => fiberRefs.setAll)
}
