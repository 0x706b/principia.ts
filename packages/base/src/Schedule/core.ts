import type { Either } from '../Either'
import type { Has } from '../Has'
import type { FIO, IO, UIO } from '../IO/core'
import type { Option } from '../Option'
import type { Decision, StepFunction } from './Decision'

import { Clock } from '../Clock'
import * as E from '../Either'
import { NoSuchElementError } from '../Error'
import { pipe } from '../function'
import * as I from '../IO/core'
import * as O from '../Option'
import { Random } from '../Random'
import * as Ref from '../Ref/core'
import { tuple } from '../tuple'
import { done, makeContinue, makeDone, toDone } from './Decision'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export class Schedule<R, I, O> {
  constructor(readonly step: StepFunction<R, I, O>) {}
  ['&&']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return intersect_(this, that)
  }
  ['***']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
    return zipInOut_(this, that)
  }
  ['*>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O1> {
    return intersectRight_(this, that)
  }
  ['<*']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O> {
    return intersectLeft_(this, that)
  }
  ['+++']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, Either<I, I1>, O | O1> {
    return chooseMerge_(this, that)
  }
  ['++']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, O | O1> {
    return follows_(this, that)
  }
  ['<*>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return intersect_(this, that)
  }
  ['>>>']<R1, O1>(that: Schedule<R1, O, O1>): Schedule<R & R1, I, O1> {
    return andThen_(this, that)
  }
  ['<<<']<R1, I1>(that: Schedule<R1, I1, I>): Schedule<R & R1, I1, O> {
    return compose_(this, that)
  }
  ['||']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, readonly [O, O1]> {
    return union_(this, that)
  }
  ['|||']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, E.Either<I, I1>, O | O1> {
    return chooseMerge_(this, that)
  }
  ['<||>']<R1, I1, O1>(that: Schedule<R1, I1, O1>): Schedule<R & R1, I & I1, Either<O, O1>> {
    return followsEither_(this, that)
  }
  ['<$>']<O1>(f: (o: O) => O1): Schedule<R, I, O1> {
    return map_(this, f)
  }
}

export class Driver<R, I, O> {
  constructor(
    readonly next: (input: I) => IO<R, Option<never>, O>,
    readonly last: FIO<Error, O>,
    readonly reset: UIO<void>
  ) {}
}

/*
 * -------------------------------------------------------------------------------------------------
 * Runtime
 * -------------------------------------------------------------------------------------------------
 */

export function driver<R, I, O>(schedule: Schedule<R, I, O>): I.UIO<Driver<Has<Clock> & R, I, O>> {
  return pipe(
    Ref.make([O.none<O>(), schedule.step] as const),
    I.map((ref) => {
      const reset = ref.set([O.none(), schedule.step])

      const last = pipe(
        ref.get,
        I.chain(([o, _]) =>
          O.match_(
            o,
            () => I.fail(new NoSuchElementError('Driver.last')),
            (b) => I.pure(b)
          )
        )
      )

      const next = (input: I) =>
        I.gen(function* (_) {
          const step = yield* _(I.map_(ref.get, ([, o]) => o))
          const now  = yield* _(Clock.currentTime)
          const dec  = yield* _(step(now, input))
          switch (dec._tag) {
            case 'Done': {
              return yield* _(pipe(ref.set(tuple(O.some(dec.out), done(dec.out))), I.crossSecond(I.fail(O.none()))))
            }
            case 'Continue': {
              return yield* _(
                pipe(
                  ref.set(tuple(O.some(dec.out), dec.next)),
                  I.asLazy(() => dec.interval - now),
                  I.chain((s) => (s > 0 ? Clock.sleep(s) : I.unit())),
                  I.asLazy(() => dec.out)
                )
              )
            }
          }
        })

      return new Driver(next, last, reset)
    })
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function intersect_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, readonly [O, O1]> {
  return intersectWith_(sc, that, (d, d2) => Math.max(d, d2))
}

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function intersect<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (sc) => intersect_(sc, that)
}

/**
 * Same as intersect but ignores the right output.
 */
export function intersectLeft_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O> {
  return map_(intersect_(sc, that), ([_]) => _)
}

/**
 * Same as intersect but ignores the right output.
 */
export function intersectLeft<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O> {
  return (sc) => intersectLeft_(sc, that)
}

/**
 * Same as intersect but ignores the left output.
 */
export function intersectRight_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O1> {
  return map_(intersect_(sc, that), ([_, __]) => __)
}

/**
 * Same as intersect but ignores the left output.
 */
export function intersectRight<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O1> {
  return (sc) => intersectRight_(sc, that)
}

/**
 * Equivalent to `intersect` followed by `map`.
 */
export function intersectMap_<R, I, O, R1, I1, O1, O2>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): Schedule<R & R1, I & I1, O2> {
  return map_(intersect_(sc, that), ([o, o1]) => f(o, o1))
}

