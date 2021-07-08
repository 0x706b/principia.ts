import type { ShowComputationExternal } from './show'

import { isObject } from '../../util/predicates'

export const $show = Symbol('@principia/base/Structural/Showable')

export interface Showable {
  [$show]: ShowComputationExternal
}

export function isShowable(value: unknown): value is Showable {
  return isObject(value) && $show in value
}
