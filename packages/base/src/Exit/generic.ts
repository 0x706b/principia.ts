import type { FiberId } from '../IO/Fiber/FiberId'
import type { IO } from '../IO/IO/core'
import type { Predicate } from '../prelude'
import type { Equatable, Hashable } from '../Structural'

import * as A from '../Array/core'
import * as C from '../Cause'
import * as E from '../Either'
import { identity, pipe } from '../function'
import * as O from '../Option'
import { flow, isObject, tailRec_ } from '../prelude'
import * as St from '../Structural'
import { tuple } from '../tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const ExitTypeId = Symbol()
export type ExitTypeId = typeof ExitTypeId

export type GenericExit<Id, E, A> = Success<A> | Failure<Id, E>

export const ExitTag = {
  Success: 'Success',
  Failure: 'Failure'
} as const

export class Failure<Id, E> {
  readonly _E!: () => E
  readonly _A!: () => never;

  readonly [ExitTypeId]: ExitTypeId = ExitTypeId
  readonly _tag                     = ExitTag.Failure
  constructor(readonly cause: C.GenericCause<Id, E>) {}

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

export function isExit(u: unknown): u is GenericExit<unknown, unknown, unknown> {
  return isObject(u) && ExitTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function halt(defect: unknown): GenericExit<never, never, never> {
  return failCause(C.halt(defect))
}

export function fail<E = never, A = never>(e: E): GenericExit<never, E, A> {
  return failCause(C.fail(e))
}

export function fromEither<E, A>(e: E.Either<E, A>): GenericExit<never, E, A> {
  return e._tag === 'Left' ? fail(e.left) : succeed(e.right)
}

export function fromOption_<E, A>(fa: O.Option<A>, onNone: () => E): GenericExit<never, E, A> {
  return fa._tag === 'None' ? fail(onNone()) : succeed(fa.value)
}

export function fromOption<E>(onNone: () => E): <A>(fa: O.Option<A>) => GenericExit<never, E, A> {
  return (fa) => fromOption_(fa, onNone)
}

export function failCause<Id, E = never, A = never>(cause: C.GenericCause<Id, E>): GenericExit<Id, E, A> {
  return new Failure(cause)
}

export function interrupt(id: FiberId) {
  return failCause(C.interrupt(id))
}

export function succeed<E = never, A = never>(value: A): GenericExit<never, E, A> {
  return new Success(value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isFailure<Id, E, A>(exit: GenericExit<Id, E, A>): exit is Failure<Id, E> {
  return exit._tag === ExitTag.Failure
}

export function isInterrupt<Id, E, A>(exit: GenericExit<Id, E, A>): exit is Failure<Id, E> {
  return isFailure(exit) ? C.interrupted(exit.cause) : false
}

export function isSuccess<Id, E, A>(exit: GenericExit<Id, E, A>): exit is Success<A> {
  return exit._tag === ExitTag.Success
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function match_<Id, E, A, B, C>(
  exit: GenericExit<Id, E, A>,
  onFailure: (e: C.GenericCause<Id, E>) => B,
  onSuccess: (a: A) => C
): B | C {
  switch (exit._tag) {
    case ExitTag.Success: {
      return onSuccess(exit.value)
    }
    case ExitTag.Failure: {
      return onFailure(exit.cause)
    }
  }
}

export function match<Id, E, A, B, C>(
  onFailure: (e: C.GenericCause<Id, E>) => B,
  onSuccess: (a: A) => C
): (exit: GenericExit<Id, E, A>) => B | C {
  return (exit) => match_(exit, onFailure, onSuccess)
}

/**
 * Folds over the value or cause.
 */
export function matchIO_<Id, E, A, R1, E1, A1, R2, E2, A2>(
  exit: GenericExit<Id, E, A>,
  onFailure: (e: C.GenericCause<Id, E>) => IO<R1, E1, A1>,
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

export function matchIO<Id, E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: C.GenericCause<Id, E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): (exit: GenericExit<Id, E, A>) => IO<R1 & R2, E1 | E2, A1 | A2> {
  return (exit) => matchIO_(exit, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): GenericExit<never, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<Id, E, A, Id1, G, B>(
  fab: GenericExit<Id1, G, (a: A) => B>,
  fa: GenericExit<Id, E, A>
): GenericExit<Id | Id1, E | G, B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

export function ap<Id, E, A>(
  fa: GenericExit<Id, E, A>
): <Id1, G, B>(fab: GenericExit<Id1, G, (a: A) => B>) => GenericExit<Id | Id1, E | G, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<Id, E, Id1, G, A, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.then)
}

export function crossFirst<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<Id, E, A, Id1, G, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.then)
}

export function crossSecond<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

export function crossFirstPar_<Id, E, Id1, G, A, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.both)
}

