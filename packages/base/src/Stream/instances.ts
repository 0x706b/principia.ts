import type * as HKT from '../HKT'

import * as P from '../prelude'
import * as S from './core'

export interface StreamF extends HKT.HKT {
  readonly type: S.Stream<this['R'], this['E'], this['A']>
  readonly variance: {
    R: '-'
    E: '+'
    A: '+'
  }
}

export const Functor = P.Functor<StreamF>({
  map_: S.map_
})
