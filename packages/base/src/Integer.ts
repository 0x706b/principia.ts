import * as G from './Guard'
import * as NT from './Newtype'

export const Integer = NT.typeDef<number>()('Integer')
export interface Integer extends NT.TypeOf<typeof Integer> {}

export const GuardSafe: G.Guard<unknown, Integer> = G.Guard(
  (u): u is Integer => typeof u === 'number' && Number.isSafeInteger(u)
)
