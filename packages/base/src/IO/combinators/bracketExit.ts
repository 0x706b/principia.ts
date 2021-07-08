// tracing: off

import type { Exit } from '../../Exit/core'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as C from '../../Cause/core'
import * as Ex from '../../Exit'
import { chain_, done, halt, matchCauseIO_, result } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` IO
 * succeeds. If `use` fails, then after release, the returned IO will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function bracketExit_<R, E, A, E1, R1, A1, R2, E2>(
  acquire: IO<R, E, A>,
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => IO<R2, E2, any>
): IO<R & R1 & R2, E | E1 | E2, A1> {
  return uninterruptibleMask(({ restore }) =>
    chain_(
      acquire,
      traceAs(use, (a) =>
        chain_(
          result(restore(use(a))),
          traceAs(release, (e) =>
            matchCauseIO_(
              release(a, e),
              (cause2) =>
                halt(
                  Ex.match_(
                    e,
                    (_) => C.then(_, cause2),
                    (_) => cause2
                  )
                ),
              (_) => done(e)
            )
          )
        )
      )
    )
  )
}

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` IO
 * succeeds. If `use` fails, then after release, the returned IO will fail
 * with the same error.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 * @trace 1
 */
export function bracketExit<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => IO<R1, E1, B>,
  release: (a: A, e: Exit<E1, B>) => IO<R2, E2, C>
): <R, E>(acquire: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release)
}
