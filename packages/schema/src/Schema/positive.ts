import type { Branded } from '@principia/base/Brand'

import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'

import * as PE from '../ParseError'
import * as S from './core'

export interface PositiveBrand {
  readonly Positive: unique symbol
}

export type Positive<N extends number> = Branded<N, PositiveBrand>

export interface PositiveS<S extends S.AnyS>
  extends S.RefineS<S, never, PE.PositiveLE<S.TypeOf<S>>, Positive<S.TypeOf<S>>> {}
export function positive<S extends S.Schema<any, any, any, number, any, any, any, any>>(sa: S): PositiveS<S> {
  return pipe(
    sa,
    S.refine(
      (a): a is Positive<S.TypeOf<S>> => a >= 0,
      flow(PE.positiveE, PE.leafE),
      () => O.none(),
      'Positive'
    )
  )
}
