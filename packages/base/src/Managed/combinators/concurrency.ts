import type { Maybe } from '../../Maybe'
import type { Managed, UManaged } from '../core'

import * as FR from '../../FiberRef'
import { Concurrency, concurrency as ioConcurrency } from '../../IO/combinators/concurrency'
import * as M from '../../Maybe'
import { apSecond_, fromIO } from '../core'

export const concurrency: UManaged<Maybe<number>> = fromIO(ioConcurrency)

export function withConcurrency_<R, E, A>(ma: Managed<R, E, A>, n: number): Managed<R, E, A> {
  return apSecond_(FR.locallyManaged_(Concurrency, M.just(n)), ma)
}

export function withConcurrency(n: number): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, A> {
  return (ma) => withConcurrency_(ma, n)
}

export function withConcurrencyUnbounded<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, A> {
  return apSecond_(FR.locallyManaged_(Concurrency, M.nothing()), ma)
}
