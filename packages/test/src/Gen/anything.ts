import type { Sized } from '../Sized'
import type { Gen, ObjectConstraints } from './core'
import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'
import type { _R } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'
import * as St from '@principia/base/Structural'

import { array } from './array'
import { uniqueChunk } from './chunk'
import * as G from './core'
import { date } from './date'
import { dictionary } from './dictionary'
import { double } from './double'
import { alphaNumericString } from './string'
import { tuple } from './tuple'
import { int8Array, int16Array, int32Array, uint8Array, uint16Array, uint32Array } from './typedArray'

export function anything<C extends ObjectConstraints>(
  constraints: C = {} as any
): Gen<
  ObjectConstraints extends C
    ? Has<Random> & Has<Sized>
    : unknown extends C['key']
    ? Has<Random> & Has<Sized>
    : _R<C['key']> & C['values'] extends Array<infer A>
    ? _R<A>
    : Has<Random> & Has<Sized> & Has<Random> & Has<Sized>,
  unknown
> {
  const key      = constraints.key || alphaNumericString()
  const maxDepth = constraints.maxDepth || 2
  const maxKeys  = constraints.maxKeys || 5
  const values   = constraints.values || [
    G.boolean,
    alphaNumericString(),
    double(),
    G.anyInt,
    G.oneOf(alphaNumericString(), G.constant(null), G.constant(undefined))
  ]

  const mapOf = <R, K, R1, V>(key: Gen<R, K>, value: Gen<R1, V>) =>
    pipe(
      tuple(key, value),
      uniqueChunk({ eq: Eq.contramap_(St.DefaultEq, ([k]) => k) }),
      G.map((c) => new Map(c))
    )

  const setOf = <R, V>(value: Gen<R, V>) =>
    pipe(
      value,
      uniqueChunk({ eq: St.DefaultEq, maxLength: maxKeys }),
      G.map((c) => new Set(c))
    )

  const base       = G.oneOf(...values)
  const arrayBase  = G.oneOf(...A.map_(values, (gen) => array(gen, { maxLength: maxKeys })))
  const arrayGen   = G.memo((n) => G.oneOf(arrayBase, array(gen(n), { maxLength: maxKeys })))
  const objectBase = G.oneOf(...A.map_(values, (gen) => dictionary(key, gen)))
  const objectGen  = G.memo((n) => G.oneOf(objectBase, dictionary(key, gen(n))))
  const setBase    = G.oneOf(...A.map_(values, setOf))
  const setGen     = G.memo((n) => G.oneOf(setBase, setOf(gen(n))))
  const mapBase    = G.oneOf(...A.map_(values, (_) => mapOf(key, _)))
  const mapGen     = G.memo((n) => G.oneOf(mapBase, mapOf(G.oneOf(key, gen(n)), gen(n))))

  const gen: (n: number) => Gen<any, any> = G.memo((n) => {
    if (n <= 0) return base
    return G.oneOf(
      base,
      arrayGen(),
      objectGen(),
      ...(constraints.withDate ? [date()] : []),
      ...(constraints.withSet ? [setGen()] : []),
      ...(constraints.withMap ? [mapGen()] : []),
      ...(constraints.withTypedArray
        ? [G.oneOf(int8Array(), uint8Array(), int16Array(), uint16Array(), int32Array(), uint32Array())]
        : [])
    )
  })
  return gen(maxDepth)
}
