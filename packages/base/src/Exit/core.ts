import type { FiberId } from '../Fiber/FiberId'
import type { IO } from '../IO/core'
import type { Predicate } from '../prelude'
import type { Equatable, Hashable } from '../Structural'

import * as A from '../Array/core'
import * as C from '../Cause'
import * as E from '../Either'
import { identity, pipe } from '../function'
import * as O from '../Option'
import { isObject } from '../prelude'
import * as St from '../Structural'
import { tuple } from '../tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const ExitTypeId = Symbol()
export type ExitTypeId = typeof ExitTypeId

export type Exit<E, A> = Success<A> | Failure<E>

export const ExitTag = {
  Success: 'Success',
  Failure: 'Failure'
} as const

export class Failure<E> {
  readonly _E!: () => E
  readonly _A!: () => never;

  readonly [ExitTypeId]: ExitTypeId = ExitTypeId
  readonly _tag                     = ExitTag.Failure
  constructor(readonly cause: C.Cause<E>) {}

  get [St.$hash](): number {
    return St.hash(this.cause)
  }
  [St.$equals](that: unknown): boolean {
    return isExit(that) && isFailure(that) && St.equals(this.cause, that.cause)
  }
}

export class Success<A> implements Hashable, Equatable {
  readonly _E!: () => never
  readonly _A!: () => A;

  readonly [ExitTypeId]: ExitTypeId = ExitTypeId
  readonly _tag                     = ExitTag.Success
  constructor(readonly value: A) {}

  get [St.$hash](): number {
    return St.hash(this.value)
  }
  [St.$equals](that: unknown): boolean {
    return isExit(that) && isSuccess(that) && St.equals(this.value, that.value)
  }
}

export function isExit(u: unknown): u is Exit<unknown, unknown> {
  return isObject(u) && ExitTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function die(defect: unknown): Exit<never, never> {
  return halt(C.die(defect))
}

export function fail<E = never, A = never>(e: E): Exit<E, A> {
  return halt(C.fail(e))
}

export function fromEither<E, A>(e: E.Either<E, A>): Exit<E, A> {
  return e._tag === 'Left' ? fail(e.left) : succeed(e.right)
}

export function fromOption_<E, A>(fa: O.Option<A>, onNone: () => E): Exit<E, A> {
  return fa._tag === 'None' ? fail(onNone()) : succeed(fa.value)
}

export function fromOption<E>(onNone: () => E): <A>(fa: O.Option<A>) => Exit<E, A> {
  return (fa) => fromOption_(fa, onNone)
}

export function halt<E = never, A = never>(cause: C.Cause<E>): Exit<E, A> {
  return new Failure(cause)
}

export function interrupt(id: FiberId) {
  return halt(C.interrupt(id))
}

export function succeed<E = never, A = never>(value: A): Exit<E, A> {
  return new Success(value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isFailure<E, A>(exit: Exit<E, A>): exit is Failure<E> {
  return exit._tag === ExitTag.Failure
}

export function isInterrupt<E, A>(exit: Exit<E, A>): exit is Failure<E> {
  return isFailure(exit) ? C.interrupted(exit.cause) : false
}

export function isSuccess<E, A>(exit: Exit<E, A>): exit is Success<A> {
  return exit._tag === ExitTag.Success
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function match_<E, A, B, C>(exit: Exit<E, A>, onFailure: (e: C.Cause<E>) => B, onSuccess: (a: A) => C): B | C {
  switch (exit._tag) {
    case ExitTag.Success: {
      return onSuccess(exit.value)
    }
    case ExitTag.Failure: {
      return onFailure(exit.cause)
    }
  }
}

export function match<E, A, B, C>(
  onFailure: (e: C.Cause<E>) => B,
  onSuccess: (a: A) => C
): (exit: Exit<E, A>) => B | C {
  return (exit) => match_(exit, onFailure, onSuccess)
}

/**
 * Folds over the value or cause.
 */
export function matchIO_<E, A, R1, E1, A1, R2, E2, A2>(
  exit: Exit<E, A>,
  onFailure: (e: C.Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R1 & R2, E1 | E2, A1 | A2> {
  switch (exit._tag) {
    case ExitTag.Success: {
      return onSuccess(exit.value)
    }
    case ExitTag.Failure: {
      return onFailure(exit.cause)
    }
  }
}

export function matchIO<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: C.Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): (exit: Exit<E, A>) => IO<R1 & R2, E1 | E2, A1 | A2> {
  return (exit) => matchIO_(exit, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): Exit<never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<E, A, G, B>(fab: Exit<G, (a: A) => B>, fa: Exit<E, A>): Exit<E | G, B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

export function ap<E, A>(fa: Exit<E, A>): <G, B>(fab: Exit<G, (a: A) => B>) => Exit<E | G, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.then)
}

export function crossFirst<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.then)
}

export function crossSecond<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

export function crossFirstPar_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.both)
}

