import type { Branded } from '@principia/base/Brand'

import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Maybe'

import * as PE from '../ParseError'
import * as S from './core'

export interface NonEmptyBrand {
  readonly NonEmpty: unique symbol
}
export type NonEmpty<A> = Branded<A, NonEmptyBrand>

export interface NonEmptyS<S extends S.AnyS>
  extends S.RefineS<S, never, PE.EmptyLE<S.TypeOf<S>>, NonEmpty<S.TypeOf<S>>> {}
export function nonEmpty<S extends S.Schema<any, any, any, any, any, { length: number }, any, any>>(
  sa: S
): NonEmptyS<S> {
  return pipe(
    sa,
    S.refine(
      (a): a is NonEmpty<S.TypeOf<S>> => a.length > 0,
      flow(PE.emptyE, PE.leafE),
      () => O.nothing(),
      'NonEmpty'
    )
  )
}
