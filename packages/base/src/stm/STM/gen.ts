import type { _E, _R } from '../../util/types'
import type { STM } from './primitives'

import { defer } from './core'
import { chain_, succeed } from './primitives'

export class GenSTM<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(readonly STM: STM<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSTM<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  return new GenSTM(_)
}

/**
 * Do simulation using Generators
 */
export function gen<T extends GenSTM<any, any, any>, A>(
  f: (i: { <R, E, A>(_: STM<R, E, A>): GenSTM<R, E, A> }) => Generator<T, A, any>
): STM<_R<T>, _E<T>, A> {
  return defer(() => {
    const iterator = f(adapter as any)
    const state    = iterator.next()

    function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): STM<any, any, A> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value.STM, (val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}
