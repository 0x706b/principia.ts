import type { AltMin } from './Alt'
import type { ApplicativeMin } from './Applicative'
import type { Nil, NilMin } from './Nil'

import { Alt } from './Alt'
import { Applicative } from './Applicative'
import * as HKT from './HKT'

export interface Alternative<F extends HKT.HKT, TC = HKT.None> extends Applicative<F, TC>, Nil<F, TC>, Alt<F, TC> {}

export type AlternativeMin<F extends HKT.HKT, C = HKT.None> = ApplicativeMin<F, C> & AltMin<F, C> & NilMin<F, C>

export function Alternative<F extends HKT.HKT, C = HKT.None>(F: AlternativeMin<F, C>): Alternative<F, C> {
  return HKT.instance<Alternative<F, C>>({
    ...Applicative(F),
    ...Alt(F),
    nil: F.nil
  })
}
