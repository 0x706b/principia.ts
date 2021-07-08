import type { FloatConstraints, NumberConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { ArrayInt64 } from '@principia/base/util/pure-rand/distribution/internals/ArrayInt'

import { IllegalArgumentError } from '@principia/base/Error'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import { Random } from '@principia/base/Random'
import * as S from '@principia/base/Stream'

import * as Sa from '../Sample'
import {
  add64,
  computeArrayInt64GenerateRange,
  indexToDouble,
  isStrictlyPositive64,
  isStrictlySmaller64,
  safeDoubleToIndex,
  substract64,
  Unit64
} from '../util/math'
import * as G from './core'
import { Gen } from './core'

export function arrayInt64(min: ArrayInt64, max: ArrayInt64): Gen<Has<Random>, ArrayInt64> {
  return pipe(
    computeArrayInt64GenerateRange(min, max, undefined, undefined),
    S.fromIO,
    S.chain(({ min, max }) => S.repeatIO(Random.nextArrayInt(min, max))),
    S.map((uncheckedValue) => {
      if (uncheckedValue.data.length === 1) {
        uncheckedValue.data.unshift(0)
      }
      return Sa.shrinkArrayInt64(min)(uncheckedValue as ArrayInt64)
    }),
    (_) => new Gen(_)
  )
}

export function double(constraints: NumberConstraints & FloatConstraints = {}): Gen<Has<Random>, number> {
  const {
    noDefaultInfinity = false,
    noNaN = false,
    min = noDefaultInfinity ? -Number.MAX_VALUE : Number.NEGATIVE_INFINITY,
    max = noDefaultInfinity ? Number.MAX_VALUE : Number.POSITIVE_INFINITY
  } = constraints
  return pipe(
    I.gen(function* (_) {
      const minIndex = yield* _(safeDoubleToIndex(min, 'min'))
      const maxIndex = yield* _(safeDoubleToIndex(max, 'max'))
      if (isStrictlySmaller64(maxIndex, minIndex)) {
        return yield* _(I.die(new IllegalArgumentError('min must be less than or equal to max', 'Gen.double')))
      }
      if (noNaN) {
        return G.map_(arrayInt64(minIndex, maxIndex), indexToDouble)
      }
      const positiveMaxIdx  = isStrictlyPositive64(maxIndex)
      const minIndexWithNaN = positiveMaxIdx ? minIndex : substract64(minIndex, Unit64)
      const maxIndexWithNaN = positiveMaxIdx ? add64(maxIndex, Unit64) : maxIndex
      return G.map_(arrayInt64(minIndexWithNaN, maxIndexWithNaN), (index) => {
        if (isStrictlySmaller64(maxIndex, index) || isStrictlySmaller64(index, minIndex)) return Number.NaN
        else return indexToDouble(index)
      })
    }),
    G.unwrap
  )
}
