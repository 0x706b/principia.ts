import type * as HKT from '../../HKT'
import type { ReadonlyRecord } from './Record'

import * as NT from '../../Newtype'

export interface StructN extends HKT.HKT {
  readonly type: Struct<this['A']>
}
export interface Struct<A> extends NT.Newtype<'Struct', A, HKT.Extend<'A', Record<string, any>>> {}
export const Struct = NT.newtype<StructN>()

/**
 * @optimize identity
 */
export function fromRecord<R extends Record<string, any>>(record: R): Struct<R> {
  return Struct.get(record)
}

/**
 * @optimize identity
 */
export function toRecord<S extends ReadonlyRecord<string, any>>(struct: Struct<S>): S {
  return Struct.reverseGet(struct)
}