export function crossFirstPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => crossFirstPar_(fa, fb)
}

export function crossSecondPar_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.both)
}

export function crossSecondPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => crossSecondPar_(fa, fb)
}

export function cross_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.then)
}

export function cross<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.both)
}

export function crossPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWithCause_<E, A, G, B, C>(
  fa: Exit<E, A>,
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): Exit<E | G, C> {
  switch (fa._tag) {
    case ExitTag.Failure: {
      switch (fb._tag) {
        case ExitTag.Success: {
          return fa
        }
        case ExitTag.Failure: {
          return halt(g(fa.cause, fb.cause))
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case ExitTag.Success: {
      switch (fb._tag) {
        case ExitTag.Success: {
          return succeed(f(fa.value, fb.value))
        }
        case ExitTag.Failure: {
          return fb
        }
      }
    }
  }
}

export function crossWithCause<E, A, G, B, C>(
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): (fa: Exit<E, A>) => Exit<E | G, C> {
  return (fa) => crossWithCause_(fa, fb, f, g)
}

export function crossWith_<EA, A, EB, B, C>(fa: Exit<EA, A>, fb: Exit<EB, B>, f: (a: A, b: B) => C): Exit<EA | EB, C> {
  return crossWithCause_(fa, fb, f, C.then)
}

export function crossWith<A, G, B, C>(fb: Exit<G, B>, f: (a: A, b: B) => C): <E>(fa: Exit<E, A>) => Exit<G | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<E, A, G, B>(pab: Exit<E, A>, f: (e: E) => G, g: (a: A) => B): Exit<G, B> {
  return isFailure(pab) ? mapError_(pab, f) : map_(pab, g)
}

export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Exit<E, A>) => Exit<G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<E, A, G>(pab: Exit<E, A>, f: (e: E) => G): Exit<G, A> {
  return isFailure(pab) ? halt(C.map_(pab.cause, f)) : pab
}

export function mapError<E, G>(f: (e: E) => G): <A>(pab: Exit<E, A>) => Exit<G, A> {
  return (pab) => mapError_(pab, f)
}

export function mapErrorCause_<E, A, G>(pab: Exit<E, A>, f: (e: C.Cause<E>) => C.Cause<G>): Exit<G, A> {
  return isFailure(pab) ? halt(f(pab.cause)) : pab
}

export function mapErrorCause<E, G>(f: (e: C.Cause<E>) => C.Cause<G>): <A>(pab: Exit<E, A>) => Exit<G, A> {
  return (pab) => mapErrorCause_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function as_<E, A, B>(fa: Exit<E, A>, b: B): Exit<E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <E, A>(fa: Exit<E, A>) => Exit<E, B> {
  return map(() => b)
}

export function map_<E, A, B>(fa: Exit<E, A>, f: (a: A) => B): Exit<E, B> {
  return isFailure(fa) ? fa : succeed(f(fa.value))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: Exit<E, A>) => Exit<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, B> {
  return isFailure(ma) ? ma : f(ma.value)
}

export function chain<A, G, B>(f: (a: A) => Exit<G, B>): <E>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => chain_(fa, f)
}

export function flatten<E, G, A>(mma: Exit<E, Exit<G, A>>): Exit<E | G, A> {
  return chain_(mma, identity)
}

export function tap_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

export function tap<A, G, B>(f: (a: A) => Exit<G, B>): <E>(ma: Exit<E, A>) => Exit<G | E, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Exit<never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combiniators
 * -------------------------------------------------------------------------------------------------
 */

export function collectAll<E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, ReadonlyArray<A>>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.foldl(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) => crossWithCause_(acc, el, (acc, el) => [el, ...acc], C.then)
        ),
        map(A.reverse)
      )
    )
  )
}

export function collectAllPar<E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, readonly A[]>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.foldl(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) => crossWithCause_(acc, el, (acc, el) => [el, ...acc], C.both)
        ),
        map(A.reverse)
      )
    )
  )
}

export function exists_<E, A>(exit: Exit<E, A>, predicate: Predicate<A>): boolean {
  return match_(exit, () => false, predicate)
}

export function exists<A>(predicate: Predicate<A>): <E>(exit: Exit<E, A>) => boolean {
  return (exit) => exists_(exit, predicate)
}

export function orElseFail_<E, A, G>(exit: Exit<E, A>, orElse: G) {
  return mapError_(exit, () => orElse)
}

export function orElseFail<G>(orElse: G): <E, A>(exit: Exit<E, A>) => Exit<G, A> {
  return (exit) => orElseFail_(exit, orElse)
}

export function untraced<E, A>(exit: Exit<E, A>): Exit<E, A> {
  return mapErrorCause_(exit, C.untraced)
}
