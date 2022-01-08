import type { AnyRequest, Request } from './Request'
import type { HashMap } from '@principia/base/collection/immutable/HashMap'
import type { HashSet } from '@principia/base/collection/immutable/HashSet'

import * as HM from '@principia/base/collection/immutable/HashMap'
import * as E from '@principia/base/Either'
import * as M from '@principia/base/Maybe'

export class CompletedRequestMap {
  constructor(private map: HashMap<AnyRequest, E.Either<any, any>>) {}

  concat = (that: CompletedRequestMap) => {
    return new CompletedRequestMap(
      HM.mutate_(this.map, (m) => {
        HM.iforEach_(that.map, (k, v) => {
          HM.set_(m, k, v)
        })
      })
    )
  }

  insert = <E, A>(request: Request<E, A>, result: E.Either<E, A>): CompletedRequestMap => {
    return new CompletedRequestMap(HM.set_(this.map, request, result))
  }

  contains = (request: any): boolean => {
    return HM.has_(this.map, request)
  }

  insertOption = <E, A>(request: Request<E, A>, result: E.Either<E, M.Maybe<A>>): CompletedRequestMap => {
    return E.match_(
      result,
      (e) => this.insert(request, E.left(e)),
      M.match(
        () => this,
        (a) => this.insert(request, E.right(a))
      )
    )
  }

  lookup = <E, A>(request: Request<E, A>): M.Maybe<E.Either<E, A>> => {
    return HM.get_(this.map, request)
  }

  get requests(): HashSet<AnyRequest> {
    return HM.keySet(this.map)
  }

  static empty(): CompletedRequestMap {
    return new CompletedRequestMap(HM.makeDefault())
  }
}
