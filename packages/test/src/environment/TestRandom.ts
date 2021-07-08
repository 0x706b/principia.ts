import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type { UIO } from '@principia/base/IO'
import type { List } from '@principia/base/List'
import type { Option } from '@principia/base/Option'
import type { Random } from '@principia/base/Random'
import type { URef } from '@principia/base/Ref'
import type { ArrayInt } from '@principia/base/util/pure-rand/distribution/internals/ArrayInt'

import { Byte } from '@principia/base/Byte'
import { ClockTag } from '@principia/base/Clock'
import { IllegalArgumentError } from '@principia/base/Error'
import { tag } from '@principia/base/Has'
import * as I from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as Li from '@principia/base/List'
import * as O from '@principia/base/Option'
import { pipe } from '@principia/base/prelude'
import { RandomTag } from '@principia/base/Random'
import * as Ref from '@principia/base/Ref'
import { intersect } from '@principia/base/struct'
import { Mash } from '@principia/base/util/Mash'
import { ImmutableQueue } from '@principia/base/util/support/ImmutableQueue'

const TestRandomTag = tag<TestRandom>()

export class TestRandom implements Random {
  constructor(readonly randomState: URef<Data>, readonly bufferState: URef<Buffer>) {}

  clearBooleans: UIO<void> = Ref.update_(this.bufferState, (buff) => buff.copy({ booleans: Li.empty() }))
  clearBytes: UIO<void>    = Ref.update_(this.bufferState, (buff) => buff.copy({ bytes: Li.empty() }))
  clearChars: UIO<void>    = Ref.update_(this.bufferState, (buff) => buff.copy({ chars: Li.empty() }))
  clearDoubles: UIO<void>  = Ref.update_(this.bufferState, (buff) => buff.copy({ doubles: Li.empty() }))
  clearInts: UIO<void>     = Ref.update_(this.bufferState, (buff) => buff.copy({ integers: Li.empty() }))
  clearStrings: UIO<void>  = Ref.update_(this.bufferState, (buff) => buff.copy({ strings: Li.empty() }))
  feedBooleans(...booleans: ReadonlyArray<boolean>): UIO<void> {
    return Ref.update_(this.bufferState, (buff) =>
      buff.copy({ booleans: Li.concat_(Li.from(booleans), buff.booleans) })
    )
  }
  feedBytes(...bytes: ReadonlyArray<ReadonlyArray<Byte>>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ bytes: Li.concat_(Li.from(bytes), data.bytes) }))
  }
  feedChars(...chars: ReadonlyArray<string>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ chars: Li.concat_(Li.from(chars), data.chars) }))
  }
  feedDoubles(...doubles: ReadonlyArray<number>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ doubles: Li.concat_(Li.from(doubles), data.doubles) }))
  }
  feedInts(...ints: ReadonlyArray<number>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ integers: Li.concat_(Li.from(ints), data.integers) }))
  }
  feedStrings(...strings: ReadonlyArray<string>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ strings: Li.concat_(Li.from(strings), data.strings) }))
  }
  getSeed: UIO<number> = this.randomState.get['<$>']((data) => ((data.seed1 << 24) | data.seed2) ^ 0x5deece66d)

  setSeed(seed: string): UIO<void> {
    const mash    = Mash()
    const newSeed = mash(seed)
    const seed1   = Math.floor(newSeed >>> 24)
    const seed2   = Math.floor(newSeed) & ((1 << 24) - 1)
    return this.randomState.set(new Data(seed1, seed2, new ImmutableQueue([])))
  }

  private bufferedBoolean = (buffer: Buffer): readonly [Option<boolean>, Buffer] => {
    return [Li.head(buffer.booleans), buffer.copy({ booleans: Li.drop_(buffer.booleans, 1) })]
  }
  private bufferedByte    = (buffer: Buffer): readonly [Option<ReadonlyArray<Byte>>, Buffer] => {
    return [Li.head(buffer.bytes), buffer.copy({ bytes: Li.drop_(buffer.bytes, 1) })]
  }
  private bufferedChar    = (buffer: Buffer): readonly [Option<string>, Buffer] => {
    return [Li.head(buffer.chars), buffer.copy({ chars: Li.drop_(buffer.chars, 1) })]
  }
  private bufferedDouble  = (buffer: Buffer): readonly [Option<number>, Buffer] => {
    return [Li.head(buffer.doubles), buffer.copy({ doubles: Li.drop_(buffer.doubles, 1) })]
  }
  private bufferedInt     = (buffer: Buffer): readonly [Option<number>, Buffer] => {
    return [Li.head(buffer.integers), buffer.copy({ integers: Li.drop_(buffer.doubles, 1) })]
  }
  private bufferedString  = (buffer: Buffer): readonly [Option<string>, Buffer] => {
    return [Li.head(buffer.strings), buffer.copy({ strings: Li.drop_(buffer.strings, 1) })]
  }

  private getOrElse = <A>(buffer: (_: Buffer) => readonly [Option<A>, Buffer], random: UIO<A>): UIO<A> => {
    return Ref.modify_(this.bufferState, buffer)['>>='](O.match(() => random, I.succeed))
  }

  private leastSignificantBits = (x: number): number => {
    return Math.floor(x) & ((1 << 24) - 1)
  }

  private mostSignificantBits = (x: number): number => {
    return Math.floor(x / (1 << 24))
  }

  private randomBits = (bits: number): UIO<number> => {
    return Ref.modify_(this.randomState, (data) => {
      const multiplier  = 0x5deece66d
      const multiplier1 = Math.floor(multiplier >>> 24)
      const multiplier2 = Math.floor(multiplier) & ((1 << 24) - 1)
      const product1    = data.seed1 * multiplier1 + data.seed1 * multiplier2
      const product2    = data.seed2 * multiplier2 + 0xb
      const newSeed1    = (this.mostSignificantBits(product2) + this.leastSignificantBits(product1)) & ((1 << 24) - 1)
      const newSeed2    = this.leastSignificantBits(product2)
      const result      = (newSeed1 << 8) | (newSeed2 >> 16)
      return [result >>> (32 - bits), new Data(newSeed1, newSeed2, data.nextNextGaussians)]
    })
  }

  private randomBoolean = this.randomBits(1)['<$>']((n) => n !== 0)

  private randomBytes = (length: number): UIO<ReadonlyArray<Byte>> => {
    const loop = (i: number, rnd: UIO<number>, n: number, acc: UIO<List<Byte>>): UIO<List<Byte>> => {
      if (i === length) {
        return acc['<$>'](Li.reverse)
      } else if (n > 0) {
        return rnd['>>=']((rnd) => loop(i + 1, I.succeed(rnd >> 8), n - 1, acc['<$>'](Li.prepend(Byte.wrap(rnd)))))
      } else {
        return loop(i, this.nextInt, Math.min(length - i, 4), acc)
      }
    }

    return loop(0, this.randomInt, Math.min(length, 4), I.succeed(Li.empty()))['<$>'](Li.toArray)
  }

  private randomIntBounded = (n: number) => {
    if (n <= 0) {
      return I.die(new IllegalArgumentError('n must be positive', 'TestRandom.randomIntBounded'))
    } else if ((n & -n) === n) {
      return this.randomBits(31)['<$>']((_) => _ >> Math.clz32(n))
    } else {
      const loop: UIO<number> = this.randomBits(31)['>>=']((i) => {
        const value = i % n
        if (i - value + (n - 1) < 0) return loop
        else return I.succeed(value)
      })
      return loop
    }
  }

  private randomLong: UIO<bigint> = this.randomBits(32)['>>=']((i1) =>
    this.randomBits(32)['>>=']((i2) => I.succeed(BigInt(i1 << 32) + BigInt(i2)))
  )

  private randomInt = this.randomBits(32)

  private randomDouble = this.randomBits(26)['>>=']((i1) =>
    this.randomBits(27)['<$>']((i2) => (i1 * (1 << 27) + i2) / (1 << 53))
  )

  private random = this.randomBits(26)

  get nextInt(): UIO<number> {
    return this.getOrElse(this.bufferedInt, this.randomInt)
  }

  get nextBoolean(): UIO<boolean> {
    return this.getOrElse(this.bufferedBoolean, this.randomBoolean)
  }

  get nextDouble(): UIO<number> {
    return this.getOrElse(this.bufferedDouble, this.randomDouble)
  }

  get next(): UIO<number> {
    return this.getOrElse(this.bufferedDouble, this.random)
  }

  nextBigIntBetween(low: bigint, high: bigint): UIO<bigint> {
    return I.repeatUntil_(this.randomLong, (n) => low <= n && n < high)
  }

  nextIntBetween(low: number, high: number): UIO<number> {
    return nextIntBetweenWith(low, high, this.randomInt, this.randomIntBounded)
  }

  nextRange(low: number, high: number): UIO<number> {
    return this.next['<$>']((n) => (high - low + 1) * n + low)
  }

  nextArrayInt(low: ArrayInt, high: ArrayInt): UIO<ArrayInt> {
    const self = this
    return pipe(
      I.gen(function* (_) {
        const rangeSize              = trimArrayIntInplace(addOneToPositiveArrayInt(substractArrayIntToNew(high, low)))
        const rangeLength            = rangeSize.data.length
        const mut_out: Array<number> = []
        while (true) {
          for (let index = 0; index !== rangeLength; ++index) {
            const indexRangeSize = index === 0 ? rangeSize[0] + 1 : 0x100000000
            const g              = yield* _(self.randomIntBounded(indexRangeSize))
            mut_out[index]       = g
          }
          for (let index = 0; index !== rangeLength; ++index) {
            const current        = mut_out[index]
            const currentInRange = rangeSize[index]
            if (current < currentInRange) {
              return mut_out
            } else if (current > currentInRange) {
              break
            }
          }
        }
      }),
      I.map((ns) => trimArrayIntInplace(addArrayIntToNew({ sign: 1, data: ns }, low)))
    )
  }

  static make(initialData: Data): L.Layer<unknown, never, Has<Random> & Has<TestRandom>> {
    return L.fromRawIO(
      I.gen(function* (_) {
        const data   = yield* _(Ref.make(initialData))
        const buffer = yield* _(Ref.make(new Buffer()))
        const test   = new TestRandom(data, buffer)
        return intersect(TestRandomTag.of(test), RandomTag.of(test))
      })
    )
  }

  static get determinictic() {
    return TestRandom.make(defaultData)
  }

  static random(): L.Layer<Has<Clock>, never, Has<Random> & Has<TestRandom>> {
    return L.fromIO(ClockTag)(I.askService(ClockTag))
      ['+++'](this.determinictic)
      ['>>>'](
        L.fromRawFunctionIO((env: Has<Clock> & Has<Random> & Has<TestRandom>) => {
          const random     = RandomTag.read(env)
          const testRandom = TestRandomTag.read(env)
          return I.gen(function* (_) {
            const time = yield* _(ClockTag.read(env).currentTime)
            yield* _(TestRandomTag.read(env).setSeed(time.toString(10)))
            return intersect(RandomTag.of(random), TestRandomTag.of(testRandom))
          })
        })
      )
  }

  private static _lifted = I.deriveLifted(TestRandomTag)(
    ['nextRange', 'nextIntBetween', 'setSeed'],
    [
      'clearInts',
      'clearBytes',
      'clearChars',
      'clearDoubles',
      'clearStrings',
      'clearBooleans',
      'next',
      'nextInt',
      'nextDouble',
      'nextBoolean',
      'getSeed'
    ],
    []
  )

  static clearInts     = TestRandom._lifted.clearInts
  static clearBytes    = TestRandom._lifted.clearBytes
  static clearChars    = TestRandom._lifted.clearChars
  static clearDoubles  = TestRandom._lifted.clearDoubles
  static clearStrings  = TestRandom._lifted.clearStrings
  static clearBooleans = TestRandom._lifted.clearBooleans
  static feedInts(...ints: ReadonlyArray<number>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedInts(...ints))
  }
  static feedBytes(...bytes: ReadonlyArray<ReadonlyArray<Byte>>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedBytes(...bytes))
  }
  static feedChars(...chars: ReadonlyArray<string>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedChars(...chars))
  }
  static feedDoubles(...doubles: ReadonlyArray<number>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedDoubles(...doubles))
  }
  static feedStrings(...strings: ReadonlyArray<string>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedStrings(...strings))
  }
  static feedBooleans(...booleans: ReadonlyArray<boolean>) {
    return I.asksServiceIO(TestRandomTag)((tr) => tr.feedBooleans(...booleans))
  }
  static next           = TestRandom._lifted.next
  static nextInt        = TestRandom._lifted.nextInt
  static nextDouble     = TestRandom._lifted.nextDouble
  static nextBoolean    = TestRandom._lifted.nextBoolean
  static nextRange      = TestRandom._lifted.nextRange
  static nextIntBetween = TestRandom._lifted.nextIntBetween
  static setSeed        = TestRandom._lifted.setSeed
  static getSeed        = TestRandom._lifted.getSeed
}

