import type { DataSource } from '../DataSource'
import type { BlockedRequest } from './BlockedRequest'
import type { Conc } from '@principia/base/collection/immutable/Conc'
import type { HashMap } from '@principia/base/collection/immutable/HashMap'

import * as C from '@principia/base/collection/immutable/Conc'
import * as HM from '@principia/base/collection/immutable/HashMap'
import * as It from '@principia/base/collection/Iterable'
import * as M from '@principia/base/Maybe'

import { Sequential } from './Sequential'

export class Parallel<R> {
  readonly _tag = 'Parallel'

  constructor(private map: HashMap<DataSource<any, any>, Conc<BlockedRequest<any>>>) {}

  ['++']<R1>(that: Parallel<R1>): Parallel<R & R1> {
    return new Parallel(
      It.foldl_(that.map, this.map, (map, [k, v]) =>
        HM.set_(
          map,
          k,
          M.match_(HM.get_(map, k), () => v, C.concat(v))
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

  get sequential(): Sequential<R> {
    return new Sequential(HM.map_(this.map, C.single))
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, Conc<BlockedRequest<any>>]> {
    return this.map
  }
}

export function empty<R>(): Parallel<R> {
  return new Parallel(HM.makeDefault())
}

export function from<R, A>(dataSource: DataSource<R, A>, blockedRequest: BlockedRequest<A>) {
  return new Parallel(HM.set_(HM.makeDefault(), dataSource, C.single(blockedRequest)))
}
