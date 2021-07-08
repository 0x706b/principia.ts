import type { Sized } from '../Sized'
import type { Gen, LengthConstraints, NumberConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import { pipe } from '@principia/base/function'

import { clamp } from '../util/math'
import { array } from './array'
import * as G from './core'

function typedArray<A>(
  constraints: LengthConstraints & NumberConstraints,
  minBound: number,
  maxBound: number,
  ctor: { new (arg: ReadonlyArray<number>): A }
): Gen<Has<Random> & Has<Sized>, A> {
  const min = constraints.min ? clamp(constraints.min, minBound, maxBound) : minBound
  const max = constraints.max ? clamp(constraints.max, minBound, maxBound) : maxBound
  return pipe(
    array(G.int({ min, max }), constraints),
    G.map((n) => new ctor(n))
  )
}

export function int8Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int8Array> {
  return typedArray(constraints, -128, 127, Int8Array)
}

export function int16Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int16Array> {
  return typedArray(constraints, -32768, 32767, Int16Array)
}

export function int32Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int32Array> {
  return typedArray(constraints, -0x80000000, 0x7fffffff, Int32Array)
}

export function uint8Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint8Array> {
  return typedArray(constraints, 0, 255, Uint8Array)
}

export function uint16Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint16Array> {
  return typedArray(constraints, 0, 65535, Uint16Array)
}

export function uint32Array(
  constraints: LengthConstraints & NumberConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint32Array> {
  return typedArray(constraints, 0, 0xffffffff, Uint32Array)
}
