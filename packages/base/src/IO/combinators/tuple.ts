// tracing: off

import type { NonEmptyArray } from '../../NonEmptyArray'
import type { _E, _R } from '../../util/types'
import type { IO } from '../core'

import { identity } from '../../function'
import { foreach_ } from '../core'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'

export type TupleA<T extends NonEmptyArray<IO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [IO<any, any, infer A>] ? A : never
}

export function sequenceT<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<_R<A[number]>, _E<A[number]>, TupleA<A>> {
  return foreach_(t, identity) as any
}

export function sequenceTPar<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<_R<A[number]>, _E<A[number]>, TupleA<A>> {
  return foreachPar_(t, identity) as any
}

export function sequenceTParN(n: number) {
  return <A extends NonEmptyArray<IO<any, any, any>>>(...t: A): IO<_R<A[number]>, _E<A[number]>, TupleA<A>> =>
    foreachParN_(t, n, identity) as any
}
