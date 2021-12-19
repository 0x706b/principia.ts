import type { PCause } from '../Cause'
import type { IO } from '../IO/core'
import type { Predicate } from '../prelude'
import type { Equatable, Hashable } from '../Structural'

import * as A from '../Array/core'
import * as C from '../Cause'
import * as E from '../Either'
import { flow, identity, pipe } from '../function'
import * as M from '../Maybe'
import { tailRec_ } from '../prelude'
import * as Eq from '../Structural/Equatable'
import * as Ha from '../Structural/Hashable'
import { tuple } from '../tuple/core'
import { isObject } from '../util/predicates'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export const ExitTypeId = Symbol.for('@principia/base/Exit')
export type ExitTypeId = typeof ExitTypeId

export type PExit<Id, E, A> = Success<A> | Failure<Id, E>

export const ExitTag = {
  Success: 'Success',
  Failure: 'Failure'
} as const

export interface Failure<Id, E> extends Equatable, Hashable {
  readonly _E: () => E
  readonly _A: () => never
  readonly [ExitTypeId]: ExitTypeId
  readonly _tag: typeof ExitTag.Failure
  readonly cause: C.PCause<Id, E>
}

export const FailureConstructor = class Failure<Id, E> {
  readonly _E!: () => E
  readonly _A!: () => never

  readonly [ExitTypeId]: ExitTypeId = ExitTypeId
  readonly _tag = ExitTag.Failure
  constructor(readonly cause: C.PCause<Id, E>) {}

  get [Ha.$hash](): number {
    return Ha.hash(this.cause)
  }
  [Eq.$equals](that: unknown): boolean {
    return isExit(that) && isFailure(that) && Eq.equals(this.cause, that.cause)
  }
}

export function Failure<Id, E>(cause: PCause<Id, E>): Failure<Id, E> {
  return new FailureConstructor(cause)
}

export interface Success<A> extends Equatable, Hashable {
  readonly _E: () => never
  readonly _A: () => A
  readonly [ExitTypeId]: ExitTypeId
  readonly _tag: typeof ExitTag.Success
  readonly value: A
}

export const SuccessConstructor = class Success<A> implements Hashable, Equatable {
  readonly _E!: () => never
  readonly _A!: () => A

  readonly [ExitTypeId]: ExitTypeId = ExitTypeId
  readonly _tag = ExitTag.Success
  constructor(readonly value: A) {}

  get [Ha.$hash](): number {
    return Ha.hash(this.value)
  }
  [Eq.$equals](that: unknown): boolean {
    return isExit(that) && isSuccess(that) && Eq.equals(this.value, that.value)
  }
}

export function Success<A>(value: A): Success<A> {
  return new SuccessConstructor(value)
}

export function isExit(u: unknown): u is PExit<unknown, unknown, unknown> {
  return isObject(u) && ExitTypeId in u
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function halt<Id = never>(defect: unknown): PExit<Id, never, never> {
  return failCause(C.halt(defect))
}

export function fail<Id = never, E = never, A = never>(e: E): PExit<Id, E, A> {
  return failCause(C.fail(e))
}

export function fromEither<Id = never, E = never, A = never>(e: E.Either<E, A>): PExit<Id, E, A> {
  return e._tag === 'Left' ? fail(e.left) : succeed(e.right)
}

export function fromMaybe_<E, A>(fa: M.Maybe<A>, onNothing: () => E): PExit<never, E, A> {
  return fa._tag === 'Nothing' ? fail(onNothing()) : succeed(fa.value)
}

/**
 * @dataFirst fromMaybe_
 */
export function fromMaybe<E>(onNothing: () => E): <A>(fa: M.Maybe<A>) => PExit<never, E, A> {
  return (fa) => fromMaybe_(fa, onNothing)
}

export function failCause<Id = never, E = never, A = never>(cause: C.PCause<Id, E>): PExit<Id, E, A> {
  return Failure(cause)
}

export function interrupt<Id>(id: Id) {
  return failCause(C.interrupt(id))
}

export function succeed<E = never, A = never>(value: A): PExit<never, E, A> {
  return Success(value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isFailure<Id, E, A>(exit: PExit<Id, E, A>): exit is Failure<Id, E> {
  return exit._tag === ExitTag.Failure
}

export function isInterrupt<Id, E, A>(exit: PExit<Id, E, A>): exit is Failure<Id, E> {
  return isFailure(exit) ? C.interrupted(exit.cause) : false
}

export function isSuccess<Id, E, A>(exit: PExit<Id, E, A>): exit is Success<A> {
  return exit._tag === ExitTag.Success
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function match_<Id, E, A, B, C>(
  exit: PExit<Id, E, A>,
  onFailure: (e: C.PCause<Id, E>) => B,
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

/**
 * @dataFirst match_
 */
export function match<Id, E, A, B, C>(
  onFailure: (e: C.PCause<Id, E>) => B,
  onSuccess: (a: A) => C
): (exit: PExit<Id, E, A>) => B | C {
  return (exit) => match_(exit, onFailure, onSuccess)
}

/**
 * Folds over the value or cause.
 */
export function matchIO_<Id, E, A, R1, E1, A1, R2, E2, A2>(
  exit: PExit<Id, E, A>,
  onFailure: (e: C.PCause<Id, E>) => IO<R1, E1, A1>,
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

/**
 * @dataFirst matchIO_
 */
export function matchIO<Id, E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: C.PCause<Id, E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): (exit: PExit<Id, E, A>) => IO<R1 & R2, E1 | E2, A1 | A2> {
  return (exit) => matchIO_(exit, onFailure, onSuccess)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): PExit<never, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<Id, E, A, Id1, G, B>(
  fab: PExit<Id1, G, (a: A) => B>,
  fa: PExit<Id, E, A>
): PExit<Id | Id1, E | G, B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

/**
 * @dataFirst ap_
 */
export function ap<Id, E, A>(
  fa: PExit<Id, E, A>
): <Id1, G, B>(fab: PExit<Id1, G, (a: A) => B>) => PExit<Id | Id1, E | G, B> {
  return (fab) => ap_(fab, fa)
}

export function crossFirst_<Id, E, Id1, G, A, B>(fa: PExit<Id, E, A>, fb: PExit<Id1, G, B>): PExit<Id | Id1, E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.then)
}

/**
 * @dataFirst crossFirst_
 */
export function crossFirst<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, A> {
  return (fa) => crossFirst_(fa, fb)
}

export function crossSecond_<Id, E, A, Id1, G, B>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>
): PExit<Id | Id1, E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.then)
}

