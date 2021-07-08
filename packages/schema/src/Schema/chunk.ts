import type { CoreURIS } from '../Modules'
import type * as PE from '../ParseError'
import type { Chunk } from '@principia/base/Chunk'

import * as S from './core'

export class ChunkS<I extends S.AnyUS> extends S.Schema<
  S.URISIn<I> | CoreURIS,
  unknown,
  Iterable<S.CInputOf<I>>,
  PE.UnknownIterableLE | PE.CompoundE<PE.OptionalIndexE<number, S.ErrorOf<I>>>,
  PE.CompositionE<PE.OptionalIndexE<number, S.CErrorOf<I>>>,
  Chunk<S.TypeOf<I>>,
  Array<S.OutputOf<I>>,
  S.ApiOf<I>
> {
  readonly _tag = 'Chunk'
  constructor(readonly item: I) {
    super()
  }
  get api() {
    return this.item.api
  }
  clone() {
    return new ChunkS(this.item)
  }
}

export function chunk<I extends S.AnyUS>(item: I): ChunkS<I> {
  return new ChunkS(item)
}
