// tracing: off

import type { Exit } from '../../Exit'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as Ex from '../../Exit/core'
import { unit } from '../core'
import { bracketExit_ } from './bracketExit'

/**
 * Same as `bracketExit_` but executes the release IO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function bracketOnError_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: IO<R, E, A>,
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(
    acquire,
    use,
    traceAs(release, (a, e) =>
      Ex.match_(
        e,
        () => release(a, e),
        () => unit()
      )
    )
  )
}

/**
 * Same as `bracketExit` but executes the release IO only if there was an error.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 * @trace 1
 */
export function bracketOnError<A, R1, E1, A1, R2, E2, A2>(
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => IO<R2, E2, A2>
): <R, E>(acquire: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2 | E, A1> {
  return (acquire) => bracketOnError_(acquire, use, release)
}