/**
 * @dataFirst crossSecond_
 */
export function crossSecond<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, B> {
  return (fa) => crossSecond_(fa, fb)
}

export function crossFirstPar_<Id, E, Id1, G, A, B>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>
): PExit<Id | Id1, E | G, A> {
  return crossWithCause_(fa, fb, (a, _) => a, C.both)
}

/**
 * @dataFirst crossFirstPar_
 */
export function crossFirstPar<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, A> {
  return (fa) => crossFirstPar_(fa, fb)
}

export function crossSecondPar_<Id, E, A, Id1, G, B>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>
): PExit<Id | Id1, E | G, B> {
  return crossWithCause_(fa, fb, (_, b) => b, C.both)
}

/**
 * @dataFirst crossSecondPar_
 */
export function crossSecondPar<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, B> {
  return (fa) => crossSecondPar_(fa, fb)
}

export function cross_<Id, E, Id1, G, A, B>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>
): PExit<Id | Id1, E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.then)
}

/**
 * @dataFirst cross_
 */
export function cross<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<Id, E, Id1, G, A, B>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>
): PExit<Id | Id1, E | G, readonly [A, B]> {
  return crossWithCause_(fa, fb, tuple, C.both)
}

/**
 * @dataFirst crossPar_
 */
export function crossPar<Id1, G, B>(
  fb: PExit<Id1, G, B>
): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWithCause_<Id, E, A, Id1, G, B, C>(
  fa: PExit<Id, E, A>,
  fb: PExit<Id1, G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.PCause<Id, E>, eb: C.PCause<Id1, G>) => C.PCause<Id | Id1, E | G>
): PExit<Id | Id1, E | G, C> {
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

/**
 * @dataFirst crossWithCause_
 */
export function crossWithCause<Id, E, A, Id1, G, B, C>(
  fb: PExit<Id1, G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.PCause<Id, E>, eb: C.PCause<Id1, G>) => C.PCause<Id | Id1, E | G>
): (fa: PExit<Id, E, A>) => PExit<Id | Id1, E | G, C> {
  return (fa) => crossWithCause_(fa, fb, f, g)
}

export function crossWith_<Id, EA, A, Id1, EB, B, C>(
  fa: PExit<Id, EA, A>,
  fb: PExit<Id1, EB, B>,
  f: (a: A, b: B) => C
): PExit<Id | Id1, EA | EB, C> {
  return crossWithCause_(fa, fb, f, C.then)
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, Id1, G, B, C>(
  fb: PExit<Id1, G, B>,
  f: (a: A, b: B) => C
): <Id, E>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function bimap_<Id, E, A, G, B>(pab: PExit<Id, E, A>, f: (e: E) => G, g: (a: A) => B): PExit<Id, G, B> {
  return isFailure(pab) ? mapError_(pab, f) : map_(pab, g)
}

/**
 * @dataFirst bimap_
 */
export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): <Id>(pab: PExit<Id, E, A>) => PExit<Id, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<Id, E, A, G>(pab: PExit<Id, E, A>, f: (e: E) => G): PExit<Id, G, A> {
  return isFailure(pab) ? failCause(C.map_(pab.cause, f)) : pab
}

