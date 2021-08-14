import type { AnyRequest, Request } from './Request'
import type { HashMap } from '@principia/base/HashMap'
import type { URef } from '@principia/base/IO/Ref'
import type { _A, _E } from '@principia/base/prelude'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as HM from '@principia/base/HashMap'
import * as I from '@principia/base/IO'
import * as Ref from '@principia/base/IO/Ref'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'

export interface Cache {
  get<A extends AnyRequest>(request: A): I.FIO<void, URef<O.Option<E.Either<_E<A>, _A<A>>>>>

  lookup<A extends AnyRequest>(
    request: A
  ): I.UIO<E.Either<URef<O.Option<E.Either<_E<A>, _A<A>>>>, URef<O.Option<E.Either<_E<A>, _A<A>>>>>>

  put<A extends AnyRequest>(request: A, result: URef<O.Option<E.Either<_E<A>, _A<A>>>>): I.UIO<void>
}

export class DefaultCache implements Cache {
  constructor(private state: URef<HashMap<AnyRequest, any>>) {}

  get<E, A>(request: Request<E, A>): I.FIO<void, URef<O.Option<E.Either<E, A>>>> {
    return pipe(
      this.state.get,
      I.map(HM.get(request)),
      I.get,
      I.orElseFail(() => undefined)
    )
  }

  lookup<E, A>(
    request: Request<E, A>
  ): I.UIO<E.Either<URef<O.Option<E.Either<E, A>>>, URef<O.Option<E.Either<E, A>>>>> {
    return pipe(
      Ref.make(O.none<E.Either<E, A>>()),
      I.chain((ref) =>
        Ref.modify_(this.state, (map) =>
          pipe(
            HM.get_(map, request),
            O.match(
              () => tuple(E.left(ref), HM.set_(map, request, ref)),
              (ref) => tuple(E.right(ref), map)
            )
          )
        )
      )
    )
  }

  put<E, A>(request: Request<E, A>, result: URef<O.Option<E.Either<E, A>>>): I.UIO<void> {
    return I.asUnit(Ref.update_(this.state, (m) => HM.set_(m, request, result)))
  }
}

export const empty: I.UIO<Cache> = pipe(
  Ref.make(HM.makeDefault<AnyRequest, any>()),
  I.map((ref) => new DefaultCache(ref))
)
