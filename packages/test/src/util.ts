import type { FiberId, RuntimeFiber } from '@principia/base/Fiber'
import type { Hash } from '@principia/base/Hash'
import type * as P from '@principia/base/prelude'

import * as Eq from '@principia/base/Eq'
import { eqFiberId } from '@principia/base/Fiber'

export type WidenLiteral<A> = A extends string ? string : A extends number ? number : A extends boolean ? boolean : A

export const HashEqFiber: Hash<RuntimeFiber<any, any>> & P.Eq<RuntimeFiber<any, any>> = {
  ...Eq.contramap_(eqFiberId, (_) => _.id),
  hash: (_) => _.id.seqNumber
}

export const HashEqFiberId: Hash<FiberId> & P.Eq<FiberId> = {
  ...eqFiberId,
  hash: (_) => _.seqNumber
}