/**
 * @internal
 */
function nextIntBetweenWith(
  min: number,
  max: number,
  nextInt: UIO<number>,
  nextIntBounded: (_: number) => UIO<number>
): UIO<number> {
  if (min >= max) {
    return I.die(new IllegalArgumentError('invalid bounds', 'TestRandom.nextIntBetweenWith'))
  } else {
    const difference = max - min
    if (difference > 0) return nextIntBounded(difference)['<$>']((n) => n + min)
    else return I.repeatUntil_(nextInt, (n) => min <= n && n < max)
  }
}

class Data {
  constructor(
    readonly seed1: number,
    readonly seed2: number,
    readonly nextNextGaussians: ImmutableQueue<number> = new ImmutableQueue([])
  ) {}
}

const defaultData = new Data(1071905196, 1911589680)

class Buffer {
  constructor(
    readonly booleans: List<boolean> = Li.empty(),
    readonly bytes: List<ReadonlyArray<Byte>> = Li.empty(),
    readonly chars: List<string> = Li.empty(),
    readonly doubles: List<number> = Li.empty(),
    readonly integers: List<number> = Li.empty(),
    readonly strings: List<string> = Li.empty()
  ) {}

  copy(_: Partial<Buffer>): Buffer {
    return new Buffer(
      _.booleans ?? this.booleans,
      _.bytes ?? this.bytes,
      _.chars ?? this.chars,
      _.doubles ?? this.doubles,
      _.integers ?? this.integers,
      _.strings ?? this.strings
    )
  }
}

