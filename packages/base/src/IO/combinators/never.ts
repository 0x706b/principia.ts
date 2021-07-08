// tracing: off

import type { UIO } from '../core'

import { defer, succeedLazy } from '../core'
import { asyncInterrupt } from './interrupt'

/**
 * Returns a `IO` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = defer(() =>
  asyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return succeedLazy(() => {
      clearInterval(interval)
    })
  })
)
