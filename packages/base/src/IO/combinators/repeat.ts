// tracing: off

import type { Clock } from '../../Clock'
import type { Has } from '../../Has'
import type { Option } from '../../Option'
import type { IO } from '../core'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import * as E from '../../Either'
import { pipe } from '../../function'
import * as O from '../../Option'
import * as S from '../../Schedule'
import { chain, fail, map, map_, matchIO, orDie } from '../core'

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function repeat_<R, SR, E, A, B>(ef: IO<R, E, A>, sc: S.Schedule<SR, A, B>): IO<R & SR & Has<Clock>, E, B> {
  const trace = accessCallTrace()
  return repeatOrElse_(
    ef,
    sc,
    traceFrom(trace, (e) => fail(e))
  )
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace call
 */
export function repeat<SR, A, B>(sc: S.Schedule<SR, A, B>) {
  const trace = accessCallTrace()
  return <R, E>(ef: IO<R, E, A>) => traceCall(repeat_, trace)(ef, sc)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 2
 */
export function repeatOrElse_<R, E, A, R1, B, R2, E2, C>(
  ma: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, C | B> {
  return map_(repeatOrElseEither_(ma, sc, f), E.merge)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function repeatOrElse<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, B | C> {
  return (ma) => repeatOrElse_(ma, sc, f)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 2
 */
export function repeatOrElseEither_<R, E, A, R1, B, R2, E2, C>(
  fa: IO<R, E, A>,
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return pipe(
    S.driver(sc),
    chain((driver) => {
      function loop(a: A): IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
        return pipe(
          driver.next(a),
          matchIO(
            () => pipe(orDie(driver.last), map(E.right)),
            (b) =>
              pipe(
                fa,
                matchIO(
                  traceAs(f, (e) => pipe(f(e, O.some(b)), map(E.left))),
                  (a) => loop(a)
                )
              )
          )
        )
      }
      return pipe(
        fa,
        matchIO(
          traceAs(f, (e) => pipe(f(e, O.none()), map(E.left))),
          (a) => loop(a)
        )
      )
    })
  )
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @trace 1
 */
export function repeatOrElseEither<E, A, R1, B, R2, E2, C>(
  sc: S.Schedule<R1, A, B>,
  f: (e: E, o: Option<B>) => IO<R2, E2, C>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  return (ma) => repeatOrElseEither_(ma, sc, f)
}