/** @internal */
function isStrictlySmaller(dataA: number[], dataB: number[]): boolean {
  const maxLength = Math.max(dataA.length, dataB.length)
  for (let index = 0; index < maxLength; ++index) {
    const indexA = index + dataA.length - maxLength
    const indexB = index + dataB.length - maxLength
    const vA     = indexA >= 0 ? dataA[indexA] : 0
    const vB     = indexB >= 0 ? dataB[indexB] : 0
    if (vA < vB) return true
    if (vA > vB) return false
  }
  return false
}

export function substractArrayIntToNew(arrayIntA: ArrayInt, arrayIntB: ArrayInt): ArrayInt {
  if (arrayIntA.sign !== arrayIntB.sign) {
    return addArrayIntToNew(arrayIntA, { sign: -arrayIntB.sign as -1 | 1, data: arrayIntB.data })
  }
  const dataA = arrayIntA.data
  const dataB = arrayIntB.data
  if (isStrictlySmaller(dataA, dataB)) {
    const out = substractArrayIntToNew(arrayIntB, arrayIntA)
    // eslint-disable-next-line functional/immutable-data
    out.sign = -out.sign as -1 | 1
    return out
  }
  const data: number[] = []
  let reminder         = 0
  for (let indexA = dataA.length - 1, indexB = dataB.length - 1; indexA >= 0 || indexB >= 0; --indexA, --indexB) {
    const vA      = indexA >= 0 ? dataA[indexA] : 0
    const vB      = indexB >= 0 ? dataB[indexB] : 0
    const current = vA - vB - reminder
    data.push(current >>> 0)
    reminder = current < 0 ? 1 : 0
  }
  return { sign: arrayIntA.sign, data: data.reverse() }
}

