/* eslint-disable functional/immutable-data */
import type { Has } from '@principia/base/Has'

import * as I from '@principia/base/IO'
import { Random } from '@principia/base/Random'

/** @internal */
export const MIN_VALUE_32 = 2 ** -126 * 2 ** -23
/** @internal */
export const MAX_VALUE_32 = 2 ** 127 * (1 + (2 ** 23 - 1) / 2 ** 23)
/** @internal */
export const EPSILON_32 = 2 ** -23

/** @internal */
const INDEX_POSITIVE_INFINITY_32 = 2139095040 // floatToIndex(MAX_VALUE_32) + 1;
/** @internal */
const INDEX_NEGATIVE_INFINITY_32 = -2139095041 // floatToIndex(-MAX_VALUE_32) - 1

export function safeFloatToIndex(f: number, label: string): I.IO<unknown, never, number> {
  const conversionTrick = 'you can convert any double to a 32-bit float by using `new Float32Array([myDouble])[0]`'
  const errorMessage    = 'fc.floatNext constraints.' + label + ' must be a 32-bit float - ' + conversionTrick
  if (Number.isNaN(f) || (Number.isFinite(f) && (f < -MAX_VALUE_32 || f > MAX_VALUE_32))) {
    return I.die(new Error(errorMessage))
  }
  const index = floatToIndex(f)
  if (!Number.isInteger(index)) {
    return I.die(new Error(errorMessage))
  }
  return I.succeed(index)
}

export function decomposeFloat(f: number): { exponent: number, significand: number } {
  // 1 => significand 0b1   - exponent 1 (will be preferred)
  //   => significand 0b0.1 - exponent 2
  const maxSignificand = 1 + (2 ** 23 - 1) / 2 ** 23
  for (let exponent = -126; exponent !== 128; ++exponent) {
    const powExponent    = 2 ** exponent
    const maxForExponent = maxSignificand * powExponent
    if (Math.abs(f) <= maxForExponent) {
      return { exponent, significand: f / powExponent }
    }
  }
  return { exponent: Number.NaN, significand: Number.NaN }
}

export function floatToIndex(f: number): number {
  if (f === Number.POSITIVE_INFINITY) {
    return INDEX_POSITIVE_INFINITY_32
  }
  if (f === Number.NEGATIVE_INFINITY) {
    return INDEX_NEGATIVE_INFINITY_32
  }
  const { exponent, significand } = decomposeFloat(f)

  if (Number.isNaN(exponent) || Number.isNaN(significand) || !Number.isInteger(significand * 0x800000)) {
    return Number.NaN
  }

  if (f > 0 || (f === 0 && 1 / f === Number.POSITIVE_INFINITY)) {
    return indexInFloatFromDecomp(exponent, significand)
  } else {
    return -indexInFloatFromDecomp(exponent, -significand) - 1
  }
}

/** @internal */
export function indexInFloatFromDecomp(exponent: number, significand: number) {
  // WARNING: significand >= 0

  // By construct of significand in decomposeFloat,
  // significand is always max-ed.

  // The float close to zero are the only one having a significand <1, they also have an exponent of -126.
  // They are in range: [2**(-126) * 2**(-23), 2**(-126) * (2 - 2 ** 23)]
  // In other words there are 2**24 elements in that range if we include zero.
  // All other ranges (other exponents) have a length of 2**23 elements.
  if (exponent === -126) {
    return significand * 0x800000 // significand * 2**23
  }
  // Offset due to exp = -126 + Offset of previous exp (excl. -126) + Offset in current exp
  // 2**24 + (exponent - (-126) -1) * 2**23 + (significand - 1) * 2**23
  return (exponent + 127) * 0x800000 + (significand - 1) * 0x800000
}

/**
 * Compute the 32-bit floating point number corresponding to the provided indexes
 *
 * @param n - index of the float
 *
 * @internal
 */
