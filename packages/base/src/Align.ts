import type { Nil, NilMin } from './Nil'
import type { SemialignMin } from './Semialign'

import * as HKT from './HKT'
import { Semialign } from './Semialign'

export interface Align<F extends HKT.HKT, C = HKT.None> extends Semialign<F, C>, Nil<F, C> {}

export type AlignMin<F extends HKT.HKT, C = HKT.None> = SemialignMin<F, C> & NilMin<F, C>

export function Align<F extends HKT.HKT, C = HKT.None>(F: AlignMin<F, C>): Align<F, C> {
  return HKT.instance<Align<F, C>>({
    ...Semialign(F),
    nil: F.nil
  })
}
