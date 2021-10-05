import type { DataSource } from '../DataSource'
import type { BlockedRequest } from './BlockedRequest'
import type { Chunk } from '@principia/base/Chunk'
import type { HashMap } from '@principia/base/HashMap'

import * as C from '@principia/base/Chunk'
import * as HM from '@principia/base/HashMap'
import * as It from '@principia/base/Iterable'
import * as M from '@principia/base/Maybe'

export class Sequential<R> {
  readonly _tag = 'Sequential'

  constructor(private map: HashMap<DataSource<any, any>, Chunk<Chunk<BlockedRequest<any>>>>) {}

  ['++']<R1>(that: Sequential<R1>): Sequential<R & R1> {
    return new Sequential(
      It.foldl_(that.map, this.map, (map, [k, v]) =>
        HM.set_(
          map,
          k,
          M.match_(HM.get_(map, k), () => C.empty(), C.concat(v))
        )
      )
    )
  }

  get isEmpty() {
    return this.map.size === 0
  }

  get keys(): Iterable<DataSource<R, any>> {
    return HM.keys(this.map)
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, Chunk<Chunk<BlockedRequest<any>>>]> {
    return this.map
  }
}
