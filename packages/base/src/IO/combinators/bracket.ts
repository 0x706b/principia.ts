// tracing: off

import type { IO } from '../core'

import { bracketExit_ } from './bracketExit'

/**
 * When this IO represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this IO, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` IO will not be interrupted, and will be
 * executed so long as this IO successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` IO is
 * executed.
 *
 * If the `release` IO fails, then the entire IO will fail even
 * if the `use` IO succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` IO can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 * @trace 2
 */
export function bracket_<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: IO<R, E, A>,
  use: (a: A) => IO<R1, E1, A1>,
  release: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, release)
}

/**
 * When this IO represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this IO, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` IO will not be interrupted, and will be
 * executed so long as this IO successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` IO is
 * executed.
 *
 * If the `release` IO fails, then the entire IO will fail even
 * if the `use` IO succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` IO can be caught and ignored.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 0
 * @trace 1
 */
export function bracket<A, R1, E1, B, R2, E2, C>(
  use: (a: A) => IO<R1, E1, B>,
  release: (a: A) => IO<R2, E2, C>
): <R, E>(acquire: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2 | E, B> {
  return (acquire) => bracketExit_(acquire, use, release)
}
