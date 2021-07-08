import type { AnyRequest, Request } from '../Request'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { URef } from '@principia/base/Ref'
import type { _A, _E } from '@principia/base/util/types'

export const BlockedRequestTypeId = Symbol('@principia/query/internal/BlockedRequest')
export type BlockedRequestTypeId = typeof BlockedRequestTypeId

export class BlockedRequest<A> {
  readonly _A!: () => A

  readonly [BlockedRequestTypeId]: BlockedRequestTypeId = BlockedRequestTypeId

  constructor(readonly request: Request<_E<A>, _A<A>>, readonly result: URef<Option<Either<_E<A>, _A<A>>>>) {}
}

export function make<A extends AnyRequest>(
  request: A,
  result: URef<Option<Either<_E<A>, _A<A>>>>
): BlockedRequest<A> {
  return new BlockedRequest(request, result)
}
