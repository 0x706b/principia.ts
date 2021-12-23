import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Stream } from '../core'

import * as C from '../../Chunk'
import * as E from '../../Either'
import { flow, pipe } from '../../function'
import * as IO from '../../IO'
import * as Ca from '../../IO/Cause'
import * as Ex from '../../IO/Exit'
import * as M from '../../Maybe'
import { tuple } from '../../tuple/core'
import { combineChunks_ } from '../core'
import { zipChunks_ } from '../utils'

interface Running {
  readonly _tag: 'Running'
}
interface LeftDone {
  readonly _tag: 'LeftDone'
}
interface RightDone {
  readonly _tag: 'RightDone'
}
interface End {
  readonly _tag: 'End'
}
type Status = Running | LeftDone | RightDone | End
type State<A, B> = readonly [Status, E.Either<C.Chunk<A>, C.Chunk<B>>]

const handleSuccess = <A, B, C>(
  maybeA: M.Maybe<C.Chunk<A>>,
  maybeB: M.Maybe<C.Chunk<B>>,
  excess: E.Either<C.Chunk<A>, C.Chunk<B>>,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): Ex.Exit<never, readonly [C.Chunk<C>, State<A, B>]> => {
  const [excessL, excessR] = E.match_(
    excess,
    (l) => tuple(l, C.empty<B>()),
    (r) => tuple(C.empty<A>(), r)
  )
  const chunkL = M.match_(
    maybeA,
    () => excessL,
    (upd) => C.concat_(excessL, upd)
  )
  const chunkR = M.match_(
    maybeB,
    () => excessR,
    (upd) => C.concat_(excessR, upd)
  )
  const [emit, newExcess]  = zipChunks_(chunkL, chunkR, both)
  const [fullEmit, status] = M.isJust(maybeA)
    ? M.isJust(maybeB)
      ? tuple(emit, <Status>{ _tag: 'Running' })
      : tuple(emit, <Status>{ _tag: 'RightDone' })
    : M.isJust(maybeB)
    ? tuple(emit, <Status>{ _tag: 'LeftDone' })
    : tuple(C.concat_(emit, E.match_(newExcess, C.map(left), C.map(right))), <Status>{ _tag: 'End' })

  return Ex.succeed([fullEmit, [status, newExcess]])
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 */
export function zipAllWithExec_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  exec: ExecutionStrategy,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  return combineChunks_(
    ma,
    mb,
    tuple(<Status>{ _tag: 'Running' }, E.left<C.Chunk<A>, C.Chunk<B>>(C.empty())),
    ([state, excess], pullL, pullR) => {
      switch (state._tag) {
        case 'Running': {
          switch (exec._tag) {
            case 'Sequential': {
              return pipe(
                pullL,
                IO.optional,
                IO.crossWith(IO.optional(pullR), (l, r) => handleSuccess(l, r, excess, left, right, both)),
                IO.catchAllCause(flow(Ca.map(M.just), Ex.failCause, IO.succeed))
              )
            }
            default: {
              return pipe(
                pullL,
                IO.optional,
                IO.crossWithC(IO.optional(pullR), (l, r) => handleSuccess(l, r, excess, left, right, both)),
                IO.catchAllCause(flow(Ca.map(M.just), Ex.failCause, IO.succeed))
              )
            }
          }
        }
        case 'LeftDone': {
          return pipe(
            pullR,
            IO.optional,
            IO.map((r) => handleSuccess(M.nothing(), r, excess, left, right, both)),
            IO.catchAllCause(flow(Ca.map(M.just), Ex.failCause, IO.succeed))
          )
        }
        case 'RightDone': {
          return pipe(
            pullL,
            IO.optional,
            IO.map((l) => handleSuccess(l, M.nothing(), excess, left, right, both)),
            IO.catchAllCause(flow(Ca.map(M.just), Ex.failCause, IO.succeed))
          )
        }
        case 'End': {
          return pipe(M.nothing(), Ex.fail, IO.succeed)
        }
      }
    }
  )
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 *
 * @dataFirst zipAllWithExec_
 */
export function zipAllWithExec<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  exec: ExecutionStrategy,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => zipAllWithExec_(ma, mb, exec, left, right, both)
}