export function indexToFloat(index: number): number {
  if (index < 0) {
    return -indexToFloat(-index - 1)
  }
  if (index === INDEX_POSITIVE_INFINITY_32) {
    return Number.POSITIVE_INFINITY
  }
  if (index < 0x1000000) {
    // The first 2**24 elements correspond to values having
    // exponent = -126 and significand = index * 2**(-23)
    return index * 2 ** -149
  }
  const postIndex = index - 0x1000000
  // Math.floor(postIndex / 0x800000) = Math.floor(postIndex / 2**23) = (postIndex >> 23)
  const exponent = -125 + (postIndex >> 23)
  // (postIndex % 0x800000) / 0x800000 = (postIndex & 0x7fffff) / 0x800000
  const significand = 1 + (postIndex & 0x7fffff) / 0x800000
  return significand * 2 ** exponent
}

/** @internal */
export type ArrayInt64 = { sign: 1 | -1, data: [number, number] }

/** @internal */
export const Zero64: ArrayInt64 = { sign: 1, data: [0, 0] }

/** @internal */
export const Unit64: ArrayInt64 = { sign: 1, data: [0, 1] }

/** @internal */
export function isZero64(a: ArrayInt64): boolean {
  return a.data[0] === 0 && a.data[1] === 0
}

/** @internal */
export function isStrictlyNegative64(a: ArrayInt64): boolean {
  return a.sign === -1 && !isZero64(a)
}

/** @internal */
export function isStrictlyPositive64(a: ArrayInt64): boolean {
  return a.sign === 1 && !isZero64(a)
}

/** @internal */
export function isEqual64(a: ArrayInt64, b: ArrayInt64): boolean {
  if (a.data[0] === b.data[0] && a.data[1] === b.data[1]) {
    return a.sign === b.sign || (a.data[0] === 0 && a.data[1] === 0) // either the same or both zero
  }
  return false
}

/** @internal */
function isStrictlySmaller64Internal(a: ArrayInt64['data'], b: ArrayInt64['data']): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
}

/** @internal */
export function isStrictlySmaller64(a: ArrayInt64, b: ArrayInt64): boolean {
  if (a.sign === b.sign) {
    return a.sign === 1
      ? isStrictlySmaller64Internal(a.data, b.data) // a.sign = +1, b.sign = +1
      : isStrictlySmaller64Internal(b.data, a.data) // a.sign = -1, b.sign = -1
  }
  // a.sign = +1, b.sign = -1 is always false
  return a.sign === -1 && (!isZero64(a) || !isZero64(b)) // a.sign = -1, b.sign = +1
}

/** @internal */
export function clone64(a: ArrayInt64): ArrayInt64 {
  return { sign: a.sign, data: [a.data[0], a.data[1]] }
}

/** @internal */
function substract64DataInternal(a: ArrayInt64['data'], b: ArrayInt64['data']): ArrayInt64['data'] {
  let reminderLow = 0
  let low         = a[1] - b[1]
  if (low < 0) {
    reminderLow = 1
    low         = low >>> 0
  }
  return [a[0] - b[0] - reminderLow, low]
}

/**
 * Expects a >= b
 * @internal
 */
function substract64Internal(a: ArrayInt64, b: ArrayInt64): ArrayInt64 {
  if (a.sign === 1 && b.sign === -1) {
    // Operation is a simple sum of a + abs(b)
    const low  = a.data[1] + b.data[1]
    const high = a.data[0] + b.data[0] + (low > 0xffffffff ? 1 : 0)
    return { sign: 1, data: [high >>> 0, low >>> 0] }
  }

  // a.sign === -1 with b.sign === 1 is impossible given: a - b >= 0, except for a = 0 and b = 0
  // Operation is a substraction
  return {
    sign: 1,
    data: a.sign === 1 ? substract64DataInternal(a.data, b.data) : substract64DataInternal(b.data, a.data)
  }
}

/**
 * Substract two ArrayInt64
 * @returns When result is zero always with sign=1
 * @internal
 */
export function substract64(arrayIntA: ArrayInt64, arrayIntB: ArrayInt64): ArrayInt64 {
  if (isStrictlySmaller64(arrayIntA, arrayIntB)) {
    const out = substract64Internal(arrayIntB, arrayIntA)
    out.sign  = -1
    return out
  }
  return substract64Internal(arrayIntA, arrayIntB)
}

