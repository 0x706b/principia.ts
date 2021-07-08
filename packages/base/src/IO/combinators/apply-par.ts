// tracing: off

import type { Exit } from '../../Exit/core'
import type { Fiber } from '../../Fiber/core'
import type { FiberId } from '../../Fiber/FiberId'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as Ex from '../../Exit/core'
import { join } from '../../Fiber/combinators/join'
import * as I from '../core'
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
export function apPar_<R, E, A, R1, E1, B>(fab: I.IO<R, E, (a: A) => B>, fa: I.IO<R1, E1, A>): I.IO<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return crossWithPar_(
    fab,
    fa,
    traceFrom(trace, (f, a) => f(a))
  )
}

/**
 * @dataFirst apPar_
 * @trace call
 */
export function apPar<R, E, A>(fa: I.IO<R, E, A>): <Q, D, B>(fab: I.IO<Q, D, (a: A) => B>) => I.IO<Q & R, E | D, B> {
  const trace = accessCallTrace()
  return (fab) => traceCall(apPar_, trace)(fab, fa)
}

/**
 * @trace call
 */
export function crossFirstPar_<R, E, A, R1, E1, B>(fa: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, A> {
  const trace = accessCallTrace()
  return crossWithPar_(
    fa,
    fb,
    traceFrom(trace, (a, _) => a)
  )
}

/**
 * @dataFirst crossFirstPar_
 * @trace call
 */
export function crossFirstPar<R1, E1, B>(fb: I.IO<R1, E1, B>): <R, E, A>(fa: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(crossFirstPar_, trace)(fa, fb)
}

/**
 * @trace call
 */
export function crossSecondPar_<R, E, A, R1, E1, B>(fa: I.IO<R, E, A>, fb: I.IO<R1, E1, B>): I.IO<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return crossWithPar_(
    fa,
    fb,
    traceFrom(trace, (_, b) => b)
  )
}

/**
 * @dataFirst crossSecondPar_
 * @trace call
 */
export function crossSecondPar<R1, E1, B>(
  fb: I.IO<R1, E1, B>
): <R, E, A>(fa: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  const trace = accessCallTrace()
  return (fa) => traceCall(crossSecondPar_, trace)(fa, fb)
}

/**
 * Parallely zips two `IOs`
 *
 * @trace call
 */
export function crossPar_<R, E, A, R1, E1, A1>(
  ma: I.IO<R, E, A>,
  mb: I.IO<R1, E1, A1>
): I.IO<R & R1, E | E1, readonly [A, A1]> {
  const trace = accessCallTrace()
  return traceCall(crossWithPar_, trace)(ma, mb, (a, b) => [a, b] as const)
}

/**
 * Parallely zips two `IOs`
 *
 * @dataFirst crossPar_
 * @trace call
 */
export function crossPar<R1, E1, A1>(
  mb: I.IO<R1, E1, A1>
): <R, E, A>(ma: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, readonly [A, A1]> {
  return (ma) => crossPar_(ma, mb)
}

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @trace 2
 */
export function crossWithPar_<R, E, A, R2, E2, A2, B>(
  a: I.IO<R, E, A>,
  b: I.IO<R2, E2, A2>,
  f: (a: A, b: A2) => B
): I.IO<R & R2, E | E2, B> {
  const g = traceAs(f, (b: A2, a: A) => f(a, b))

  return transplant((graft) =>
    I.descriptorWith((d) =>
      raceWith_(
        graft(a),
        graft(b),
        (ex, fi) => coordinateCrossWithPar<E, E2>()(d.id, f, true, ex, fi),
        (ex, fi) => coordinateCrossWithPar<E, E2>()(d.id, g, false, ex, fi)
      )
    )
  )
}

/**
 * Parallelly zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @dataFirst crossWithPar_
 * @trace 1
 */
export function crossWithPar<A, R1, E1, A1, B>(
  mb: I.IO<R1, E1, A1>,
  f: (a: A, b: A1) => B
): <R, E>(ma: I.IO<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  return (ma) => crossWithPar_(ma, mb, f)
}

function coordinateCrossWithPar<E, E2>() {
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
            (cl) => (leftWinner ? I.halt(C.both(cw, cl)) : I.halt(C.both(cl, cw))),
            () => I.halt(cw)
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
