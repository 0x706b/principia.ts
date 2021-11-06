// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { checkInterruptible } from '../core'
import { interruptible, InterruptStatusRestore } from './interrupt'

/**
 * Makes the effect interruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 *
 * @trace 0
 */
export function interruptibleMask<R, E, A>(f: (restore: InterruptStatusRestore) => IO<R, E, A>): IO<R, E, A> {
  return checkInterruptible(traceAs(f, (flag) => interruptible(f(new InterruptStatusRestore(flag)))))
}
