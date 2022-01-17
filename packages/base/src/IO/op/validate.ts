// tracing: off

import type { Conc } from '../../collection/immutable/Conc/core'
import type { Either } from '../../Either'
import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import * as Co from '../../collection/immutable/Conc/core'
import * as E from '../../Either'
import { either, foreach_, map_, subsumeEither } from '../core'
import { foreachC_ } from './foreachC'
import { foreachExec_ } from './foreachExec'

const mergeExits =
  <E, B>() =>
  (exits: Conc<Either<E, B>>): Either<Conc<E>, Conc<B>> => {
    const errors  = Co.builder<E>()
    const results = Co.builder<B>()
    let errored   = false

    Co.forEach_(exits, (e) => {
      if (e._tag === 'Left') {
        errored = true
        errors.append(e.left)
      } else {
        results.append(e.right)
      }
    })

    return errored ? E.left(errors.result()) : E.right(results.result())
  }

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @trace 1
 */
export function validate_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>): IO<R, Conc<E>, Conc<B>> {
  return subsumeEither(
    map_(
      foreach_(
        as,
        traceAs(f, (a) => either(f(a)))
      ),
      mergeExits<E, B>()
    )
  )
}

/**
 * @trace 0
 */
export function validate<A, R, E, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, Conc<E>, Conc<B>> {
  return (as) => validate_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @trace 1
 */
export function validateC_<A, R, E, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>) {
  return subsumeEither(
    map_(
      foreachC_(
        as,
        traceAs(f, (a) => either(f(a)))
      ),
      mergeExits<E, B>()
    )
  )
}

/**
 * @trace 0
 */
export function validateC<A, R, E, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, Conc<E>, Conc<B>> {
  return (as) => validateC_(as, f)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @trace 2
 */
export function validateExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => IO<R, E, B>
): IO<R, Conc<E>, Conc<B>> {
  return subsumeEither(
    map_(
      foreachExec_(
        as,
        es,
        traceAs(f, (a) => either(f(a)))
      ),
      mergeExits<E, B>()
    )
  )
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost.
 *
 * @trace 1
 */
export function validateExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, Conc<E>, Conc<B>> {
  return (as) => validateExec_(as, es, f)
}