/**
 * Negative version of an ArrayInt64
 * @internal
 */
export function negative64(arrayIntA: ArrayInt64): ArrayInt64 {
  return {
    sign: -arrayIntA.sign as -1 | 1,
    data: [arrayIntA.data[0], arrayIntA.data[1]]
  }
}

/**
 * Add two ArrayInt64
 * @returns When result is zero always with sign=1
 * @internal
 */
export function add64(arrayIntA: ArrayInt64, arrayIntB: ArrayInt64): ArrayInt64 {
  if (isZero64(arrayIntB)) {
    if (isZero64(arrayIntA)) {
      return clone64(Zero64)
    }
    return clone64(arrayIntA)
  }
  return substract64(arrayIntA, negative64(arrayIntB))
}

/**
 * Halve an ArrayInt64
 * @internal
 */
export function halve64(a: ArrayInt64): ArrayInt64 {
  return {
    sign: a.sign,
    data: [Math.floor(a.data[0] / 2), (a.data[0] % 2 === 1 ? 0x80000000 : 0) + Math.floor(a.data[1] / 2)]
  }
}

/**
 * Apply log2 to an ArrayInt64 (preserve sign)
 * @internal
 */
export function logLike64(a: ArrayInt64): ArrayInt64 {
  // Math.floor(Math.log(hi * 2**32 + low) / Math.log(2)) <= Math.floor(Math.log(2**64) / Math.log(2)) = 64
  return {
    sign: a.sign,
    data: [0, Math.floor(Math.log(a.data[0] * 0x100000000 + a.data[1]) / Math.log(2))]
  }
}

/** @internal */
const INDEX_POSITIVE_INFINITY: ArrayInt64 = { sign: 1, data: [2146435072, 0] } // doubleToIndex(Number.MAX_VALUE) + 1;
/** @internal */
const INDEX_NEGATIVE_INFINITY: ArrayInt64 = { sign: -1, data: [2146435072, 1] } // doubleToIndex(-Number.MAX_VALUE) - 1

/**
 * Decompose a 64-bit floating point number into a significand and exponent
 * such that:
 * - significand over 53 bits including sign (also referred as fraction)
 * - exponent over 11 bits including sign
 * - whenever there are multiple possibilities we take the one having the highest significand (in abs)
 * - Number.MAX_VALUE = 2**1023    * (1 + (2**52-1)/2**52)
 *                    = 2**1023    * (2 - Number.EPSILON)
 * - Number.MIN_VALUE = 2**(-1022) * 2**(-52)
 * - Number.EPSILON   = 2**(-52)
 *
 * @param d - 64-bit floating point number to be decomposed into (significand, exponent)
 *
 * @internal
 */
export function decomposeDouble(d: number): { exponent: number, significand: number } {
  // 1 => significand 0b1   - exponent 1 (will be preferred)
  //   => significand 0b0.1 - exponent 2
  const maxSignificand = 2 - Number.EPSILON
  for (let exponent = -1022; exponent !== 1024; ++exponent) {
    const powExponent    = 2 ** exponent
    const maxForExponent = maxSignificand * powExponent
    if (Math.abs(d) <= maxForExponent) {
      return { exponent, significand: d / powExponent }
    }
  }
  return { exponent: Number.NaN, significand: Number.NaN }
}

/** @internal */
function positiveNumberToInt64(n: number): ArrayInt64['data'] {
  return [~~(n / 0x100000000), n >>> 0]
}