/**
 * @dataFirst mapError_
 */
export function mapError<E, G>(f: (e: E) => G): <Id, A>(pab: PExit<Id, E, A>) => PExit<Id, G, A> {
  return (pab) => mapError_(pab, f)
}

export function mapErrorCause_<Id, E, A, Id1, G>(
  pab: PExit<Id, E, A>,
  f: (e: C.PCause<Id, E>) => C.PCause<Id1, G>
): PExit<Id1, G, A> {
  return isFailure(pab) ? failCause(f(pab.cause)) : pab
}

/**
 * @dataFirst mapErrorCause_
 */
export function mapErrorCause<Id, E, Id1, G>(
  f: (e: C.PCause<Id, E>) => C.PCause<Id1, G>
): <A>(pab: PExit<Id, E, A>) => PExit<Id1, G, A> {
  return (pab) => mapErrorCause_(pab, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function as_<Id, E, A, B>(fa: PExit<Id, E, A>, b: B): PExit<Id, E, B> {
  return map_(fa, () => b)
}

/**
 * @dataFirst as_
 */
export function as<B>(b: B): <Id, E, A>(fa: PExit<Id, E, A>) => PExit<Id, E, B> {
  return map(() => b)
}

export function map_<Id, E, A, B>(fa: PExit<Id, E, A>, f: (a: A) => B): PExit<Id, E, B> {
  return isFailure(fa) ? fa : succeed(f(fa.value))
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <Id, E>(fa: PExit<Id, E, A>) => PExit<Id, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<Id, E, A, Id1, G, B>(
  ma: PExit<Id, E, A>,
  f: (a: A) => PExit<Id1, G, B>
): PExit<Id | Id1, E | G, B> {
  return isFailure(ma) ? ma : f(ma.value)
}

/**
 * @dataFirst chain_
 */
export function chain<A, Id1, G, B>(
  f: (a: A) => PExit<Id1, G, B>
): <Id, E>(fa: PExit<Id, E, A>) => PExit<Id | Id1, G | E, B> {
  return (fa) => chain_(fa, f)
}

export function flatten<Id, E, Id1, G, A>(mma: PExit<Id, E, PExit<Id1, G, A>>): PExit<Id | Id1, E | G, A> {
  return chain_(mma, identity)
}

export function tap_<Id, E, A, Id1, G, B>(
  ma: PExit<Id, E, A>,
  f: (a: A) => PExit<Id1, G, B>
): PExit<Id | Id1, E | G, A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

/**
 * @dataFirst tap_
 */
export function tap<A, Id1, G, B>(
  f: (a: A) => PExit<Id1, G, B>
): <Id, E>(ma: PExit<Id, E, A>) => PExit<Id | Id1, G | E, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function chainRec_<Id, E, A, B>(a: A, f: (a: A) => PExit<Id, E, E.Either<A, B>>): PExit<Id, E, B> {
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

/**
 * @dataFirst chainRec_
 */
export function chainRec<Id, E, A, B>(f: (a: A) => PExit<Id, E, E.Either<A, B>>): (a: A) => PExit<Id, E, B> {
  return (a) => chainRec_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): PExit<never, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combiniators
 * -------------------------------------------------------------------------------------------------
 */

export function collectAll<Id, E, A>(
  ...exits: ReadonlyArray<PExit<Id, E, A>>
): M.Maybe<PExit<Id, E, ReadonlyArray<A>>> {
  return pipe(
    A.head(exits),
    M.map((head) =>
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

export function collectAllPar<Id, E, A>(...exits: ReadonlyArray<PExit<Id, E, A>>): M.Maybe<PExit<Id, E, readonly A[]>> {
  return pipe(
    A.head(exits),
    M.map((head) =>
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

export function exists_<Id, E, A>(exit: PExit<Id, E, A>, predicate: Predicate<A>): boolean {
  return match_(exit, () => false, predicate)
}

/**
 * @dataFirst exists_
 */
export function exists<A>(predicate: Predicate<A>): <Id, E>(exit: PExit<Id, E, A>) => boolean {
  return (exit) => exists_(exit, predicate)
}

export function orElseFail_<Id, E, A, E1>(exit: PExit<Id, E, A>, orElse: () => E1) {
  return mapError_(exit, orElse)
}

/**
 * @dataFirst orElseFail_
 */
export function orElseFail<E1>(orElse: () => E1): <Id, E, A>(exit: PExit<Id, E, A>) => PExit<Id, E1, A> {
  return (exit) => orElseFail_(exit, orElse)
}

export function untraced<Id, E, A>(exit: PExit<Id, E, A>): PExit<Id, E, A> {
  return mapErrorCause_(exit, C.untraced)
}
