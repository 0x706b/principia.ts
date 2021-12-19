import type * as HKT from './HKT'

import * as Dt from './Datum'
import * as E from './Either'
import { constFalse, flow, identity } from './function'
import * as M from './Maybe'
import * as P from './prelude'
import { tuple } from './tuple/core'

export type DatumEither<E, A> = Dt.Datum<E.Either<E, A>>

export interface DatumEitherF extends HKT.HKT {
  readonly type: DatumEither<this['E'], this['A']>
  readonly variance: {
    E: '+'
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export const initial: <E = never, A = never>() => DatumEither<E, A> = Dt.initial

export const pending: <E = never, A = never>() => DatumEither<E, A> = Dt.pending

export function refreshingRight<E = never, A = never>(a: A): DatumEither<E, A> {
  return Dt.refreshing(E.right(a))
}

export function refreshingLeft<E = never, A = never>(e: E): DatumEither<E, A> {
  return Dt.refreshing(E.left(e))
}

export function repleteRight<E = never, A = never>(a: A): DatumEither<E, A> {
  return Dt.replete(E.right(a))
}

export function repleteLeft<E = never, A = never>(e: E): DatumEither<E, A> {
  return Dt.replete(E.left(e))
}

/*
 * -------------------------------------------------------------------------------------------------
 * refinements
 * -------------------------------------------------------------------------------------------------
 */

export const isInitial = Dt.isInitial

export const isPending = Dt.isPending

export const isRefreshing = Dt.isRefreshing

export const isReplete = Dt.isReplete

export const isNonEmpty = Dt.isNonEmpty

export const isEmpty = Dt.isEmpty

export function isRefreshingLeft<E, A>(fa: DatumEither<E, A>): fa is Dt.Refreshing<E.Left<E>> {
  return isRefreshing(fa) && E.isLeft(fa.value)
}

export function isRefreshingRight<E, A>(fa: DatumEither<E, A>): fa is Dt.Refreshing<E.Right<A>> {
  return isRefreshing(fa) && E.isRight(fa.value)
}

export function isRepleteLeft<E, A>(fa: DatumEither<E, A>): fa is Dt.Replete<E.Left<E>> {
  return isReplete(fa) && E.isLeft(fa.value)
}

export function isRepleteRight<E, A>(fa: DatumEither<E, A>): fa is Dt.Replete<E.Right<A>> {
  return isReplete(fa) && E.isRight(fa.value)
}

export function isLeft<E, A>(fa: DatumEither<E, A>): fa is Dt.Refreshing<E.Left<E>> | Dt.Replete<E.Left<E>> {
  return isNonEmpty(fa) && E.isLeft(fa.value)
}

export function isRight<E, A>(fa: DatumEither<E, A>): fa is Dt.Refreshing<E.Right<A>> | Dt.Replete<E.Right<A>> {
  return isNonEmpty(fa) && E.isRight(fa.value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function match_<E, A, B, C, D, F, G, H>(
  fa: DatumEither<E, A>,
  onInitial: () => B,
  onPending: () => C,
  onRefreshingLeft: (e: E) => D,
  onRefreshingRight: (a: A) => F,
  onRepleteLeft: (e: E) => G,
  onRepleteRight: (a: A) => H
): B | C | D | F | G | H {
  return Dt.match_(
    fa,
    onInitial,
    onPending,
    E.match(onRefreshingLeft, onRefreshingRight),
    E.match(onRepleteLeft, onRepleteRight)
  )
}

export function match<E, A, B, C, D, F, G, H>(
  onInitial: () => B,
  onPending: () => C,
  onRefreshingLeft: (e: E) => D,
  onRefreshingRight: (a: A) => F,
  onRepleteLeft: (e: E) => G,
  onRepleteRight: (a: A) => H
): (fa: DatumEither<E, A>) => B | C | D | F | G | H {
  return (fa) => match_(fa, onInitial, onPending, onRefreshingLeft, onRefreshingRight, onRepleteLeft, onRepleteRight)
}

export function matchLoading_<E, A, B, C, D, F>(
  fa: DatumEither<E, A>,
  onEmpty: () => B,
  onPending: () => C,
  onLeft: (e: E, r: boolean) => D,
  onRight: (a: A, r: boolean) => F
): B | C | D | F {
  return Dt.match_(
    fa,
    onEmpty,
    onPending,
    E.match(
      (e) => onLeft(e, true),
      (a) => onRight(a, true)
    ),
    E.match(
      (e) => onLeft(e, false),
      (a) => onRight(a, false)
    )
  )
}

export function matchLoading<E, A, B, C, D, F>(
  onEmpty: () => B,
  onPending: () => C,
  onLeft: (e: E, r: boolean) => D,
  onRight: (a: A, r: boolean) => F
): (fa: DatumEither<E, A>) => B | C | D | F {
  return (fa) => matchLoading_(fa, onEmpty, onPending, onLeft, onRight)
}

export function squash_<E, A, B, C, D>(
  fa: DatumEither<E, A>,
  onEmpty: (r: boolean) => B,
  onLeft: (e: E, r: boolean) => C,
  onRight: (a: A, r: boolean) => D
): B | C | D {
  return Dt.match_(
    fa,
    () => onEmpty(false),
    () => onEmpty(true),
    E.match(
      (e) => onLeft(e, true),
      (a) => onRight(a, true)
    ),
    E.match(
      (e) => onLeft(e, false),
      (a) => onRight(a, false)
    )
  )
}

export function squash<E, A, B, C, D>(
  onEmpty: (r: boolean) => B,
  onLeft: (e: E, r: boolean) => C,
  onRight: (a: A, r: boolean) => D
): (fa: DatumEither<E, A>) => B | C | D {
  return (fa) => squash_(fa, onEmpty, onLeft, onRight)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<E, A, B>(fa: DatumEither<E, A>, f: (a: A) => B): DatumEither<E, B> {
  return Dt.map_(fa, E.map(f))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: DatumEither<E, A>) => DatumEither<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<E, A, E1, B, C>(
  fa: DatumEither<E, A>,
  fb: DatumEither<E1, B>,
  f: (a: A, b: B) => C
): DatumEither<E | E1, C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, E1, B, C>(
  fb: DatumEither<E1, B>,
  f: (a: A, b: B) => C
): <E>(fa: DatumEither<E, A>) => DatumEither<E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<E, A, E1, B>(
  fa: DatumEither<E, A>,
  fb: DatumEither<E1, B>
): DatumEither<E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<E1, B>(
  fb: DatumEither<E1, B>
): <E, A>(fa: DatumEither<E, A>) => DatumEither<E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): DatumEither<never, void> {
  return repleteRight(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<E, A, E1, B>(fab: DatumEither<E, (a: A) => B>, fa: DatumEither<E1, A>): DatumEither<E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<A, E1>(fa: DatumEither<E1, A>): <E, B>(fab: DatumEither<E, (a: A) => B>) => DatumEither<E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <A>(a: A) => DatumEither<never, A> = repleteRight

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<E, A, E1, B>(ma: DatumEither<E, A>, f: (a: A) => DatumEither<E1, B>): DatumEither<E | E1, B> {
  return Dt.chain_(ma, (ea): DatumEither<E | E1, B> => E.match_(ea, repleteLeft, f))
}

export function chain<A, E1, B>(f: (a: A) => DatumEither<E1, B>): <E>(fa: DatumEither<E, A>) => DatumEither<E | E1, B> {
  return (ma) => chain_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<E, A, E1, B>(fa: DatumEither<E, A>, fb: () => DatumEither<E1, B>): DatumEither<E | E1, A | B> {
  return match_(fa, fb, fb, fb, refreshingRight, fb, repleteRight)
}

export function alt<E1, B>(fb: () => DatumEither<E1, B>): <E, A>(fa: DatumEither<E, A>) => DatumEither<E | E1, A | B> {
  return (fa) => alt_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alternative
 * -------------------------------------------------------------------------------------------------
 */

export const nil: () => DatumEither<never, never> = initial

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<E, A, B extends A>(fa: DatumEither<E, A>, refinement: P.Refinement<A, B>): DatumEither<E, B>
export function filter_<E, A>(fa: DatumEither<E, A>, predicate: P.Predicate<A>): DatumEither<E, A>
export function filter_<E, A>(fa: DatumEither<E, A>, predicate: P.Predicate<A>): DatumEither<E, A> {
  return match_(
    fa,
    initial,
    pending,
    refreshingLeft,
    (a) => (predicate(a) ? fa : initial()),
    repleteLeft,
    (a) => (predicate(a) ? fa : initial())
  )
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): <E>(fa: DatumEither<E, A>) => DatumEither<E, B>
export function filter<A>(predicate: P.Predicate<A>): <E>(fa: DatumEither<E, A>) => DatumEither<E, A>
export function filter<A>(predicate: P.Predicate<A>): <E>(fa: DatumEither<E, A>) => DatumEither<E, A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<E, A, B extends A>(
  fa: DatumEither<E, A>,
  refinement: P.Refinement<A, B>
): readonly [DatumEither<E, A>, DatumEither<E, B>]
export function partition_<E, A>(
  fa: DatumEither<E, A>,
  predicate: P.Predicate<A>
): readonly [DatumEither<E, A>, DatumEither<E, A>]
export function partition_<E, A>(
  fa: DatumEither<E, A>,
  predicate: P.Predicate<A>
): readonly [DatumEither<E, A>, DatumEither<E, A>] {
  return [filter_(fa, (a) => !predicate(a)), filter_(fa, predicate)]
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): <E>(fa: DatumEither<E, A>) => readonly [DatumEither<E, A>, DatumEither<E, B>]
export function partition<A>(
  predicate: P.Predicate<A>
): <E>(fa: DatumEither<E, A>) => readonly [DatumEither<E, A>, DatumEither<E, A>]
export function partition<A>(
  predicate: P.Predicate<A>
): <E>(fa: DatumEither<E, A>) => readonly [DatumEither<E, A>, DatumEither<E, A>] {
  return (fa) => partition_(fa, predicate)
}

export function filterMap_<E, A, B>(fa: DatumEither<E, A>, f: (a: A) => M.Maybe<B>): DatumEither<E, B> {
  return match_(
    fa,
    initial,
    pending,
    refreshingLeft,
    flow(f, M.match(initial, refreshingRight)),
    repleteLeft,
    flow(f, M.match(initial, repleteRight))
  )
}

export function filterMap<A, B>(f: (a: A) => M.Maybe<B>): <E>(fa: DatumEither<E, A>) => DatumEither<E, B> {
  return (fa) => filterMap_(fa, f)
}

export function partitionMap_<E, A, B, C>(
  fa: DatumEither<E, A>,
  f: (a: A) => E.Either<B, C>
): readonly [DatumEither<E, B>, DatumEither<E, C>] {
  return match_(
    fa,
    () => [initial(), initial()],
    () => [pending(), pending()],
    (e) => [refreshingLeft(e), refreshingLeft(e)],
    flow(
      f,
      E.match(
        (b) => [refreshingRight(b), initial()],
        (c) => [initial(), refreshingRight(c)]
      )
    ),
    (e) => [repleteLeft(e), repleteLeft(e)],
    flow(
      f,
      E.match(
        (b) => [repleteRight(b), initial()],
        (c) => [initial(), repleteRight(c)]
      )
    )
  )
}

export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>
): <E>(fa: DatumEither<E, A>) => readonly [DatumEither<E, B>, DatumEither<E, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<E, A, B>(fa: DatumEither<E, A>, b: B, f: (b: B, a: A) => B): B {
  return squash_(
    fa,
    () => b,
    () => b,
    (a) => f(b, a)
  )
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: DatumEither<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<E, A, B>(fa: DatumEither<E, A>, b: B, f: (a: A, b: B) => B): B {
  return squash_(
    fa,
    () => b,
    () => b,
    (a) => f(a, b)
  )
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: DatumEither<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: DatumEither<E, A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: DatumEither<E, A>) => M {
  const foldMapM_ = foldMap_(M)
  return (f) => (fa) => foldMapM_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<E, A, B>(wa: DatumEither<E, A>, f: (wa: DatumEither<E, A>) => B): DatumEither<E, B> {
  return repleteRight(f(wa))
}

export function extend<E, A, B>(f: (wa: DatumEither<E, A>) => B): (wa: DatumEither<E, A>) => DatumEither<E, B> {
  return (wa) => extend_(wa, f)
} /*

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const traverse_: P.TraverseFn_<DatumEitherF> = (A) => (ta, f) =>
  match_(
    ta,
    () => A.pure(initial()),
    () => A.pure(pending()),
    flow(refreshingLeft, A.pure),
    flow(f, A.map(refreshingRight)),
    flow(repleteLeft, A.pure),
    flow(f, A.map(repleteRight))
  )

export const traverse: P.TraverseFn<DatumEitherF> = (A) => {
  const traverseA_ = traverse_(A)
  return (f) => (ta) => traverseA_(ta, f)
}

export const sequence: P.SequenceFn<DatumEitherF> = (A) => {
  const traverseA_ = traverse_(A)
  return (ta) => traverseA_(ta, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function getOrElse_<E, A, B, C>(fa: DatumEither<E, A>, onEmpty: () => B, onLeft: (e: E) => C): A | B | C {
  return squash_(fa, onEmpty, onLeft, identity)
}

export function getOrElse<E, B, C>(onEmpty: () => B, onLeft: (e: E) => C): <A>(fa: DatumEither<E, A>) => A | B | C {
  return (fa) => getOrElse_(fa, onEmpty, onLeft)
}

export function exists_<E, A, B extends A>(
  fa: DatumEither<E, A>,
  refinement: P.Refinement<A, B>
): fa is DatumEither<E, B>
export function exists_<E, A>(fa: DatumEither<E, A>, predicate: P.Predicate<A>): boolean
export function exists_<E, A>(fa: DatumEither<E, A>, predicate: P.Predicate<A>): boolean {
  return squash_(fa, constFalse, constFalse, predicate)
}

export function exists<A, B extends A>(
  refinement: P.Refinement<A, B>
): <E>(fa: DatumEither<E, A>) => fa is DatumEither<E, B>
export function exists<A>(predicate: P.Predicate<A>): <E>(fa: DatumEither<E, A>) => boolean
export function exists<A>(predicate: P.Predicate<A>): <E>(fa: DatumEither<E, A>) => boolean {
  return (fa) => exists_(fa, predicate)
}

export const toRefreshing: <E, A>(fa: DatumEither<E, A>) => DatumEither<E, A> = Dt.toRefreshing

export const toReplete: <E, A>(fa: DatumEither<E, A>) => DatumEither<E, A> = Dt.toReplete

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<DatumEitherF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<DatumEitherF>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<DatumEitherF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<DatumEitherF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<DatumEitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Alt = P.Alt<DatumEitherF>({
  map_,
  alt_
})

export const Alternative = P.Alternative<DatumEitherF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  alt_,
  nil
})

export const Filterable = P.Filterable<DatumEitherF>({
  map_,
  filter_,
  partition_,
  filterMap_,
  partitionMap_
})

export const Foldable = P.Foldable<DatumEitherF>({
  foldl_,
  foldr_,
  foldMap_
})

export const Traversable = P.Traversable<DatumEitherF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export const Extend = P.Extend<DatumEitherF>({
  map_,
  extend_
})