/**
 * Equivalent to `intersect` followed by `map`.
 */
export function intersectMap<R1, I1, O, O1, O2>(
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O2> {
  return (sc) => intersectMap_(sc, that, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

const mapIOLoop =
  <R, I, O, R1, O1>(self: StepFunction<R, I, O>, f: (o: O) => I.IO<R1, never, O1>): StepFunction<R & R1, I, O1> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.map_(f(d.out), (o): Decision<R & R1, I, O1> => makeDone(o))
        }
        case 'Continue': {
          return I.map_(f(d.out), (o) => makeContinue(o, d.interval, mapIOLoop(d.next, f)))
        }
      }
    })

export function mapIO_<R, I, O, R1, O1>(sc: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, O1>) {
  return new Schedule(mapIOLoop(sc.step, (o) => f(o)))
}

export function mapIO<R1, O, O1>(f: (o: O) => I.IO<R1, never, O1>) {
  return <R, I>(sc: Schedule<R, I, O>) => mapIO_(sc, f)
}

export function map_<R, I, A, B>(fa: Schedule<R, I, A>, f: (a: A) => B): Schedule<R, I, B> {
  return mapIO_(fa, (o) => I.pure(f(o)))
}

export function map<A, B>(f: (a: A) => B) {
  return <R, I>(fa: Schedule<R, I, A>): Schedule<R, I, B> => map_(fa, f)
}

export function as_<R, I, O, O1>(sc: Schedule<R, I, O>, o: O1) {
  return map_(sc, () => o)
}

export function as<O1>(o: O1) {
  return <R, I, O>(sc: Schedule<R, I, O>) => as_(sc, o)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

const giveAllLoop =
  <R, I, O>(self: StepFunction<R, I, O>, r: R): StepFunction<unknown, I, O> =>
  (now, i) =>
    I.giveAll(r)(
      I.map_(self(now, i), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(d.out)
          }
          case 'Continue': {
            return makeContinue(d.out, d.interval, giveAllLoop(d.next, r))
          }
        }
      })
    )

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function giveAll_<R, I, O>(sc: Schedule<R, I, O>, r: R): Schedule<unknown, I, O> {
  return new Schedule(giveAllLoop(sc.step, r))
}

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function giveAll<R>(r: R): <I, O>(sc: Schedule<R, I, O>) => Schedule<unknown, I, O> {
  return (sc) => giveAll_(sc, r)
}

