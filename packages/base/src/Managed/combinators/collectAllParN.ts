// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { foreachParN_, foreachUnitParN_ } from './foreachParN'

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 *
 * @trace call
 */
export function collectAllParN_<R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number): Managed<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreachParN_(
    mas,
    n,
    traceFrom(trace, (_) => _)
  )
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 *
 * @dataFirst collectAllParN_
 * @trace call
 */
export function collectAllParN(n: number): <R, E, A>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return (mas) => traceCall(collectAllParN_, trace)(mas, n)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 *
 * @trace call
 */
export function collectAllUnitParN_<R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number): Managed<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnitParN_(
    mas,
    n,
    traceFrom(trace, (_) => _)
  )
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 *
 * @dataFirst collectAllUnitParN_
 * @trace call
 */
export function collectAllUnitParN(n: number): <R, E, A>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, void> {
  const trace = accessCallTrace()
  return (mas) => traceCall(collectAllUnitParN_, trace)(mas, n)
}
