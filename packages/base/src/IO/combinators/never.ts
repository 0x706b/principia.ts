// tracing: off

import type { UIO } from '../core'

import { async } from '../core'

/**
 * Returns a `IO` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = async(() => {
  //
})