const givesLoop =
  <R, R1, I, O>(self: StepFunction<R, I, O>, r: (_: R1) => R): StepFunction<R1, I, O> =>
  (now, i) =>
    I.gives_(
      I.map_(self(now, i), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(d.out)
          }
          case 'Continue': {
            return makeContinue(d.out, d.interval, givesLoop(d.next, r))
          }
        }
      }),
      r
    )

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function gives_<R, R1, I, O>(sc: Schedule<R, I, O>, r: (_: R1) => R): Schedule<R1, I, O> {
  return new Schedule(givesLoop(sc.step, r))
}

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function gives<R, R1>(r: (_: R1) => R): <I, O>(sc: Schedule<R, I, O>) => Schedule<R1, I, O> {
  return (sc) => gives_(sc, r)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 */
export function asUnit<R, I, O, R1>(sc: Schedule<R, I, O>): Schedule<R & R1, I, void> {
  return as<void>(undefined)(sc)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Schedules
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayIO_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, number>
): Schedule<R & R1, I, O> {
  return modifyDelayIO_(sc, (o, d) => I.map_(f(o), (i) => i + d))
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayIO<R1, O>(f: (o: O) => I.IO<R1, never, number>) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R & R1, I, O> => addDelayIO_(sc, f)
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => number) {
  return addDelayIO_(sc, (o) => I.pure(f(o)))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay<O>(f: (o: O) => number) {
  return <R, I>(sc: Schedule<R, I, O>) => addDelay_(sc, f)
}

const followsEitherLoop =
  <R, I, O, R1, I1, O1>(
    sc: StepFunction<R, I, O>,
    that: StepFunction<R1, I1, O1>,
    onLeft: boolean
  ): StepFunction<R & R1, I & I1, Either<O, O1>> =>
  (now, i) =>
    onLeft
      ? I.chain_(sc(now, i), (d) => {
          switch (d._tag) {
            case 'Continue': {
              return I.pure(makeContinue(E.left(d.out), d.interval, followsEitherLoop(d.next, that, true)))
            }
            case 'Done': {
              return followsEitherLoop(sc, that, false)(now, i)
            }
          }
        })
      : I.map_(that(now, i), (d) => {
          switch (d._tag) {
            case 'Done': {
              return makeDone(E.right(d.out))
            }
            case 'Continue': {
              return makeContinue(E.right(d.out), d.interval, followsEitherLoop(sc, d.next, false))
            }
          }
        })

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function followsEither_<R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) {
  return new Schedule(followsEitherLoop(sc.step, that.step, true))
}

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function followsEither<R1, I1, O1>(that: Schedule<R1, I1, O1>) {
  return <R, I, O>(sc: Schedule<R, I, O>) => followsEither_(sc, that)
}

export function follows_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, I & I1, O | O1> {
  return map_(
    followsEither_(sc, that),
    E.match(
      (o) => o,
      (o1) => o1
    )
  )
}

export function follows<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O | O1> {
  return (sc) => follows_(sc, that)
}

const intersectWithLoop =
  <R, I, O, R1, I1, O1>(
    sc: StepFunction<R, I, O>,
    that: StepFunction<R1, I1, O1>,
    f: (d1: number, d2: number) => number
  ): StepFunction<R & R1, I & I1, [O, O1]> =>
  (now, i) => {
    const left  = sc(now, i)
    const right = that(now, i)

    return I.crossWith_(left, right, (l, r) => {
      switch (l._tag) {
        case 'Done': {
          switch (r._tag) {
            case 'Done': {
              return makeDone<[O, O1]>([l.out, r.out])
            }
            case 'Continue': {
              return makeDone<[O, O1]>([l.out, r.out])
            }
          }
        }
        /* eslint-disable-next-line no-fallthrough */
        case 'Continue': {
          switch (r._tag) {
            case 'Done': {
              return makeDone<[O, O1]>([l.out, r.out])
            }
            case 'Continue': {
              return makeContinue([l.out, r.out], f(l.interval, r.interval), intersectWithLoop(l.next, r.next, f))
            }
          }
        }
      }
    })
  }

export function intersectWith_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (d1: number, d2: number) => number
): Schedule<R & R1, I & I1, readonly [O, O1]> {
  return new Schedule(intersectWithLoop(sc.step, that.step, f))
}

export function intersectWith<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): (
  f: (d1: number, d2: number) => number
) => <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (f) => (sc) => intersectWith_(sc, that, f)
}