export function crossFirstPar<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, A> {
  return (fa) => crossFirstPar_(fa, fb)
}

export function crossSecondPar_<Id, E, A, Id1, G, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.both)
}

export function crossSecondPar<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, B> {
  return (fa) => crossSecondPar_(fa, fb)
}

export function cross_<Id, E, Id1, G, A, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.then)
}

export function cross<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<Id, E, Id1, G, A, B>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.both)
}

export function crossPar<Id1, G, B>(
  fb: GenericExit<Id1, G, B>
): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWithCause_<Id, E, A, Id1, G, B, C>(
  fa: GenericExit<Id, E, A>,
  fb: GenericExit<Id1, G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.GenericCause<Id, E>, eb: C.GenericCause<Id1, G>) => C.GenericCause<Id | Id1, E | G>
): GenericExit<Id | Id1, E | G, C> {
  switch (fa._tag) {
    case ExitTag.Failure: {
      switch (fb._tag) {
        case ExitTag.Success: {
          return fa
        }
        case ExitTag.Failure: {
          return failCause(g(fa.cause, fb.cause))
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

export function crossWithCause<Id, E, A, Id1, G, B, C>(
  fb: GenericExit<Id1, G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.GenericCause<Id, E>, eb: C.GenericCause<Id1, G>) => C.GenericCause<Id | Id1, E | G>
): (fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, E | G, C> {
  return (fa) => crossWithCause_(fa, fb, f, g)
}

export function crossWith_<Id, EA, A, Id1, EB, B, C>(
  fa: GenericExit<Id, EA, A>,
  fb: GenericExit<Id1, EB, B>,
  f: (a: A, b: B) => C
): GenericExit<Id | Id1, EA | EB, C> {
  return crossWithCause_(fa, fb, f, C.then)
}

export function crossWith<A, Id1, G, B, C>(
  fb: GenericExit<Id1, G, B>,
  f: (a: A, b: B) => C
): <Id, E>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<Id, E, A, G, B>(
  pab: GenericExit<Id, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): GenericExit<Id, G, B> {
  return isFailure(pab) ? mapError_(pab, f) : map_(pab, g)
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <Id>(pab: GenericExit<Id, E, A>) => GenericExit<Id, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<Id, E, A, G>(pab: GenericExit<Id, E, A>, f: (e: E) => G): GenericExit<Id, G, A> {
  return isFailure(pab) ? failCause(C.map_(pab.cause, f)) : pab
}

export function mapError<E, G>(f: (e: E) => G): <Id, A>(pab: GenericExit<Id, E, A>) => GenericExit<Id, G, A> {
  return (pab) => mapError_(pab, f)
}

export function mapErrorCause_<Id, E, A, G>(
  pab: GenericExit<Id, E, A>,
  f: (e: C.GenericCause<Id, E>) => C.GenericCause<Id, G>
): GenericExit<Id, G, A> {
  return isFailure(pab) ? failCause(f(pab.cause)) : pab
}

export function mapErrorCause<Id, E, G>(
  f: (e: C.GenericCause<Id, E>) => C.GenericCause<Id, G>
): <A>(pab: GenericExit<Id, E, A>) => GenericExit<Id, G, A> {
  return (pab) => mapErrorCause_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function as_<Id, E, A, B>(fa: GenericExit<Id, E, A>, b: B): GenericExit<Id, E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <Id, E, A>(fa: GenericExit<Id, E, A>) => GenericExit<Id, E, B> {
  return map(() => b)
}

export function map_<Id, E, A, B>(fa: GenericExit<Id, E, A>, f: (a: A) => B): GenericExit<Id, E, B> {
  return isFailure(fa) ? fa : succeed(f(fa.value))
}

export function map<A, B>(f: (a: A) => B): <Id, E>(fa: GenericExit<Id, E, A>) => GenericExit<Id, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<Id, E, A, Id1, G, B>(
  ma: GenericExit<Id, E, A>,
  f: (a: A) => GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, B> {
  return isFailure(ma) ? ma : f(ma.value)
}

export function chain<A, Id1, G, B>(
  f: (a: A) => GenericExit<Id1, G, B>
): <Id, E>(fa: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, B> {
  return (fa) => chain_(fa, f)
}

export function flatten<Id, E, Id1, G, A>(
  mma: GenericExit<Id, E, GenericExit<Id1, G, A>>
): GenericExit<Id | Id1, E | G, A> {
  return chain_(mma, identity)
}

export function tap_<Id, E, A, Id1, G, B>(
  ma: GenericExit<Id, E, A>,
  f: (a: A) => GenericExit<Id1, G, B>
): GenericExit<Id | Id1, E | G, A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

export function tap<A, Id1, G, B>(
  f: (a: A) => GenericExit<Id1, G, B>
): <Id, E>(ma: GenericExit<Id, E, A>) => GenericExit<Id | Id1, G | E, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function chainRec_<Id, E, A, B>(a: A, f: (a: A) => GenericExit<Id, E, E.Either<A, B>>): GenericExit<Id, E, B> {
  return tailRec_(
    a,
    flow(
      f,
      match(
        (ce) => E.right(failCause(ce)),
        E.match(E.left, (b) => E.right(succeed(b)))
      )
    )
  )
}

export function chainRec<Id, E, A, B>(
  f: (a: A) => GenericExit<Id, E, E.Either<A, B>>
): (a: A) => GenericExit<Id, E, B> {
  return (a) => chainRec_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): GenericExit<never, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combiniators
 * -------------------------------------------------------------------------------------------------
 */

export function collectAll<Id, E, A>(
  ...exits: ReadonlyArray<GenericExit<Id, E, A>>
): O.Option<GenericExit<Id, E, ReadonlyArray<A>>> {
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

export function collectAllPar<Id, E, A>(
  ...exits: ReadonlyArray<GenericExit<Id, E, A>>
): O.Option<GenericExit<Id, E, readonly A[]>> {
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

export function exists_<Id, E, A>(exit: GenericExit<Id, E, A>, predicate: Predicate<A>): boolean {
  return match_(exit, () => false, predicate)
}

export function exists<A>(predicate: Predicate<A>): <Id, E>(exit: GenericExit<Id, E, A>) => boolean {
  return (exit) => exists_(exit, predicate)
}

export function orElseFail_<Id, E, A, G>(exit: GenericExit<Id, E, A>, orElse: G) {
  return mapError_(exit, () => orElse)
}

export function orElseFail<G>(orElse: G): <Id, E, A>(exit: GenericExit<Id, E, A>) => GenericExit<Id, G, A> {
  return (exit) => orElseFail_(exit, orElse)
}

export function untraced<Id, E, A>(exit: GenericExit<Id, E, A>): GenericExit<Id, E, A> {
  return mapErrorCause_(exit, C.untraced)
}
