import type { Gen } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/IO/Random'

import * as M from '@principia/base/Maybe'

import * as G from './core'

export function just<R, A>(gen: Gen<R, A>): Gen<R, M.Maybe<A>> {
  return G.map_(gen, M.just)
}

export function nothing(): Gen<unknown, M.Maybe<never>> {
  return G.constant(M.nothing())
}

export function option<R, A>(gen: Gen<R, A>): Gen<R & Has<Random>, M.Maybe<A>> {
  return G.oneOf(nothing(), just(gen))
}
