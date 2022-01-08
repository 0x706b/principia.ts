import type { ReadonlyRecord } from './Record'

import * as NT from '../../Newtype'

export interface Struct<A extends Record<string, any>> extends NT.Newtype<'Struct', A> {}
export const Struct = <A extends Record<string, any>>() => NT.newtype<Struct<A>>()

/**
 * @optimize identity
 */
export function fromRecord<R extends ReadonlyRecord<string, any>>(record: R): Struct<R> {
  return Struct<R>().get(record)
}

/**
 * @optimize identity
 */
export function toRecord<S extends ReadonlyRecord<string, any>>(struct: Struct<S>): S {
  return Struct<S>().reverseGet(struct)
}
