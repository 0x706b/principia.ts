import type { Has } from '@principia/base/Has'
import type { Random } from '@principia/base/Random'

import * as G from './core'

export type FalsyValue = false | null | 0 | '' | typeof NaN | undefined | 0n

export const falsy: G.Gen<Has<Random>, FalsyValue> = G.oneOf(
  G.constant<false>(false),
  G.constant(null),
  G.constant(0),
  G.constant<''>(''),
  G.constant(NaN),
  G.constant(undefined),
  G.constant<0n>(BigInt(0) as 0n)
)