const checkIOLoop =
  <R, I, O, R1>(
    self: StepFunction<R, I, O>,
    test: (i: I, o: O) => I.IO<R1, never, boolean>
  ): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.pure(makeDone(d.out))
        }
        case 'Continue': {
          return I.map_(test(i, d.out), (b) =>
            b ? makeContinue(d.out, d.interval, checkIOLoop(d.next, test)) : makeDone(d.out)
          )
        }
      }
    })

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkIO_<R, I, O, R1>(sc: Schedule<R, I, O>, test: (i: I, o: O) => I.IO<R1, never, boolean>) {
  return new Schedule(checkIOLoop(sc.step, test))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkIO<R1, I, O>(
  test: (i: I, o: O) => I.IO<R1, never, boolean>
): <R>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => checkIO_(sc, test)
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check_<R, I, O>(sc: Schedule<R, I, O>, test: (i: I, o: O) => boolean): Schedule<R, I, O> {
  return checkIO_(sc, (i, o) => I.pure(test(i, o)))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check<I, O>(test: (i: I, o: O) => boolean): <R>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => check_(sc, test)
}

const chooseLoop =
  <R, I, O, R1, I1, O1>(
    sc: StepFunction<R, I, O>,
    that: StepFunction<R1, I1, O1>
  ): StepFunction<R & R1, Either<I, I1>, Either<O, O1>> =>
  (now, either) =>
    E.match_(
      either,
      (i) =>
        I.map_(sc(now, i), (d) => {
          switch (d._tag) {
            case 'Done': {
              return makeDone(E.left(d.out))
            }
            case 'Continue': {
              return makeContinue(E.left(d.out), d.interval, chooseLoop(d.next, that))
            }
          }
        }),
      (i2) =>
        I.map_(that(now, i2), (d) => {
          switch (d._tag) {
            case 'Done': {
              return makeDone(E.right(d.out))
            }
            case 'Continue': {
              return makeContinue(E.right(d.out), d.interval, chooseLoop(sc, d.next))
            }
          }
        })
    )

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, Either<I, I1>, Either<O, O1>> {
  return new Schedule(chooseLoop(sc.step, that.step))
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, Either<I, I1>, Either<O, O1>> {
  return (sc) => choose_(sc, that)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, Either<I, I1>, O | O1> {
  return map_(choose_(sc, that), E.merge)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, Either<I, I1>, O1 | O> {
  return (sc) => chooseMerge_(sc, that)
}

/**
 * Returns a new schedule that collects the outputs of a `Schedule` into an array.
 */
export function collectAll<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, readonly O[]> {
  return fold_(sc, [] as ReadonlyArray<O>, (xs, x) => [...xs, x])
}

function andThenLoop<R, I, O, R1, O1>(
  s1: StepFunction<R, I, O>,
  s2: StepFunction<R1, O, O1>
): StepFunction<R & R1, I, O1> {
  return (now, i) =>
    pipe(
      s1(now, i),
      I.chain((d) => {
        switch (d._tag) {
          case 'Done': {
            return I.map_(s2(now, d.out), toDone)
          }
          case 'Continue': {
            return I.map_(s2(now, d.out), (d2) => {
              switch (d2._tag) {
                case 'Done': {
                  return makeDone(d2.out)
                }
                case 'Continue': {
                  return makeContinue(d2.out, Math.max(d.interval, d2.interval), andThenLoop(d.next, d2.next))
                }
              }
            })
          }
        }
      })
    )
}

export function andThen_<R, I, O, R1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, O, O1>): Schedule<R & R1, I, O1> {
  return new Schedule(andThenLoop(sc.step, that.step))
}

export function andThen<O, R1, O1>(
  that: Schedule<R1, O, O1>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O1> {
  return (sc) => andThen_(sc, that)
}

export function compose_<R, I, O, R1, I1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, I>): Schedule<R & R1, I1, O> {
  return andThen_(that, sc)
}

export function compose<I, R1, I1>(
  that: Schedule<R1, I1, I>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I1, O> {
  return (sc) => compose_(sc, that)
}

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export function delayedIO_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (d: number) => I.IO<R1, never, number>) {
  return modifyDelayIO_(sc, (_, d) => f(d))
}

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export function delayedIO<R1>(f: (d: number) => I.IO<R1, never, number>) {
  return <R, I, O>(sc: Schedule<R, I, O>) => delayedIO_(sc, f)
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed_<R, I, O>(sc: Schedule<R, I, O>, f: (d: number) => number) {
  return delayedIO_(sc, (d) => I.pure(f(d)))
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed(f: (d: number) => number) {
  return <R, I, O>(sc: Schedule<R, I, O>) => delayed_(sc, f)
}

export function duration(n: number) {
  return new Schedule((now, _: unknown) => I.pure(makeContinue(0, now + n, () => I.pure(makeDone(n)))))
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayedFrom<R, I>(sc: Schedule<R, I, number>) {
  return addDelay_(sc, (x) => x)
}

export function exponential(base: number, factor = 2): Schedule<unknown, unknown, number> {
  return delayedFrom(map_(forever, (i) => base * Math.pow(factor, i)))
}

export function union_<R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) {
  return intersectWith_(sc, that, (d1, d2) => Math.min(d1, d2))
}

export function union<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, readonly [O, O1]> {
  return (sc) => union_(sc, that)
}

export function unionWith_<R, I, O, R1, I1, O1, O2>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>,
  f: (o: O, o1: O1) => O2
): Schedule<R & R1, I & I1, O2> {
  return map_(union_(sc, that), ([o, o1]) => f(o, o1))
}

export function unionWith<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <O, O2>(f: (o: O, o1: O1) => O2) => <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I & I1, O2> {
  return (f) => (sc) => unionWith_(sc, that, f)
}

const ensuringLoop =
  <R, I, O, R1>(self: StepFunction<R, I, O>, finalizer: I.IO<R1, never, any>): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.asLazy_(finalizer, () => makeDone(d.out))
        }
        case 'Continue': {
          return I.pure(makeContinue(d.out, d.interval, ensuringLoop(d.next, finalizer)))
        }
      }
    })

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `IO#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring_<R, I, O, R1>(sc: Schedule<R, I, O>, finalizer: I.IO<R1, never, any>): Schedule<R & R1, I, O> {
  return new Schedule(ensuringLoop(sc.step, finalizer))
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `IO#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring<R1>(
  finalizer: I.IO<R1, never, any>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => ensuring_(sc, finalizer)
}

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * </pre>
 */
