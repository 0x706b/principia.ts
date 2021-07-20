import type { AnyRequest, Request } from './Request'
import type { HashMap } from '@principia/base/HashMap'
import type { HashSet } from '@principia/base/HashSet'

import * as E from '@principia/base/Either'
import * as HM from '@principia/base/HashMap'
import * as O from '@principia/base/Option'

export class CompletedRequestMap {
  constructor(private map: HashMap<AnyRequest, E.Either<any, any>>) {}

  concat = (that: CompletedRequestMap) => {
    return new CompletedRequestMap(
      HM.mutate_(this.map, (m) => {
        HM.forEach_(that.map, (v, k) => {
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

  insertOption = <E, A>(request: Request<E, A>, result: E.Either<E, O.Option<A>>): CompletedRequestMap => {
    return E.match_(
      result,
      (e) => this.insert(request, E.left(e)),
      O.match(
        () => this,
        (a) => this.insert(request, E.right(a))
      )
    )
  }

  lookup = <E, A>(request: Request<E, A>): O.Option<E.Either<E, A>> => {
    return HM.get_(this.map, request)
  }

  get requests(): HashSet<AnyRequest> {
    return HM.keySet(this.map)
  }

  static empty(): CompletedRequestMap {
    return new CompletedRequestMap(HM.makeDefault())
  }
}
