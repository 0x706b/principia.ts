import type { PLens, PLensMin } from '../Lens'

import * as E from '../Either'
import { flow, identity } from '../function'
import { makeGetter } from './Getter'
import { makePOptional } from './Optional'

export function makePLens<S, T, A, B>(L: PLensMin<S, T, A, B>): PLens<S, T, A, B> {
  return {
    ...makePOptional({ replace_: L.replace_, getOrModify: flow(L.get, E.right) }),
    ...makeGetter({ get: L.get })
  }
}

export function id<S, T>(): PLens<S, T, S, T> {
  return makePLens({
    get: identity,
    replace_: (_, t) => t
  })
}

export function andThen_<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PLens<A, B, C, D>): PLens<S, T, C, D> {
  return makePLens({
    get: flow(sa.get, ab.get),
    replace_: (s, d) => sa.modify_(s, ab.replace(d))
  })
}