export function fixed(interval: number): Schedule<unknown, unknown, number> {
  type State = { startMillis: number, lastRun: number }

  const loop =
    (startMillis: Option<State>, n: number): StepFunction<unknown, unknown, number> =>
    (now, _) =>
      I.pure(
        O.match_(
          startMillis,
          () => makeContinue(n + 1, now + interval, loop(O.some({ startMillis: now, lastRun: now }), n + 1)),
          ({ lastRun, startMillis }) => {
            const runningBehind = now > lastRun + interval
            const boundary      = interval === 0 ? interval : interval - ((now - startMillis) % interval)
            const sleepTime     = boundary === 0 ? interval : boundary
            const nextRun       = runningBehind ? now : now + sleepTime

            return makeContinue(n + 1, nextRun, loop(O.some<State>({ startMillis, lastRun: nextRun }), n + 1))
          }
        )
      )

  return new Schedule(loop(O.none(), 0))
}

const foldIOLoop =
  <R, I, O, R1, B>(
    sf: StepFunction<R, I, O>,
    b: B,
    f: (b: B, o: O) => I.IO<R1, never, B>
  ): StepFunction<R & R1, I, B> =>
  (now, i) =>
    I.chain_(sf(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.pure(makeDone(b))
        }
        case 'Continue': {
          return I.map_(f(b, d.out), (b2) => makeContinue(b2, d.interval, foldIOLoop(d.next, b2, f)))
        }
      }
    })

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export function foldIO_<R, I, O, R1, B>(
  sc: Schedule<R, I, O>,
  b: B,
  f: (b: B, o: O) => I.IO<R1, never, B>
): Schedule<R & R1, I, B> {
  return new Schedule(foldIOLoop(sc.step, b, f))
}

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export function foldIO<R1, O, B>(
  b: B,
  f: (b: B, o: O) => I.IO<R1, never, B>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, B> {
  return (sc) => foldIO_(sc, b, f)
}

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export function fold_<R, I, O, B>(sc: Schedule<R, I, O>, b: B, f: (b: B, o: O) => B): Schedule<R, I, B> {
  return foldIO_(sc, b, (b, o) => I.pure(f(b, o)))
}

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export function fold<O, B>(b: B, f: (b: B, o: O) => B): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, B> {
  return (sc) => fold_(sc, b, f)
}

/**
 * Returns a new schedule that packs the input and output of this schedule into the first
 * element of a tuple. This allows carrying information through this schedule.
 */
export function fst<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, readonly [I, A], readonly [O, A]> {
  return (sc) => zipInOut_(sc, identity<A>())
}

/**
 * A schedule that always recurs, mapping input values through the
 * specified function.
 */
export function fromFunction<A, B>(f: (a: A) => B): Schedule<unknown, A, B> {
  return map_(identity<A>(), f)
}

/**
 * A schedule that recurs forever and produces a count of repeats.
 */
export const forever = unfold(0, (n) => n + 1)

const identityLoop =
  <A>(): StepFunction<unknown, A, A> =>
  (now, i) =>
    I.pure(makeContinue(i, now, identityLoop()))

/**
 * A schedule that always recurs and returns inputs as outputs.
 */
export function identity<A>(): Schedule<unknown, A, A> {
  return new Schedule(identityLoop<A>())
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered_<R, I, O>(
  sc: Schedule<R, I, O>,
  { max = 0.1, min = 0 }: { min?: number, max?: number } = {}
): Schedule<R & Has<Random>, I, O> {
  return delayedIO_(sc, (d) => I.map_(Random.next, (r) => d * min * (1 - r) + d * max * r))
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered({ max = 0.1, min = 0 }: { min?: number, max?: number } = {}): <R, I, O>(
  sc: Schedule<R, I, O>
) => Schedule<R & Has<Random>, I, O> {
  return (sc) => jittered_(sc, { min, max })
}

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function linear(base: number): Schedule<unknown, unknown, number> {
  return delayedFrom(map_(forever, (i) => base * (i + 1)))
}

/**
 * Returns a new schedule that makes this schedule available on the `Left` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function left<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, Either<I, A>, Either<O, A>> {
  return (sc) => choose_(sc, identity<A>())
}

const repeatLoop =
  <R, I, O>(init: StepFunction<R, I, O>, self: StepFunction<R, I, O> = init): StepFunction<R, I, O> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return repeatLoop(init, self)(now, i)
        }
        case 'Continue': {
          return I.pure(makeContinue(d.out, d.interval, repeatLoop(init, d.next)))
        }
      }
    })

/**
 * Returns a new schedule that loops this one continuously, resetting the state
 * when this schedule is done.
 */
export function repeat<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, O> {
  return new Schedule(repeatLoop(sc.step))
}

/**
 * Returns a new schedule that makes this schedule available on the `Right` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function right<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, Either<A, I>, Either<A, O>> {
  return (sc) => choose_(identity<A>(), sc)
}

const modifyDelayIOLoop =
  <R, I, O, R1>(
    sf: StepFunction<R, I, O>,
    f: (o: O, d: number) => I.IO<R1, never, number>
  ): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(sf(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.pure(makeDone(d.out))
        }
        case 'Continue': {
          const delay = d.interval - now

          return I.map_(f(d.out, delay), (duration) =>
            makeContinue(d.out, now + duration, modifyDelayIOLoop(d.next, f))
          )
        }
      }
    })

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayIO_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O, d: number) => I.IO<R1, never, number>
): Schedule<R & R1, I, O> {
  return new Schedule(modifyDelayIOLoop(sc.step, f))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayIO<R1, O>(f: (o: O, d: number) => I.IO<R1, never, number>) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R & R1, I, O> => modifyDelayIO_(sc, f)
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O, d: number) => number): Schedule<R, I, O> {
  return modifyDelayIO_(sc, (o, d) => I.pure(f(o, d)))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay<O>(f: (o: O, d: number) => number) {
  return <R, I>(sc: Schedule<R, I, O>): Schedule<R, I, O> => modifyDelay_(sc, f)
}

const onDecisionLoop =
  <R, I, O, R1>(
    self: StepFunction<R, I, O>,
    f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
  ): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.asLazy_(f(d), () => makeDone(d.out))
        }
        case 'Continue': {
          return I.asLazy_(f(d), () => makeContinue(d.out, d.interval, onDecisionLoop(d.next, f)))
        }
      }
    })

/**
 * A `Schedule` that recurs one time.
 */
export const once = asUnit(recur(1))

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(onDecisionLoop(sc.step, f))
}

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision<R, I, O, R1>(
  f: (d: Decision<R, I, O>) => I.IO<R1, never, any>
): (sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => onDecision_(sc, f)
}

/**
 * A schedule spanning all time, which can be stepped only the specified number of times before
 * it terminates.
 */
export function recur(n: number): Schedule<unknown, unknown, number> {
  return whileOutput_(forever, (x) => x < n)
}

const reconsiderIOLoop =
  <R, I, O, R1, O1>(
    self: StepFunction<R, I, O>,
    f: (_: Decision<R, I, O>) => I.IO<R1, never, E.Either<O1, readonly [O1, number]>>
  ): StepFunction<R & R1, I, O1> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.map_(
            f(d),
            E.match(
              (o2) => makeDone(o2),
              ([o2]) => makeDone(o2)
            )
          )
        }
        case 'Continue': {
          return I.map_(
            f(d),
            E.match(
              (o2) => makeDone(o2),
              ([o2, int]) => makeContinue(o2, int, reconsiderIOLoop(d.next, f))
            )
          )
        }
      }
    })

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderIO_<R, I, O, R1, O1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => I.IO<R1, never, Either<O1, readonly [O1, number]>>
): Schedule<R & R1, I, O1> {
  return new Schedule(reconsiderIOLoop(sc.step, f))
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderIO<R, I, O, R1, O1>(
  f: (d: Decision<R, I, O>) => I.IO<R1, never, Either<O1, readonly [O1, number]>>
): (sc: Schedule<R, I, O>) => Schedule<R & R1, I, O1> {
  return (sc) => reconsiderIO_(sc, f)
}

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider_<R, I, O, O1>(
  sc: Schedule<R, I, O>,
  f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>
): Schedule<R, I, O1> {
  return reconsiderIO_(sc, (d) => I.pure(f(d)))
}

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider<R, I, O, O1>(
  f: (d: Decision<R, I, O>) => Either<O1, readonly [O1, number]>
): (sc: Schedule<R, I, O>) => Schedule<R, I, O1> {
  return (sc) => reconsider_(sc, f)
}

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to true.
 */
export function recurWhileIO<R, A>(f: (a: A) => I.IO<R, never, boolean>): Schedule<R, A, A> {
  return whileInputIO_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhile<A>(f: (a: A) => boolean): Schedule<unknown, A, A> {
  return whileInput_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhileEqual<A>(a: A): Schedule<unknown, A, A> {
  return whileInput_(identity<A>(), (x) => a === x)
}

/**
 * A schedule that recurs until the effectful predicate evaluates to true.
 */
export function recurUntilIO<R, A>(f: (a: A) => I.IO<R, never, boolean>): Schedule<R, A, A> {
  return untilInputIO_(identity<A>(), f)
}

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export function recurUntil<A>(f: (a: A) => boolean): Schedule<unknown, A, A> {
  return untilInput_(identity<A>(), f)
}

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export function recurUntilEqual<A>(a: A): Schedule<unknown, A, A> {
  return untilInput_(identity<A>(), (x) => x === a)
}

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 */
export function repetitions<R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, number> {
  return fold_(sc, 0, (n) => n + 1)
}

const resetWhenLoop =
  <R, I, O>(sc: Schedule<R, I, O>, step: StepFunction<R, I, O>, f: (o: O) => boolean): StepFunction<R, I, O> =>
  (now, i) =>
    I.chain_(step(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return f(d.out) ? sc.step(now, i) : I.pure(makeDone(d.out))
        }
        case 'Continue': {
          return f(d.out) ? sc.step(now, i) : I.pure(makeContinue(d.out, d.interval, resetWhenLoop(sc, d.next, f)))
        }
      }
    })

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return new Schedule(resetWhenLoop(sc, sc.step, f))
}

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => resetWhen_(sc, f)
}

