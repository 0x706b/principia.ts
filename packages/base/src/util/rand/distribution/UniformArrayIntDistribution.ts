import type RandomGenerator from '../generator/RandomGenerator'
import type Distribution from './Distribution'
import type { ArrayInt } from './internals/ArrayInt'

import {
  addArrayIntToNew,
  addOneToPositiveArrayInt,
  substractArrayIntToNew,
  trimArrayIntInplace
} from './internals/ArrayInt'
import { uniformArrayIntDistributionInternal } from './internals/UniformArrayIntDistributionInternal'

/** @internal */
function uniformArrayIntInternal(from: ArrayInt, to: ArrayInt, rng: RandomGenerator): ArrayInt {
  const rangeSize         = trimArrayIntInplace(addOneToPositiveArrayInt(substractArrayIntToNew(to, from)))
  const emptyArrayIntData = rangeSize.data.slice(0)
  const g                 = uniformArrayIntDistributionInternal(emptyArrayIntData, rangeSize.data, rng)
  return trimArrayIntInplace(addArrayIntToNew({ sign: 1, data: g }, from))
}

/**
 * Uniformly generate random ArrayInt values between `from` (included) and `to` (included)
 *
 * @param from - Lower bound of the range (included)
 * @param to - Upper bound of the range (included)
 *
 * @public
 */
function uniformArrayIntDistribution(from: ArrayInt, to: ArrayInt): Distribution<ArrayInt>
/**
 * Uniformly generate random ArrayInt values between `from` (included) and `to` (included)
 *
 * @param from - Lower bound of the range (included)
 * @param to - Upper bound of the range (included)
 * @param rng - Instance of RandomGenerator to extract random values from
 *
 * @public
 */
function uniformArrayIntDistribution(from: ArrayInt, to: ArrayInt, rng: RandomGenerator): ArrayInt
function uniformArrayIntDistribution(from: ArrayInt, to: ArrayInt, rng?: RandomGenerator) {
  if (rng != null) {
    return uniformArrayIntInternal(from, to, rng)
  }
  return function (rng: RandomGenerator) {
    return uniformArrayIntInternal(from, to, rng)
  }
}

export { uniformArrayIntDistribution }
