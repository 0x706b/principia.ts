// tracing: off

import type { ReadonlyRecord } from '../../collection/immutable/Record'
import type { _E, _R, EnforceNonEmptyRecord } from '../../util/types'
import type { Managed } from '../core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { concurrent, sequential } from '../../ExecutionStrategy'
import * as FR from '../../FiberRef/core'
import { identity, pipe } from '../../function'
import * as R from '../../collection/immutable/Record'
import { tuple } from '../../tuple/core'
import * as Ma from '../core'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'
import { foreachC_ } from './foreachC'

/*
 * -------------------------------------------------------------------------------------------------
 * Parallel Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 *
 * @trace 2
 */
export function crossWithC_<R, E, A, R1, E1, B, C>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): Managed<R & R1, E | E1, C> {
  return pipe(
    RM.makeManaged(concurrent),
    Ma.mapIO((parallelReleaseMap) => {
      const innerMap = pipe(Ma.currentReleaseMap, FR.locally(parallelReleaseMap, RM.makeManaged(sequential).io))
      return pipe(
        innerMap,
        I.cross(innerMap),
        I.chain(([[_, l], [__, r]]) =>
          pipe(
            Ma.currentReleaseMap,
            FR.locally(l, fa.io),
            I.crossWithC(
              pipe(Ma.currentReleaseMap, FR.locally(r, fb.io)),
              // We can safely discard the finalizers here because the resulting Managed's early
              // release will trigger the ReleaseMap, which would release both finalizers in
              // parallel.
              ([_, a], [__, b]) => f(a, b)
            )
          )
        )
      )
    })
  )
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 *
 * @dataFirst crossWithC_
 * @trace 1
 */
export function crossWithC<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => crossWithC_(fa, fb, f)
}

/**
 * @trace call
 */
export function crossC_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, readonly [A, B]> {
  const trace = accessCallTrace()
  return crossWithC_(
    fa,
    fb,
    traceFrom(trace, (a, b) => tuple(a, b))
  )
}

/**
 * @dataFirst crossC_
 * @trace call
 */
export function crossC<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E | E1, readonly [A, B]> {
  const trace = accessCallTrace()
  return (fa) => traceCall(crossC_, trace)(fa, fb)
}

/**
 * @trace call
 */
export function apC_<R, E, A, R1, E1, B>(
  fab: Managed<R1, E1, (a: A) => B>,
  fa: Managed<R, E, A>
): Managed<R & R1, E | E1, B> {
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
export function apC<R, E, A>(
  fa: Managed<R, E, A>
): <R1, E1, B>(fab: Managed<R1, E1, (a: A) => B>) => Managed<R & R1, E | E1, B> {
  const trace = accessCallTrace()
  return (fab) => traceCall(apC_, trace)(fab, fa)
}

/**
 * @trace call
 */
export function apFirstC_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> {
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
export function apFirstC<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  const trace = accessCallTrace()
  return (fa) => traceCall(apFirstC_, trace)(fa, fb)
}

/**
 * @trace call
 */
export function apSecondC_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
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
export function apSecondC<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  const trace = accessCallTrace()
  return (fa) => traceCall(apSecondC_, trace)(fa, fb)
}

export function sequenceSC<MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return Ma.map_(
    foreachC_(R.toArray(mr), ([k, v]) => Ma.map_(v, (a) => [k, a] as const)),
    (kvs) => {
      const r = {}
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i]
        r[k]         = v
      }
      return r
    }
  ) as any
}

export function sequenceTC<T extends ReadonlyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<
  _R<T[number]>,
  _E<T[number]>,
  {
    [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return foreachC_(t, identity) as any
}
