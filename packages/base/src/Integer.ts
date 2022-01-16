import type * as HKT from './HKT'

import * as G from './Guard'
import * as NT from './Newtype'

interface IntegerN extends HKT.HKT {
  readonly type: Integer
}

export interface Integer extends NT.Newtype<'Integer', number> {}
export const Integer = NT.newtype<IntegerN>()

export const GuardSafe: G.Guard<unknown, Integer> = G.Guard(
  (u): u is Integer => typeof u === 'number' && Number.isSafeInteger(u)
)
