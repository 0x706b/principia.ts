import type * as HKT from '@principia/base/HKT'

import * as A from '@principia/base/Array'
import { flow, identity, pipe, unsafeCoerce } from '@principia/base/function'
import * as P from '@principia/base/prelude'
import * as R from '@principia/base/Reader'
import { tuple } from '@principia/base/tuple'

import * as O from './Observable'

export interface ReaderObservable<R, E, A> extends R.Reader<R, O.Observable<E, A>> {}

export interface ReaderObservableF extends HKT.HKT {
  readonly type: ReaderObservable<this['R'], this['E'], this['A']>
  readonly index: number
  readonly variance: {
    R: '-'
    E: '+'
    A: '+'
  }
}

export type EnvOf<X> = [X] extends [ReaderObservable<infer R, any, any>] ? R : never
export type ErrorOf<X> = [X] extends [ReaderObservable<any, infer E, any>] ? E : never
export type TypeOf<X> = [X] extends [ReaderObservable<any, any, infer A>] ? A : never

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

export function cross_<R, E, A, R1, E1, B>(
  fa: ReaderObservable<R, E, A>,
  fb: ReaderObservable<R1, E1, B>
): ReaderObservable<R & R1, E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, E1, B>(
  fb: ReaderObservable<R1, E1, B>
): <R, E, A>(fa: ReaderObservable<R, E, A>) => ReaderObservable<R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<R, E, A, R1, E1, B>(
  fab: ReaderObservable<R, E, (a: A) => B>,
  fa: ReaderObservable<R1, E1, A>
): ReaderObservable<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<R1, E1, A>(
  fa: ReaderObservable<R1, E1, A>
): <R, E, B>(fab: ReaderObservable<R, E, (a: A) => B>) => ReaderObservable<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoidal Functor
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): ReaderObservable<unknown, never, void> {
  return asksObservable(() => O.unit())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export function pure<A>(a: A): ReaderObservable<unknown, never, A> {
  return asksObservable(() => O.pure(a))
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

export function flatten<R, E, R1, E1, A>(
  mma: ReaderObservable<R, E, ReaderObservable<R1, E1, A>>
): ReaderObservable<R & R1, E | E1, A> {
  return concatMap_(mma, identity)
}

export function switchFlatten<R, E, R1, E1, A>(
  mma: ReaderObservable<R, E, ReaderObservable<R1, E1, A>>
): ReaderObservable<R & R1, E | E1, A> {
  return switchMap_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Reader
 * -------------------------------------------------------------------------------------------------
 */

export function asksReaderObservable<R0, R, E, A>(
  f: (r0: R0) => ReaderObservable<R, E, A>
): ReaderObservable<R0 & R, E, A> {
  return (r) => f(r)(r)
}

export function asksObservable<R, E, A>(f: (r: R) => O.Observable<E, A>): ReaderObservable<R, E, A> {
  return f
}

export function asks<R, A>(f: (r: R) => A): ReaderObservable<R, never, A> {
  return asksObservable((r) => O.pure(f(r)))
}

export function giveAll_<R, E, A>(ra: ReaderObservable<R, E, A>, r: R): O.Observable<E, A> {
  return ra(r)
}

export function giveAll<R>(r: R): <E, A>(ra: ReaderObservable<R, E, A>) => O.Observable<E, A> {
  return (ra) => giveAll_(ra, r)
}

export function giveSome_<R, E, A, R0>(ra: ReaderObservable<R, E, A>, f: (r0: R0) => R): ReaderObservable<R0, E, A> {
  return (r0) => pipe(ra, giveAll(f(r0)))
}

export function giveSome<R, R0>(f: (r0: R0) => R): <E, A>(ra: ReaderObservable<R, E, A>) => ReaderObservable<R0, E, A> {
  return (ra) => giveSome_(ra, f)
}

export function give_<R0, R, E, A>(ra: ReaderObservable<R & R0, E, A>, r0: R0): ReaderObservable<R, E, A> {
  return (r) => pipe(ra, giveAll({ ...r, ...r0 }))
}

export function give<R0>(r0: R0): <R, E, A>(ra: ReaderObservable<R & R0, E, A>) => ReaderObservable<R, E, A> {
  return (ra) => give_(ra, r0)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Profunctor
 * -------------------------------------------------------------------------------------------------
 */

export function promap_<R, E, A, R0, B>(
  fa: ReaderObservable<R, E, A>,
  f: (r0: R0) => R,
  g: (a: A) => B
): ReaderObservable<R0, E, B> {
  return pipe(fa, giveSome(f), map(g))
}

export function promap<R, A, R0, B>(
  f: (r0: R0) => R,
  g: (a: A) => B
): <E>(fa: ReaderObservable<R, E, A>) => ReaderObservable<R0, E, B> {
  return (fa) => promap_(fa, f, g)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function combineLatest_<A extends ReadonlyArray<ReaderObservable<any, any, any>>>(
  ...sources: A
): ReaderObservable<EnvOf<A[number]>, ErrorOf<A[number]>, { [K in keyof A]: TypeOf<A[K]> }> {
  return asksObservable((r) =>
    unsafeCoerce(
      pipe(
        sources,
        A.map((ro) => ro(r)),
        (s) => O.combineLatest_(...s)
      )
    )
  )
}

export function combineLatest<O extends ReadonlyArray<ReaderObservable<any, any, any>>>(
  ...sources: O
): <R, E, A>(
  fa: ReaderObservable<R, E, A>
) => ReaderObservable<R & EnvOf<O[number]>, E | ErrorOf<O[number]>, [A, ...{ [K in keyof O]: TypeOf<O[K]> }]> {
  return (fa) => combineLatest_(fa, ...sources)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor: P.Functor<ReaderObservableF> = P.Functor({
  map_
})

export const FunctorWithIndex: P.FunctorWithIndex<ReaderObservableF> = P.FunctorWithIndex({
  imap_: map_
})

export const SemimonoidalFunctor: P.SemimonoidalFunctor<ReaderObservableF> = P.SemimonoidalFunctor({
  map_,
  cross_,
  crossWith_
})

export const crossS_ = P.crossSF_(SemimonoidalFunctor)

export const crossS = P.crossSF(SemimonoidalFunctor)

export const crossT_ = P.crossTF_(SemimonoidalFunctor)

export const crossT = P.crossTF(SemimonoidalFunctor)

export const sequenceS = P.sequenceSF(SemimonoidalFunctor)

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)

export const Apply: P.Apply<ReaderObservableF> = P.Apply({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const apS = P.apSF(Apply)

export const apT = P.apTF(Apply)

export const MonoidalFunctor: P.MonoidalFunctor<ReaderObservableF> = P.MonoidalFunctor({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative: P.Applicative<ReaderObservableF> = P.Applicative({
  map_,
  cross_,
  crossWith_,
  unit,
  pure
})

export const Monad: P.Monad<ReaderObservableF> = P.Monad({
  map_,
  cross_,
  crossWith_,
  unit,
  pure,
  chain_: concatMap_,
  flatten
})

const _do = O.pure({})

export { _do as do }

export const chainS_ = P.chainSF_(Monad)

export const chainS = P.chainSF(Monad)

export const pureS_ = P.pureSF_(Monad)

export const pureS = P.pureSF(Monad)

export const MonadSwitch: P.Monad<ReaderObservableF> = P.Monad({
  map_,
  cross_,
  crossWith_,
  unit,
  pure,
  chain_: switchMap_,
  flatten: switchFlatten
})
