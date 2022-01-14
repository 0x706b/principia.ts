import type { InputRecord } from './types'
import type { Compute } from '@principia/base/util/compute'
import type { _A, ExcludeMatchingProperties, UnionToIntersection } from '@principia/base/util/types'

export type NonRequiredInputKeys<T extends InputRecord> = keyof ExcludeMatchingProperties<
  {
    [k in keyof T]: T[k]['config']['nullable'] extends true ? k : never
  },
  never
>

export type RequiredInputKeys<T extends InputRecord> = Exclude<keyof T, NonRequiredInputKeys<T>>

export type TypeofInputRecord<T extends InputRecord> = Compute<
  {
    [k in NonRequiredInputKeys<T>]?: _A<T[k]>
  } & {
    [k in RequiredInputKeys<T>]: _A<T[k]>
  },
  'flat'
>

export type _Root<A> = [A] extends [{ _Root: infer Root }] ? Root : {}

export type __R<Fs> = UnionToIntersection<
  {
    [K in keyof Fs]: [Fs[K]] extends [{ _R: (_: infer R) => void }] ? (unknown extends R ? never : R) : never
  }[keyof Fs]
>

export type __E<Fs> = Compute<
  {
    [K in keyof Fs]: [Fs[K]] extends [{ _E: () => infer E }] ? E : never
  }[keyof Fs],
  'flat'
>

export type __A<Fs> = Compute<
  {
    [K in keyof Fs]: _A<Fs[K]>
  },
  'flat'
>