const runLoop = <R, I, O>(
  self: StepFunction<R, I, O>,
  now: number,
  xs: readonly I[],
  acc: readonly O[]
): I.IO<R, never, readonly O[]> =>
  xs.length > 0
    ? I.chain_(self(now, xs[0]), (d) => {
        switch (d._tag) {
          case 'Done': {
            return I.pure([...acc, d.out])
          }
          case 'Continue': {
            return runLoop(d.next, d.interval, xs, [...acc, d.out])
          }
        }
      })
    : I.pure(acc)

export function run_<R, I, O>(sc: Schedule<R, I, O>, now: number, i: Iterable<I>): I.IO<R, never, readonly O[]> {
  return runLoop(sc.step, now, Array.from(i), [])
}

export function run<I>(now: number, i: Iterable<I>): <R, O>(sc: Schedule<R, I, O>) => I.IO<R, never, readonly O[]> {
  return (sc) => run_(sc, now, i)
}

/**
 * A `Schedule` that stops
 */
export const stop = asUnit(recur(0))

/**
 * Returns a new schedule that packs the input and output of this schedule into the second
 * element of a tuple. This allows carrying information through this schedule.
 */
export function snd<A>(): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R, readonly [A, I], readonly [A, O]> {
  return (sc) => zipInOut_(identity<A>(), sc)
}

