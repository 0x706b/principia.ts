import * as G from './Guard'
import * as NT from './Newtype'

export interface Integer extends NT.Newtype<'Integer', number> {}
export const Integer = NT.newtype<Integer>()

export const GuardSafe: G.Guard<unknown, Integer> = G.Guard(
  (u): u is Integer => typeof u === 'number' && Number.isSafeInteger(u)
)
