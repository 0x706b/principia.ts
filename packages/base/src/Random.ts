/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { ArrayInt } from './util/pure-rand/distribution/internals/ArrayInt'

import { tag } from './Has'
import * as I from './IO/core'
import * as L from './Layer/core'
import * as prand from './util/pure-rand'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */
export class LiveRandom implements Random {
  private PRNG

  constructor(seed: number) {
    this.PRNG = new prand.Random(prand.mersenne(seed))
  }

  next: I.UIO<number> = I.succeedLazy(() => this.PRNG.nextDouble())

  nextBoolean: I.UIO<boolean> = I.chain_(this.next, (n) => I.succeedLazy(() => n > 0.5))

  nextInt: I.UIO<number> = I.succeedLazy(() => this.PRNG.nextInt())

  nextRange: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.chain_(this.next, (n) => I.succeedLazy(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.chain_(this.next, (n) => I.succeedLazy(() => Math.floor((high - low + 1) * n + low)))

  nextBigIntBetween: (low: bigint, high: bigint) => I.UIO<bigint> = (low, high) =>
    I.succeedLazy(() => this.PRNG.nextBigInt(low, high))

  nextArrayInt: (low: ArrayInt, high: ArrayInt) => I.UIO<ArrayInt> = (low, high) =>
    I.succeedLazy(() => this.PRNG.nextArrayInt(low, high))
}

export const defaultRandom = new LiveRandom((Math.random() * 4294967296) >>> 0)

export const RandomTag = tag<Random>()

export abstract class Random {
  abstract readonly next: I.UIO<number>
  abstract readonly nextBoolean: I.UIO<boolean>
  abstract readonly nextInt: I.UIO<number>
  abstract readonly nextRange: (low: number, high: number) => I.UIO<number>
  abstract readonly nextIntBetween: (low: number, high: number) => I.UIO<number>
  abstract readonly nextBigIntBetween: (low: bigint, high: bigint) => I.UIO<bigint>
  abstract readonly nextArrayInt: (low: ArrayInt, high: ArrayInt) => I.UIO<ArrayInt>

  static next              = I.deriveLifted(RandomTag)([], ['next'], []).next
  static nextBoolean       = I.deriveLifted(RandomTag)([], ['nextBoolean'], []).nextBoolean
  static nextIntBetween    = I.deriveLifted(RandomTag)(['nextIntBetween'], [], []).nextIntBetween
  static nextInt           = I.deriveLifted(RandomTag)([], ['nextInt'], []).nextInt
  static nextRange         = I.deriveLifted(RandomTag)(['nextRange'], [], []).nextRange
  static nextBigIntBetween = I.deriveLifted(RandomTag)(['nextBigIntBetween'], [], []).nextBigIntBetween
  static nextArrayInt      = I.deriveLifted(RandomTag)(['nextArrayInt'], [], []).nextArrayInt
}

export function withSeed(seed: number) {
  return I.updateService(RandomTag)(() => new LiveRandom(seed))
}
