// tracing: off

import type { RuntimeFiber } from '../../Fiber'
import type { IO } from '../core'

import { pipe } from '../../function'
import * as Supervisor from '../../Supervisor'
import { chain, supervised } from '../core'
import { ensuring } from './ensuring'

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function ensuringChildren_<R, E, A, R1>(
  ma: IO<R, E, A>,
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => IO<R1, never, any>
): IO<R & R1, E, A> {
  return pipe(
    Supervisor.track,
    chain((s) => pipe(ma, supervised(s), ensuring(pipe(s.value, chain(children)))))
  )
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 */
export function ensuringChildren<R1>(
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => IO<R1, never, any>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E, A> {
  return (io) => ensuringChildren_(io, children)
}
