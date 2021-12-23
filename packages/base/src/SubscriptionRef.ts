import type { USRef } from './SRef'

import { pipe } from './function'
import * as I from './IO'
import * as RefM from './SRef'
import * as S from './Stream'

export class SubscriptionRef<A> {
  constructor(readonly ref: USRef<A>, readonly changed: S.Stream<unknown, never, A>) {}
}

export function make<A>(a: A): I.UIO<SubscriptionRef<A>> {
  return pipe(
    RefM.dequeue(a),
    I.map(([ref, queue]) => new SubscriptionRef(ref, S.fromQueue_(queue)))
  )
}
