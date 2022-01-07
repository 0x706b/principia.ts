import type { CoreURIS } from '../Modules'
import type * as PE from '../ParseError'
import type { Conc } from '@principia/base/collection/immutable/Conc'

import * as S from './core'

export class ConcS<I extends S.AnyUS> extends S.Schema<
  S.URISIn<I> | CoreURIS,
  unknown,
  Iterable<S.CInputOf<I>>,
  PE.UnknownIterableLE | PE.CompoundE<PE.OptionalIndexE<number, S.ErrorOf<I>>>,
  PE.CompositionE<PE.OptionalIndexE<number, S.CErrorOf<I>>>,
  Conc<S.TypeOf<I>>,
  Array<S.OutputOf<I>>,
  S.ApiOf<I>
> {
  readonly _tag = 'Conc'
  constructor(readonly item: I) {
    super()
  }
  get api() {
    return this.item.api
  }
  clone() {
    return new ConcS(this.item)
  }
}

export function conc<I extends S.AnyUS>(item: I): ConcS<I> {
  return new ConcS(item)
}