/** @internal */
function indexInDoubleFromDecomp(exponent: number, significand: number): ArrayInt64['data'] {
  // WARNING: significand >= 0

  // By construct of significand in decomposeDouble,
  // significand is always max-ed.

  // The double close to zero are the only one having a significand <1, they also have an exponent of -1022.
  // They are in range: [2**(-1022) * 2**(-52), 2**(-1022) * (2 - 2 ** 52)]
  // In other words there are 2**53 elements in that range if we include zero.
  // All other ranges (other exponents) have a length of 2**52 elements.
  if (exponent === -1022) {
    // We want the significand to be an integer value (like an index)
    const rescaledSignificand = significand * 2 ** 52 // significand * 2**52
    return positiveNumberToInt64(rescaledSignificand)
  }
  // Offset due to exp = -1022 + Offset of previous exp (excl. -1022) + Offset in current exp
  // 2**53 + (exponent - (-1022) -1) * 2**52 + (significand - 1) * 2**52
  // (exponent + 1023) * 2**52 + (significand - 1) * 2**52
  const rescaledSignificand = (significand - 1) * 2 ** 52 // (significand-1) * 2**52
  const exponentOnlyHigh    = (exponent + 1023) * 2 ** 20 // (exponent + 1023) * 2**52 => [high: (exponent + 1023) * 2**20, low: 0]
  const index               = positiveNumberToInt64(rescaledSignificand)
  index[0]                 += exponentOnlyHigh
  return index
}

/**
 * Compute the index of d relative to other available 64-bit floating point numbers
 * Rq: Produces negative indexes for negative doubles
 *
 * @param d - 64-bit floating point number, anything except NaN
 *
 * @internal
 */
export function doubleToIndex(d: number): ArrayInt64 {
  if (d === Number.POSITIVE_INFINITY) {
    return clone64(INDEX_POSITIVE_INFINITY)
  }
  if (d === Number.NEGATIVE_INFINITY) {
    return clone64(INDEX_NEGATIVE_INFINITY)
  }
  const decomp      = decomposeDouble(d)
  const exponent    = decomp.exponent
  const significand = decomp.significand
  if (d > 0 || (d === 0 && 1 / d === Number.POSITIVE_INFINITY)) {
    return { sign: 1, data: indexInDoubleFromDecomp(exponent, significand) }
  } else {
    const indexOpposite = indexInDoubleFromDecomp(exponent, -significand)
    if (indexOpposite[1] === 0xffffffff) {
      indexOpposite[0] += 1
      indexOpposite[1]  = 0
    } else {
      indexOpposite[1] += 1
    }
    return { sign: -1, data: indexOpposite } // -indexInDoubleFromDecomp(exponent, -significand) - 1
  }
}

/**
 * Compute the 64-bit floating point number corresponding to the provided indexes
 *
 * @param n - index of the double
 *
 * @internal
 */
export function indexToDouble(index: ArrayInt64): number {
  if (index.sign === -1) {
    const indexOpposite: ArrayInt64 = { sign: 1, data: [index.data[0], index.data[1]] }
    if (indexOpposite.data[1] === 0) {
      indexOpposite.data[0] -= 1
      indexOpposite.data[1]  = 0xffffffff
    } else {
      indexOpposite.data[1] -= 1
    }
    return -indexToDouble(indexOpposite) // -indexToDouble(-index - 1);
  }
  if (isEqual64(index, INDEX_POSITIVE_INFINITY)) {
    return Number.POSITIVE_INFINITY
  }
  if (index.data[0] < 0x200000) {
    // if: index < 2 ** 53  <--> index[0] < 2 ** (53-32) = 0x20_0000
    // The first 2**53 elements correspond to values having
    // exponent = -1022 and significand = index * Number.EPSILON
    // double value = index * 2 ** -1022 * Number.EPSILON
    //              = index * 2 ** -1022 * 2 ** -52
    //              = index * 2 ** -1074
    return (index.data[0] * 0x100000000 + index.data[1]) * 2 ** -1074
  }
  const postIndexHigh = index.data[0] - 0x200000 // postIndex = index - 2 ** 53
  // exponent = -1021 + Math.floor(postIndex / 2**52)
  //          = -1021 + Math.floor(postIndexHigh / 2**(52-32))
  //          = -1021 + Math.floor(postIndexHigh / 2**20)
  //          = -1021 + (postIndexHigh >> 20)
  const exponent = -1021 + (postIndexHigh >> 20)
  // significand = 1 + (postIndex % 2**52) / 2**52
  //             = 1 + ((postIndexHigh * 2**32 + postIndexLow) % 2**52) / 2**52
  //             = 1 + ((postIndexHigh % 2**20) * 2**32 + postIndexLow) / 2**52
  //             = 1 + ((postIndexHigh & 0xfffff) * 2**32 + postIndexLow) / 2**52
  //             = 1 + ((postIndexHigh & 0xfffff) * 2**32 + postIndexLow) * Number.EPSILON
  const significand = 1 + ((postIndexHigh & 0xfffff) * 2 ** 32 + index.data[1]) * Number.EPSILON
  return significand * 2 ** exponent
}

