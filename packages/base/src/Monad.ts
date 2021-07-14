import type { ApplicativeMin } from './Applicative'
import type { ChainMin } from './Chain'

import { Applicative } from './Applicative'
import { Chain } from './Chain'
import * as HKT from './HKT'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Chain<F, C> {}

export type MonadMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> & ChainMin<F, C>

export function Monad<F extends HKT.URIS, C = HKT.Auto>(F: MonadMin<F, C>): Monad<F, C> {
  return HKT.instance<Monad<F, C>>({
    ...Applicative(F),
    ...Chain(F)
  })
}
