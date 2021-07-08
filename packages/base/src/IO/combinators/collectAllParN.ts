// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { identity } from '../../function'
import { foreachParN_ } from './foreachParN'
import { foreachUnitParN_ } from './foreachUnitParN'

/**
 * @trace call
 */
export function collectAllParN_<R, E, A>(mas: Iterable<IO<R, E, A>>, n: number): IO<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return foreachParN_(mas, n, traceFrom(trace, (_) => _))
}

/**
 * @trace call
 */
export function collectAllParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return (mas) => traceCall(collectAllParN_, trace)(mas, n)
}

/**
 * @trace call
 */
export function collectAllUnitParN_<R, E, A>(mas: Iterable<IO<R, E, A>>, n: number): IO<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnitParN_(mas, n, traceFrom(trace, (_) => _))
}

/**
 * @trace call
 */
export function collectAllUnitParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, void> {
  const trace = accessCallTrace()
  return (mas) => traceCall(collectAllUnitParN_, trace)(mas, n)
}
