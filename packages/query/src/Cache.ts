import type { AnyRequest, Request } from './Request'
import type { HashMap } from '@principia/base/collection/immutable/HashMap'
import type { _A, _E } from '@principia/base/prelude'
import type { URef } from '@principia/base/Ref'

import * as HM from '@principia/base/collection/immutable/HashMap'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import { tuple } from '@principia/base/tuple'

export interface Cache {
  get<A extends AnyRequest>(request: A): I.FIO<void, URef<M.Maybe<E.Either<_E<A>, _A<A>>>>>

  lookup<A extends AnyRequest>(
    request: A
  ): I.UIO<E.Either<URef<M.Maybe<E.Either<_E<A>, _A<A>>>>, URef<M.Maybe<E.Either<_E<A>, _A<A>>>>>>

  put<A extends AnyRequest>(request: A, result: URef<M.Maybe<E.Either<_E<A>, _A<A>>>>): I.UIO<void>
}

export class DefaultCache implements Cache {
  constructor(private state: URef<HashMap<AnyRequest, any>>) {}

  get<E, A>(request: Request<E, A>): I.FIO<void, URef<M.Maybe<E.Either<E, A>>>> {
    return pipe(
      this.state.get,
      I.map(HM.get(request)),
      I.get,
      I.orElseFail(() => undefined)
    )
  }

  lookup<E, A>(request: Request<E, A>): I.UIO<E.Either<URef<M.Maybe<E.Either<E, A>>>, URef<M.Maybe<E.Either<E, A>>>>> {
    return pipe(
      Ref.make(M.nothing<E.Either<E, A>>()),
      I.chain((ref) =>
        Ref.modify_(this.state, (map) =>
          pipe(
            HM.get_(map, request),
            M.match(
              () => tuple(E.left(ref), HM.set_(map, request, ref)),
              (ref) => tuple(E.right(ref), map)
            )
          )
        )
      )
    )
  }

  put<E, A>(request: Request<E, A>, result: URef<M.Maybe<E.Either<E, A>>>): I.UIO<void> {
    return I.asUnit(Ref.update_(this.state, (m) => HM.set_(m, request, result)))
  }
}

export const empty: I.UIO<Cache> = pipe(
  Ref.make(HM.makeDefault<AnyRequest, any>()),
  I.map((ref) => new DefaultCache(ref))
)