/**
 * Returns a schedule that recurs continuously, each repetition spaced the specified duration
 * from the last run.
 */
export const spaced = (duration: number) => addDelay_(forever, () => duration)

const tapInputLoop =
  <R, I, O, R1>(self: StepFunction<R, I, O>, f: (i: I) => I.IO<R1, never, any>): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(f(i), () =>
      I.map_(self(now, i), (d) => {
        switch (d._tag) {
          case 'Done': {
            return makeDone(d.out)
          }
          case 'Continue': {
            return makeContinue(d.out, d.interval, tapInputLoop(d.next, f))
          }
        }
      })
    )

export function tapInput_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (i: I) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(tapInputLoop(sc.step, f))
}

export function tapInput<R1, I>(
  f: (i: I) => I.IO<R1, never, any>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => tapInput_(sc, f)
}

const tapOutputLoop =
  <R, I, O, R1>(self: StepFunction<R, I, O>, f: (o: O) => I.IO<R1, never, any>): StepFunction<R & R1, I, O> =>
  (now, i) =>
    I.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case 'Done': {
          return I.asLazy_(f(d.out), () => makeDone(d.out))
        }
        case 'Continue': {
          return I.asLazy_(f(d.out), () => makeContinue(d.out, d.interval, tapOutputLoop(d.next, f)))
        }
      }
    })

export function tapOutput_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, any>
): Schedule<R & R1, I, O> {
  return new Schedule(tapOutputLoop(sc.step, f))
}

export function tapOutput<R1, O>(
  f: (o: O) => I.IO<R1, never, any>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => tapOutput_(sc, f)
}

