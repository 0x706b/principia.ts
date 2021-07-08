import type { Gen } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as O from '@principia/base/Option'

import * as G from './core'

export function some<R, A>(gen: Gen<R, A>): Gen<R, O.Option<A>> {
  return G.map_(gen, O.some)
}

export function none(): Gen<unknown, O.Option<never>> {
  return G.constant(O.none())
}

export function option<R, A>(gen: Gen<R, A>): Gen<R & Has<Random>, O.Option<A>> {
  return G.oneOf(none(), some(gen))
}
