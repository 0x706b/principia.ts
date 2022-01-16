import type * as HKT from '../../HKT'
import type { ReadonlyRecord } from './Record'

import * as NT from '../../Newtype'

export const DictionaryTypeId = Symbol.for('@principia/base/Dictionary')
export type DictionaryTypeId = typeof DictionaryTypeId

export interface DictionaryF extends HKT.HKT {
  readonly type: Dictionary<this['A']>
  readonly index: string
  readonly variance: {
    A: '+'
  }
}

export interface Dictionary<A> extends NT.Newtype<'Dictionary', ReadonlyRecord<string, A>> {}
export const Dictionary = NT.newtype<DictionaryF>()

export const empty: Dictionary<never> = fromRecord({})

/**
 * @optimize identity
 */
export function fromRecord<A>(_: ReadonlyRecord<string, A>): Dictionary<A> {
  return Dictionary.get(_)
}

/**
 * @optimize identity
 */
export function toRecord<A>(dict: Dictionary<A>): ReadonlyRecord<string, A> {
  return Dictionary.reverseGet(dict)
}
