import { identity, pipe } from '../function'
import { tuple } from '../tuple'
import { matchTag_ } from '../util/match'

export interface Interrupt {
  readonly _tag: 'Interrupt'
}

export interface Success<A> {
  readonly _tag: 'Success'
  readonly value: A
}

export interface Failure<E> {
  readonly _tag: 'Failure'
  readonly error: E
}

export type Rejection<E> = Interrupt | Failure<E>

export type AsyncExit<E, A> = Rejection<E> | Success<A>

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const fail = <E = never>(e: E): Rejection<E> => ({
  _tag: 'Failure',
  error: e
})

export const succeed = <E = never, A = never>(a: A): AsyncExit<E, A> => ({
  _tag: 'Success',
  value: a
})

export const interrupt = <E = never>(): Rejection<E> => ({
  _tag: 'Interrupt'
})

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isSuccess<E, A>(exit: AsyncExit<E, A>): exit is Success<A> {
  return exit._tag === 'Success'
}

export function isFailure<E, A>(exit: AsyncExit<E, A>): exit is Failure<E> {
  return exit._tag === 'Failure'
}

export function isInterrupt<E, A>(exit: AsyncExit<E, A>): exit is Interrupt {
  return exit._tag === 'Interrupt'
}

/*
 * -------------------------------------------------------------------------------------------------
 * Folds
 * -------------------------------------------------------------------------------------------------
 */

export function fold_<E, A, B>(
  exit: AsyncExit<E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => B,
  onInterrupt: () => B
): B {
  switch (exit._tag) {
    case 'Success': {
      return onSuccess(exit.value)
    }
    case 'Failure': {
      return onFailure(exit.error)
    }
    case 'Interrupt': {
      return onInterrupt()
    }
  }
}

export function fold<E, A, B>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => B,
  onInterrupt: () => B
): (exit: AsyncExit<E, A>) => B {
  return (exit) => fold_(exit, onFailure, onSuccess, onInterrupt)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<E, A, E1, B, C>(
  fa: AsyncExit<E, A>,
  fb: AsyncExit<E1, B>,
  f: (a: A, b: B) => C
): AsyncExit<E | E1, C> {
  return fa._tag === 'Success'
    ? fb._tag === 'Success'
      ? succeed(f(fa.value, fb.value))
      : fb._tag === 'Failure'
      ? fail(fb.error)
      : interrupt()
    : fa._tag === 'Failure'
    ? fail(fa.error)
    : interrupt()
}

export function crossWith<A, E1, B, C>(
  fb: AsyncExit<E1, B>,
  f: (a: A, b: B) => C
): <E>(fa: AsyncExit<E, A>) => AsyncExit<E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<E, A, E1, B>(fa: AsyncExit<E, A>, fb: AsyncExit<E1, B>): AsyncExit<E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<E1, B>(fb: AsyncExit<E1, B>): <E, A>(fa: AsyncExit<E, A>) => AsyncExit<E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<E, A, E1, B>(fab: AsyncExit<E1, (a: A) => B>, fa: AsyncExit<E, A>): AsyncExit<E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<E, A>(fa: AsyncExit<E, A>): <E1, B>(fab: AsyncExit<E1, (a: A) => B>) => AsyncExit<E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<E, A, G>(pab: AsyncExit<E, A>, f: (e: E) => G): AsyncExit<G, A> {
  return isFailure(pab) ? fail(f(pab.error)) : pab
}

export function mapError<E, G>(f: (e: E) => G): <A>(pab: AsyncExit<E, A>) => AsyncExit<G, A> {
  return (pab) => mapError_(pab, f)
}

export function bimap_<E, A, G, B>(pab: AsyncExit<E, A>, f: (e: E) => G, g: (a: A) => B): AsyncExit<G, B> {
  return matchTag_(pab, {
    Interrupt: (_) => _,
    Success: (_) => succeed(g(_.value)),
    Failure: (_) => fail(f(_.error))
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: AsyncExit<E, A>, f: (a: A) => B): AsyncExit<E, B> {
  return isSuccess(fa) ? succeed(f(fa.value)) : fa
}

export function map<A, B>(f: (a: A) => B): <E>(fa: AsyncExit<E, A>) => AsyncExit<E, B> {
  return (fa) => map_(fa, f)
}

export function as_<E, A, B>(fa: AsyncExit<E, A>, b: B): AsyncExit<E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <E, A>(fa: AsyncExit<E, A>) => AsyncExit<E, B> {
  return (fa) => as_(fa, b)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<E, A, E1, B>(ma: AsyncExit<E, A>, f: (a: A) => AsyncExit<E1, B>): AsyncExit<E | E1, B> {
  return matchTag_(
    ma,
    {
      Success: (_) => f(_.value)
    },
    (_) => _
  )
}

export function chain<A, E1, B>(f: (a: A) => AsyncExit<E1, B>): <E>(ma: AsyncExit<E, A>) => AsyncExit<E | E1, B> {
  return (ma) => chain_(ma, f)
}

export function flatten<E, E1, A>(mma: AsyncExit<E, AsyncExit<E1, A>>): AsyncExit<E | E1, A> {
  return chain_(mma, identity)
}

export function tap_<E, A, E1, B>(ma: AsyncExit<E, A>, f: (a: A) => AsyncExit<E1, B>): AsyncExit<E | E1, A> {
  return chain_(ma, (a) => pipe(f(a), as(a)))
}

export function tap<A, E1, B>(f: (a: A) => AsyncExit<E1, B>): <E>(ma: AsyncExit<E, A>) => AsyncExit<E | E1, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): AsyncExit<never, void> {
  return succeed(undefined)
}
