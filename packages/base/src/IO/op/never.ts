// tracing: off

import type { UIO } from '../core'

import * as E from '../../Either'
import { asyncInterrupt, defer, succeedLazy } from '../core'

/**
 * Returns a `IO` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never: UIO<never> = defer(() =>
  asyncInterrupt<unknown, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 60000)
    return E.left(
      succeedLazy(() => {
        clearInterval(interval)
      })
    )
  })
)
