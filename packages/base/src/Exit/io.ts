import type { IO } from '../IO/core'
import type { Exit } from './core'

import { pipe } from '../function'
import * as I from '../IO/core'
import * as Ex from './core'

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachIO_<E2, A2, R, E, A>(
  exit: Exit<E2, A2>,
  f: (a: A2) => IO<R, E, A>
): IO<R, never, Exit<E | E2, A>> {
  return Ex.match_(
    exit,
    (c): I.URIO<R, Exit<E | E2, A>> => pipe(Ex.halt(c), I.succeed),
    (a) => pipe(f(a), I.result)
  )
}

/**
 * Applies the function `f` to the successful result of the `Exit` and
 * returns the result in a new `Exit`.
 */
export function foreachIO<A2, R, E, A>(
  f: (a: A2) => IO<R, E, A>
): <E2>(exit: Exit<E2, A2>) => IO<R, never, Exit<E | E2, A>> {
  return (exit) => foreachIO_(exit, f)
}

export function mapIO_<R, E, E1, A, A1>(exit: Exit<E, A>, f: (a: A) => IO<R, E1, A1>): IO<R, never, Exit<E | E1, A1>> {
  return foreachIO_(exit, f)
}

export function mapIO<R, E1, A, A1>(
  f: (a: A) => IO<R, E1, A1>
): <E>(exit: Exit<E, A>) => IO<R, never, Exit<E1 | E, A1>> {
  return (exit) => mapIO_(exit, f)
}
