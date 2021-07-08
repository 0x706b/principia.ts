import { isObject } from '../../util/predicates'

export const $equals = Symbol('@principia/base/Structural/Equatable')

export interface Equatable {
  [$equals](that: unknown): boolean
}

export function isEquatable(u: unknown): u is Equatable {
  return isObject(u) && $equals in u
}