const zipInOutLoop =
  <R, I, O, R1, I1, O1>(
    sc: StepFunction<R, I, O>,
    that: StepFunction<R1, I1, O1>
  ): StepFunction<R & R1, readonly [I, I1], readonly [O, O1]> =>
  (now, [in1, in2]) =>
    I.map_(I.cross_(sc(now, in1), that(now, in2)), ([d1, d2]) => {
      switch (d1._tag) {
        case 'Done': {
          switch (d2._tag) {
            case 'Done': {
              return makeDone(tuple(d1.out, d2.out))
            }
            case 'Continue': {
              return makeDone(tuple(d1.out, d2.out))
            }
          }
        }
        /* eslint-disable-next-line no-fallthrough */
        case 'Continue': {
          switch (d2._tag) {
            case 'Done': {
              return makeDone(tuple(d1.out, d2.out))
            }
            case 'Continue': {
              return makeContinue(
                tuple(d1.out, d2.out),
                Math.min(d1.interval, d2.interval),
                zipInOutLoop(d1.next, d2.next)
              )
            }
          }
        }
      }
    })

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function zipInOut_<R, I, O, R1, I1, O1>(
  sc: Schedule<R, I, O>,
  that: Schedule<R1, I1, O1>
): Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
  return new Schedule(zipInOutLoop(sc.step, that.step))
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function zipInOut<R1, I1, O1>(
  that: Schedule<R1, I1, O1>
): <R, I, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, readonly [I, I1], readonly [O, O1]> {
  return (sc) => zipInOut_(sc, that)
}

const unfoldLoop =
  <A>(a: A, f: (a: A) => A): StepFunction<unknown, unknown, A> =>
  (now, _) =>
    I.pure(makeContinue(a, now, unfoldLoop(f(a), f)))

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold<A>(a: A, f: (a: A) => A): Schedule<unknown, unknown, A> {
  return new Schedule((now) =>
    pipe(
      I.succeed(a),
      I.map((a) => makeContinue(a, now, unfoldLoop(f(a), f)))
    )
  )
}

const unfoldIOLoop =
  <R, A>(a: A, f: (a: A) => I.IO<R, never, A>): StepFunction<R, unknown, A> =>
  (now, _) =>
    I.pure(makeContinue(a, now, (n, i) => I.chain_(f(a), (x) => unfoldIOLoop(x, f)(n, i))))

/**
 * Effectfully unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldIO<R, A>(a: A, f: (a: A) => I.IO<R, never, A>): Schedule<R, unknown, A> {
  return new Schedule(unfoldIOLoop(a, f))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput_<R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O> {
  return check_(sc, (i) => !f(i))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput<I>(f: (i: I) => boolean): <R, O>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => untilInput_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInputIO_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>) {
  return checkIO_(sc, (i) => I.map_(f(i), (b) => !b))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInputIO<R1, I>(
  f: (i: I) => I.IO<R1, never, boolean>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => untilInputIO_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return check_(sc, (_, o) => !f(o))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => untilOutput_(sc, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputIO_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (o: O) => I.IO<R1, never, boolean>) {
  return checkIO_(sc, (_, o) => I.map_(f(o), (b) => !b))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputIO<R1, O>(
  f: (o: O) => I.IO<R1, never, boolean>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => untilOutputIO_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInput_<R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean): Schedule<R, I, O> {
  return check_(sc, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInput<I>(f: (i: I) => boolean): <R, O>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => whileInput_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputIO_<R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => I.IO<R1, never, boolean>) {
  return checkIO_(sc, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputIO<R1, I>(
  f: (i: I) => I.IO<R1, never, boolean>
): <R, O>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => whileInputIO_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutput_<R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean): Schedule<R, I, O> {
  return check_(sc, (_, o) => f(o))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutput<O>(f: (o: O) => boolean): <R, I>(sc: Schedule<R, I, O>) => Schedule<R, I, O> {
  return (sc) => whileOutput_(sc, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutputIO_<R, I, O, R1>(
  sc: Schedule<R, I, O>,
  f: (o: O) => I.IO<R1, never, boolean>
): Schedule<R & R1, I, O> {
  return checkIO_(sc, (_, o) => f(o))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileOutputIO<R1, O>(
  f: (o: O) => I.IO<R1, never, boolean>
): <R, I>(sc: Schedule<R, I, O>) => Schedule<R & R1, I, O> {
  return (sc) => whileOutputIO_(sc, f)
}

const windowedLoop =
  (interval: number, startMillis: Option<number>, n: number): StepFunction<unknown, unknown, number> =>
  (now, _) =>
    I.pure(
      O.match_(
        startMillis,
        () => makeContinue(n + 1, now + interval, windowedLoop(interval, O.some(now), n + 1)),
        (startMillis) =>
          makeContinue(
            n + 1,
            now + ((now - startMillis) % interval),
            windowedLoop(interval, O.some(startMillis), n + 1)
          )
      )
    )

export function windowed(interval: number): Schedule<unknown, unknown, number> {
  return new Schedule(windowedLoop(interval, O.none(), 0))
}
