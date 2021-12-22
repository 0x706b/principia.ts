import type { FiberId, RuntimeFiber } from '@principia/base/Fiber'
import type { Hash } from '@principia/base/Hash'
import type * as P from '@principia/base/prelude'

import * as Eq from '@principia/base/Eq'
import { eqFiberId } from '@principia/base/Fiber'
import {DefaultEq, DefaultHash, hash} from '@principia/base/Structural'

export type WidenLiteral<A> = A extends string ? string : A extends number ? number : A extends boolean ? boolean : A

export const HashEqFiber: Hash<RuntimeFiber<any, any>> & P.Eq<RuntimeFiber<any, any>> = {
  ...Eq.contramap_(eqFiberId, (_) => _.id),
  hash: (_) => hash(_.id)
}

export const HashEqFiberId: Hash<FiberId> & P.Eq<FiberId> = {
  ...DefaultEq,
  ...DefaultHash
}
