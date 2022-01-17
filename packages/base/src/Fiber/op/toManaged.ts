import type { Fiber } from '../core'

import { pipe } from '../../function'
import * as M from '../../Managed/core'
import * as I from '../internal/io'
import { interrupt } from './interrupt'

export function toManaged<E, A>(fiber: Fiber<E, A>): M.UManaged<Fiber<E, A>> {
  return pipe(I.succeed(fiber), M.bracket(interrupt))
}
