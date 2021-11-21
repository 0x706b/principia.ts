import { flow, pipe } from '@principia/base/function'
import * as R from '@principia/base/Reader'

import * as O from './Observable'

export interface ReaderObservable<R, E, A> extends R.Reader<R, O.Observable<E, A>> {}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function fromObservable<E, A>(fa: O.Observable<E, A>): ReaderObservable<unknown, E, A> {
  return R.pure(fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, E, A, B>(fa: ReaderObservable<R, E, A>, f: (a: A, i: number) => B): ReaderObservable<R, E, B> {
  return asksObservable((r) => pipe(fa, giveAll(r), O.map(f)))
}

export function map<A, B>(
  f: (a: A, i: number) => B
): <R, E>(fa: ReaderObservable<R, E, A>) => ReaderObservable<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Bifunctor
 * -------------------------------------------------------------------------------------------------
 */

export function mapError_<R, E, A, E1>(fa: ReaderObservable<R, E, A>, f: (e: E) => E1): ReaderObservable<R, E1, A> {
  return asksObservable((r) => pipe(fa, giveAll(r), O.mapError(f)))
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(fa: ReaderObservable<R, E, A>) => ReaderObservable<R, E1, A> {
  return (fa) => mapError_(fa, f)
}

export function swap<R, E, A>(fa: ReaderObservable<R, E, A>): ReaderObservable<R, A, E> {
  return asksObservable((r) => pipe(fa, giveAll(r), O.swap))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semimonoidal Functor
 * -------------------------------------------------------------------------------------------------
 */

export function mergeMap_<R, E, A, R1, E1, B>(
  ma: ReaderObservable<R, E, A>,
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>,
  concurrent = Infinity
): ReaderObservable<R & R1, E | E1, B> {
  return asksObservable((r) => pipe(ma, giveAll(r), O.mergeMap(flow(f, giveAll(r)), concurrent)))
}

export function mergeMap<A, R1, E1, B>(
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>,
  concurrent = Infinity
): <R, E>(ma: ReaderObservable<R, E, A>) => ReaderObservable<R & R1, E | E1, B> {
  return (ma) => mergeMap_(ma, f, concurrent)
}

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: ReaderObservable<R, E, A>,
  fb: ReaderObservable<R1, E1, B>,
  f: (a: A, b: B) => C
): ReaderObservable<R & R1, E | E1, C> {
  return pipe(
    fa,
    mergeMap((a) =>
      pipe(
        fb,
        map((b) => f(a, b))
      )
    )
  )
}

export function crossWith<A, R1, E1, B, C>(
  fb: ReaderObservable<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: ReaderObservable<R, E, A>) => ReaderObservable<R & R1, E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function concatMap_<R, E, A, R1, E1, B>(
  ma: ReaderObservable<R, E, A>,
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>
): ReaderObservable<R & R1, E | E1, B> {
  return asksObservable((r) => pipe(ma, giveAll(r), O.concatMap(flow(f, giveAll(r)))))
}

export function concatMap<A, R1, E1, B>(
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>
): <R, E>(ma: ReaderObservable<R, E, A>) => ReaderObservable<R & R1, E | E1, B> {
  return (ma) => concatMap_(ma, f)
}

export function switchMap_<R, E, A, R1, E1, B>(
  ma: ReaderObservable<R, E, A>,
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>
): ReaderObservable<R & R1, E | E1, B> {
  return asksObservable((r) => pipe(ma, giveAll(r), O.switchMap(flow(f, giveAll(r)))))
}

export function switchMap<A, R1, E1, B>(
  f: (a: A, i: number) => ReaderObservable<R1, E1, B>
): <R, E>(ma: ReaderObservable<R, E, A>) => ReaderObservable<R & R1, E | E1, B> {
  return (ma) => switchMap_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function asksObservable<R, E, A>(f: (r: R) => O.Observable<E, A>): ReaderObservable<R, E, A> {
  return f
}

export function giveAll_<R, E, A>(ra: ReaderObservable<R, E, A>, r: R): O.Observable<E, A> {
  return ra(r)
}

export function giveAll<R>(r: R): <E, A>(ra: ReaderObservable<R, E, A>) => O.Observable<E, A> {
  return (ra) => giveAll_(ra, r)
}
