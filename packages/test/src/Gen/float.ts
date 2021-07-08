import type { FloatConstraints, Gen, NumberConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'

import { indexToFloat, MAX_VALUE_32, safeFloatToIndex } from '../util/math'
import * as G from './core'

export function float(constraints: NumberConstraints & FloatConstraints = {}): Gen<Has<Random>, number> {
  const {
    noDefaultInfinity = false,
    min = noDefaultInfinity ? -MAX_VALUE_32 : Number.NEGATIVE_INFINITY,
    max = noDefaultInfinity ? MAX_VALUE_32 : Number.POSITIVE_INFINITY,
    noNaN = false
  } = constraints
  return pipe(
    I.gen(function* (_) {
      const minIndex = yield* _(safeFloatToIndex(min, 'min'))
      const maxIndex = yield* _(safeFloatToIndex(max, 'max'))
      if (minIndex > maxIndex) {
        return yield* _(I.die(new Error('Gen.float constraints.min must be less than or equal to constraints.max')))
      }
      if (noNaN) {
        return pipe(G.int({ min: minIndex, max: maxIndex }), G.map(indexToFloat))
      }
      const minIndexWithNaN = maxIndex > 0 ? minIndex : minIndex - 1
      const maxIndexWithNaN = maxIndex > 0 ? maxIndex + 1 : maxIndex
      return pipe(
        G.int({ min: minIndexWithNaN, max: maxIndexWithNaN }),
        G.map((index) => {
          if (index > maxIndex || index < minIndex) return Number.NaN
          else return indexToFloat(index)
        })
      )
    }),
    G.unwrap
  )
}
