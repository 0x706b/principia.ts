import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import { pipe } from '@principia/base/prelude'

import * as G from './core'

export function date(constraints: G.DateConstraints = {}): G.Gen<Has<Random>, Date> {
  const min = constraints.min ? constraints.min.getTime() : -8_640_000_000_000_000
  const max = constraints.max ? constraints.max.getTime() : 8_640_000_000_000_000
  return pipe(
    G.int({ min, max }),
    G.map((n) => new Date(n))
  )
}