/**
 * Same as {@link doubleToIndex} except it throws in case of invalid double
 *
 * @internal
 */
export function safeDoubleToIndex(d: number, label: string): I.IO<unknown, never, ArrayInt64> {
  if (Number.isNaN(d)) {
    // Number.NaN does not have any associated index in the current implementation
    return I.die(new Error('fc.doubleNext constraints.' + label + ' must be a 32-bit float'))
  }
  return I.succeed(doubleToIndex(d))
}

let EPSILON   = Math.pow(2, -52)
let MAX_VALUE = (2 - EPSILON) * Math.pow(2, 1023)
let MIN_VALUE = Math.pow(2, -1022)

export function nextUp(x: number) {
  if (x !== x) {
    return x
  }
  if (x === -1 / 0) {
    return -MAX_VALUE
  }
  if (x === +1 / 0) {
    return +1 / 0
  }
  if (x === +MAX_VALUE) {
    return +1 / 0
  }
  let y = x * (x < 0 ? 1 - EPSILON / 2 : 1 + EPSILON)
  if (y === x) {
    y = MIN_VALUE * EPSILON > 0 ? x + MIN_VALUE * EPSILON : x + MIN_VALUE
  }
  if (y === +1 / 0) {
    y = +MAX_VALUE
  }
  let b = x + (y - x) / 2
  if (x < b && b < y) {
    y = b
  }
  let c = (y + x) / 2
  if (x < c && c < y) {
    y = c
  }
  return y === 0 ? -0 : y
}

export function nextAfter(x: number, y: number) {
  return y < x ? -nextUp(-x) : y > x ? nextUp(x) : x !== x ? x : y
}

export function computeBiasedRanges(
  min: ArrayInt64,
  max: ArrayInt64,
  biasedRanges?: { min: ArrayInt64, max: ArrayInt64 }[]
): { min: ArrayInt64, max: ArrayInt64 }[] {
  if (biasedRanges != null) {
    return biasedRanges
  }
  if (isEqual64(min, max)) {
    return [{ min, max }]
  }
  const minStrictlySmallerThanZero = isStrictlyNegative64(min)
  const maxStrictlyGreaterThanZero = isStrictlyPositive64(max)
  if (minStrictlySmallerThanZero && maxStrictlyGreaterThanZero) {
    const logMin = logLike64(min)
    const logMax = logLike64(max)
    return [
      { min: logMin, max: logMax },
      { min: substract64(max, logMax), max },
      { min, max: substract64(min, logMin) }
    ]
  } else {
    const logGap     = logLike64(substract64(max, min))
    const closeToMin = { min, max: add64(min, logGap) }
    const closeToMax = { min: substract64(max, logGap), max }
    return minStrictlySmallerThanZero ? [closeToMax, closeToMin] : [closeToMin, closeToMax]
  }
}

export function computeArrayInt64GenerateRange(
  min: ArrayInt64,
  max: ArrayInt64,
  biasFactor: number | undefined,
  biasedRanges: { min: ArrayInt64, max: ArrayInt64 }[] | undefined
): I.URIO<Has<Random>, { min: ArrayInt64, max: ArrayInt64 }> {
  return I.gen(function* (_) {
    if (biasFactor === undefined || (yield* _(Random.nextIntBetween(1, biasFactor))) !== 1) {
      return { min, max }
    }
    const ranges = computeBiasedRanges(min, max, biasedRanges)
    if (ranges.length === 1) {
      return ranges[0]
    }
    const id = yield* _(Random.nextIntBetween(-2 * (ranges.length - 1), ranges.length - 2))
    return id < 0 ? ranges[0] : ranges[id + 1]
  })
}

export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}
