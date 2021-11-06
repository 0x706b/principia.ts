import type * as As from '../../Async/core'

import * as IO from '../core'
import { fromAsync } from './fromAsync'

export function chainAsyncK_<R, E, A, R1, E1, B>(
  ma: IO.IO<R, E, A>,
  f: (a: A) => As.Async<R1, E1, B>
): IO.IO<R & R1, E | E1, B> {
  return IO.chain_(ma, (a) => fromAsync(f(a)))
}

export function chainAsyncK<A, R1, E1, B>(
  f: (a: A) => As.Async<R1, E1, B>
): <R, E>(ma: IO.IO<R, E, A>) => IO.IO<R & R1, E | E1, B> {
  return (ma) => chainAsyncK_(ma, f)
}
