// tracing: off

import type { Fiber } from '../../Fiber/core'
import type { FiberId } from '../../Fiber/FiberId'
import type { Exit } from '../Exit/core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { join } from '../../Fiber/op/join'
import * as C from '../Cause'
import * as I from '../core'
import * as Ex from '../Exit/core'
import { raceWith_, transplant } from './core-scope'

/*
 * -------------------------------------------------------------------------------------------------
 * Parallel Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 *
 * @trace call
 */
export function apC_<R, E, A, R1, E1, B>(fab: I.IO<R, E, (a: A) => B>, fa: I.IO<R1, E1, A>): I.IO<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return crossWithC_(
    fab,
    fa,
    traceFrom(trace, (f, a) => f(a))
  )
}

/**
 * @dataFirst apC_
 * @trace call
 */
export function apC<R, E, A>(fa: I.IO<R, E, A>): <Q, D, B>(fab: I.IO<Q, D, (a: A) => B>) => I.IO<Q & R, E | D, B> {
  const trace = accessCallTrace()
  return (fab) => traceCall(apC_, trace)(fab, fa)
}

/**
 * @trace call
 */
export function apFirstC_<R, E, A, R1, E1, B>(fa: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return crossWithC_(
    fa,
    fb,
    traceFrom(trace, (a, _) => a)
  )
}

/**
 * @dataFirst apFirstC_
 * @trace call
 */
export function apFirstC<R1, E1, B>(fb: I.IO<R1, E1, B>): <R, E, A>(fa: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(apFirstC_, trace)(fa, fb)
}

/**
 * @trace call
 */
export function apSecondC_<R, E, A, R1, E1, B>(fa: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return crossWithC_(
    fa,
    fb,
    traceFrom(trace, (_, b) => b)
  )
}

/**
 * @dataFirst apSecondC_
 * @trace call
 */
export function apSecondC<R1, E1, B>(fb: I.IO<R1, E1, B>): <R, E, A>(fa: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  const trace = accessCallTrace()
  return (fa) => traceCall(apSecondC_, trace)(fa, fb)
}

/**
 * Parallely zips two `IOs`
 *
 * @trace call
 */
export function crossC_<R, E, A, R1, E1, A1>(
  ma: I.IO<R, E, A>,
  mb: I.IO<R1, E1, A1>
): I.IO<R & R1, E | E1, readonly [A, A1]> {
  const trace = accessCallTrace()
  return traceCall(crossWithC_, trace)(ma, mb, (a, b) => [a, b] as const)
}

/**
 * Parallely zips two `IOs`
 *
 * @dataFirst crossC_
 * @trace call
 */
export function crossC<R1, E1, A1>(
  mb: I.IO<R1, E1, A1>
): <R, E, A>(ma: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, readonly [A, A1]> {
  return (ma) => crossC_(ma, mb)
}

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @trace 2
 */
export function crossWithC_<R, E, A, R2, E2, A2, B>(
  fa: I.IO<R, E, A>,
  fb: I.IO<R2, E2, A2>,
  f: (a: A, b: A2) => B
): I.IO<R & R2, E | E2, B> {
  const g = traceAs(f, (b: A2, a: A) => f(a, b))

  return transplant((graft) =>
    I.descriptorWith((d) =>
      raceWith_(
        graft(fa),
        graft(fb),
        (ex, fi) => coordinateCrossWithC<E, E2>()(d.id, f, true, ex, fi),
        (ex, fi) => coordinateCrossWithC<E, E2>()(d.id, g, false, ex, fi)
      )
    )
  )
}

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @dataFirst crossWithC_
 * @trace 1
 */
export function crossWithC<A, R1, E1, B, C>(
  fb: I.IO<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, C> {
  return (fa) => crossWithC_(fa, fb, f)
}

function coordinateCrossWithC<E, E2>() {
  return <B, X, Y>(
    fiberId: FiberId,
    f: (a: X, b: Y) => B,
    leftWinner: boolean,
    winner: Exit<E | E2, X>,
    loser: Fiber<E | E2, Y>
  ) => {
    return Ex.matchIO_(
      winner,
      (cw) =>
        I.chain_(
          loser.interruptAs(fiberId),
          Ex.matchIO(
            (cl) => (leftWinner ? I.failCause(C.both(cw, cl)) : I.failCause(C.both(cl, cw))),
            () => I.failCause(cw)
          )
        ),
      (x) =>
        I.map_(
          join(loser),
          traceAs(f, (y) => f(x, y))
        )
    )
  }
}