/**
 * Trim uneeded zeros in ArrayInt
 * and uniform notation for zero: {sign: 1, data: [0]}
 */
export function trimArrayIntInplace(arrayInt: ArrayInt) {
  /* eslint-disable functional/immutable-data */
  const data       = arrayInt.data
  let firstNonZero = 0
  for (; firstNonZero !== data.length && data[firstNonZero] === 0; ++firstNonZero) {}
  if (firstNonZero === data.length) {
    // only zeros
    arrayInt.sign = 1
    arrayInt.data = [0]
    return arrayInt
  }
  data.splice(0, firstNonZero)
  return arrayInt
  /* eslint-enable */
}

/**
 * Add two ArrayInt
 * @internal
 */
export function addArrayIntToNew(arrayIntA: ArrayInt, arrayIntB: ArrayInt): ArrayInt {
  if (arrayIntA.sign !== arrayIntB.sign) {
    return substractArrayIntToNew(arrayIntA, { sign: -arrayIntB.sign as -1 | 1, data: arrayIntB.data })
  }
  const data: number[] = []
  let reminder         = 0
  const dataA          = arrayIntA.data
  const dataB          = arrayIntB.data
  for (let indexA = dataA.length - 1, indexB = dataB.length - 1; indexA >= 0 || indexB >= 0; --indexA, --indexB) {
    const vA      = indexA >= 0 ? dataA[indexA] : 0
    const vB      = indexB >= 0 ? dataB[indexB] : 0
    const current = vA + vB + reminder
    data.push(current >>> 0)
    reminder = ~~(current / 0x100000000)
  }
  if (reminder !== 0) {
    data.push(reminder)
  }
  return { sign: arrayIntA.sign, data: data.reverse() }
}

/**
 * Add one to a given positive ArrayInt
 * @internal
 */
export function addOneToPositiveArrayInt(arrayInt: ArrayInt): ArrayInt {
  /* eslint-disable functional/immutable-data */
  arrayInt.sign = 1 // handling case { sign: -1, data: [0,...,0] }
  const data    = arrayInt.data
  for (let index = data.length - 1; index >= 0; --index) {
    if (data[index] === 0xffffffff) {
      data[index] = 0
    } else {
      data[index] += 1
      return arrayInt
    }
  }
  data.unshift(1)
  return arrayInt
  /* eslint-enable */
}
