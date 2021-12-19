import type * as HKT from './HKT'

import * as E from './Either'
import { constFalse, flow, identity } from './function'
import * as M from './Maybe'
import * as P from './prelude'
import { $equals, equals } from './Structural/Equatable'
import { $hash, combineHash, hash, hashString } from './Structural/Hashable'
import { tuple } from './tuple/core'
import { isObject } from './util/predicates'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

export const DatumTypeId = Symbol.for('@principia/base/Datum')
export type DatumTypeId = typeof DatumTypeId

const _initialHash    = hashString('@principia/base/Datum/Initial')
const _pendingHash    = hashString('@principia/base/Datum/Pending')
const _refreshingHash = hashString('@principia/base/Datum/Refreshing')
const _repleteHash    = hashString('@principia/base/Datum/Replete')

export interface Initial {
  readonly _tag: 'Initial'
}

const InitialConstructor = class Initial implements Initial {
  readonly [DatumTypeId]: DatumTypeId = DatumTypeId
  readonly _tag = 'Initial';
  [$equals](that: unknown): boolean {
    return isDatum(that) && isInitial(that)
  }
  get [$hash](): number {
    return _initialHash
  }
}

export interface Pending {
  readonly _tag: 'Pending'
}

const PendingConstructor = class Pending implements Pending {
  readonly [DatumTypeId]: DatumTypeId = DatumTypeId
  readonly _tag = 'Pending';
  [$equals](that: unknown): boolean {
    return isDatum(that) && isPending(that)
  }
  get [$hash](): number {
    return _pendingHash
  }
}

export interface Refreshing<A> {
  readonly _tag: 'Refreshing'
  readonly value: A
}

const RefreshingConstructor = class Refreshing<A> implements Refreshing<A> {
  readonly [DatumTypeId]: DatumTypeId = DatumTypeId
  readonly _tag = 'Refreshing'
  constructor(readonly value: A) {}
  [$equals](that: unknown): boolean {
    return isDatum(that) && isRefreshing(that) && equals(this.value, that.value)
  }
  get [$hash](): number {
    return combineHash(_refreshingHash, hash(this.value))
  }
}

export interface Replete<A> {
  readonly _tag: 'Replete'
  readonly value: A
}

const RepleteConstructor = class Replete<A> implements Replete<A> {
  readonly [DatumTypeId]: DatumTypeId = DatumTypeId
  readonly _tag = 'Replete'
  constructor(readonly value: A) {}
  [$equals](that: unknown): boolean {
    return isDatum(that) && isReplete(that) && equals(this.value, that.value)
  }
  get [$hash](): number {
    return combineHash(_repleteHash, hash(this.value))
  }
}

export type Datum<A> = Initial | Pending | Refreshing<A> | Replete<A>

export interface DatumF extends HKT.HKT {
  readonly type: Datum<this['A']>
  readonly variance: {
    A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * refinements
 * -------------------------------------------------------------------------------------------------
 */

export function isDatum(u: unknown): u is Datum<unknown> {
  return (
    isObject(u) &&
    (DatumTypeId in u ||
      ('_tag' in u &&
        typeof u['_tag'] === 'string' &&
        (u['_tag'] === 'Initial' || u['_tag'] === 'Pending' || u['_tag'] === 'Refreshing' || u['_tag'] === 'Replete')))
  )
}

export function isInitial<A>(fa: Datum<A>): fa is Initial {
  return fa._tag === 'Initial'
}

export function isPending<A>(fa: Datum<A>): fa is Pending {
  return fa._tag === 'Pending'
}

export function isRefreshing<A>(fa: Datum<A>): fa is Refreshing<A> {
  return fa._tag === 'Refreshing'
}

export function isReplete<A>(fa: Datum<A>): fa is Replete<A> {
  return fa._tag === 'Replete'
}

export function isEmpty<A>(fa: Datum<A>): fa is Initial | Pending {
  return isInitial(fa) || isPending(fa)
}

export function isNonEmpty<A>(fa: Datum<A>): fa is Refreshing<A> | Replete<A> {
  return isRefreshing(fa) || isReplete(fa)
}

export function isLoading<A>(fa: Datum<A>): fa is Pending | Refreshing<A> {
  return isPending(fa) || isRefreshing(fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * matching constructors
 * -------------------------------------------------------------------------------------------------
 */

export const Initial = new InitialConstructor()

export const Pending: Datum<never> = new PendingConstructor()

export function Refreshing<A>(value: A): Refreshing<A> {
  return new RefreshingConstructor(value)
}

export function Replete<A>(value: A): Replete<A> {
  return new RepleteConstructor(value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

export function initial<A = never>(): Datum<A> {
  return Initial
}

export function pending<A = never>(): Datum<A> {
  return Pending
}

export function refreshing<A>(value: A): Datum<A> {
  return new RefreshingConstructor(value)
}

export function replete<A>(value: A): Datum<A> {
  return new RepleteConstructor(value)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function match_<A, B, C, D, E>(
  fa: Datum<A>,
  onInitial: () => B,
  onPending: () => C,
  onRefreshing: (value: A) => D,
  onReplete: (value: A) => E
): B | C | D | E {
  switch (fa._tag) {
    case 'Initial': {
      return onInitial()
    }
    case 'Pending': {
      return onPending()
    }
    case 'Refreshing': {
      return onRefreshing(fa.value)
    }
    case 'Replete': {
      return onReplete(fa.value)
    }
  }
}

export function match<A, B, C, D, E>(
  onInitial: () => B,
  onPending: () => C,
  onRefreshing: (value: A) => D,
  onReplete: (value: A) => E
): (fa: Datum<A>) => B | C | D | E {
  return (fa) => match_(fa, onInitial, onPending, onRefreshing, onReplete)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Datum<A>, f: (a: A) => B): Datum<B> {
  return isRefreshing(fa) ? refreshing(f(fa.value)) : isReplete(fa) ? replete(f(fa.value)) : fa
}

export function map<A, B>(f: (a: A) => B): (fa: Datum<A>) => Datum<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * SemimonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<A, B, C>(fa: Datum<A>, fb: Datum<B>, f: (a: A, b: B) => C): Datum<C> {
  if (isEmpty(fa)) {
    return fa
  }
  if (isEmpty(fb)) {
    return fb
  }
  const c = f(fa.value, fb.value)
  return isRefreshing(fa) || isRefreshing(fb) ? refreshing(c) : replete(c)
}

export function crossWith<A, B, C>(fb: Datum<B>, f: (a: A, b: B) => C): (fa: Datum<A>) => Datum<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: Datum<A>, fb: Datum<B>): Datum<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<B>(fb: Datum<B>): <A>(fa: Datum<A>) => Datum<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function ap_<A, B>(fab: Datum<(a: A) => B>, fa: Datum<A>): Datum<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<A>(fa: Datum<A>): <B>(fab: Datum<(a: A) => B>) => Datum<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * MonoidalFunctor
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Datum<void> {
  return replete(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

export const pure: <A>(a: A) => Datum<A> = replete

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<A, B>(ma: Datum<A>, f: (a: A) => Datum<B>): Datum<B> {
  if (isEmpty(ma)) {
    return ma
  }
  const fb = f(ma.value)
  if (isEmpty(fb)) {
    return fb
  }
  return isRefreshing(ma) || isRefreshing(fb) ? refreshing(fb.value) : replete(fb.value)
}

export function chain<A, B>(f: (a: A) => Datum<B>): (ma: Datum<A>) => Datum<B> {
  return (ma) => chain_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<A, B>(fa: Datum<A>, fb: () => Datum<B>): Datum<A | B> {
  return match_(fa, fb, fb, refreshing, replete)
}

export function alt<B>(fb: () => Datum<B>): <A>(fa: Datum<A>) => Datum<A | B> {
  return (fa) => alt_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alternative
 * -------------------------------------------------------------------------------------------------
 */

export const nil: () => Datum<never> = initial

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(fa: Datum<A>, refinement: P.Refinement<A, B>): Datum<B>
export function filter_<A>(fa: Datum<A>, predicate: P.Predicate<A>): Datum<A>
export function filter_<A>(fa: Datum<A>, predicate: P.Predicate<A>): Datum<A> {
  return match_(
    fa,
    initial,
    pending,
    (a) => (predicate(a) ? fa : initial()),
    (a) => (predicate(a) ? fa : initial())
  )
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Datum<A>) => Datum<B>
export function filter<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => Datum<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => Datum<A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<A, B extends A>(fa: Datum<A>, refinement: P.Refinement<A, B>): readonly [Datum<A>, Datum<B>]
export function partition_<A>(fa: Datum<A>, predicate: P.Predicate<A>): readonly [Datum<A>, Datum<A>]
export function partition_<A>(fa: Datum<A>, predicate: P.Predicate<A>): readonly [Datum<A>, Datum<A>] {
  return [filter_(fa, (a) => !predicate(a)), filter_(fa, predicate)]
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: Datum<A>) => readonly [Datum<A>, Datum<B>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => readonly [Datum<A>, Datum<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => readonly [Datum<A>, Datum<A>] {
  return (fa) => partition_(fa, predicate)
}

export function filterMap_<A, B>(fa: Datum<A>, f: (a: A) => M.Maybe<B>): Datum<B> {
  return match_(fa, initial, pending, flow(f, M.match(initial, refreshing)), flow(f, M.match(initial, replete)))
}

export function filterMap<A, B>(f: (a: A) => M.Maybe<B>): (fa: Datum<A>) => Datum<B> {
  return (fa) => filterMap_(fa, f)
}

export function partitionMap_<A, B, C>(fa: Datum<A>, f: (a: A) => E.Either<B, C>): readonly [Datum<B>, Datum<C>] {
  return match_(
    fa,
    () => [initial(), initial()],
    () => [pending(), pending()],
    flow(
      f,
      E.match(
        (b) => [refreshing(b), initial()],
        (c) => [initial(), refreshing(c)]
      )
    ),
    flow(
      f,
      E.match(
        (b) => [replete(b), initial()],
        (c) => [initial(), replete(c)]
      )
    )
  )
}

export function partitionMap<A, B, C>(f: (a: A) => E.Either<B, C>): (fa: Datum<A>) => readonly [Datum<B>, Datum<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<A, B>(wa: Datum<A>, f: (wa: Datum<A>) => B): Datum<B> {
  return replete(f(wa))
}

export function extend<A, B>(f: (wa: Datum<A>) => B): (wa: Datum<A>) => Datum<B> {
  return (wa) => extend_(wa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: Datum<A>, b: B, f: (b: B, a: A) => B): B {
  return match_(
    fa,
    () => b,
    () => b,
    (a) => f(b, a),
    (a) => f(b, a)
  )
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Datum<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: Datum<A>, b: B, f: (a: A, b: B) => B): B {
  return match_(
    fa,
    () => b,
    () => b,
    (a) => f(a, b),
    (a) => f(a, b)
  )
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Datum<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Datum<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Datum<A>) => M {
  const foldMapM_ = foldMap_(M)
  return (f) => (fa) => foldMapM_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const traverse_: P.TraverseFn_<DatumF> = (A) => (ta, f) =>
  match_(
    ta,
    () => A.pure(initial()),
    () => A.pure(pending()),
    flow(f, A.map(refreshing)),
    flow(f, A.map(replete))
  )

export const traverse: P.TraverseFn<DatumF> = (A) => {
  const traverseA_ = traverse_(A)
  return (f) => (ta) => traverseA_(ta, f)
}

export const sequence: P.SequenceFn<DatumF> = (A) => {
  const traverseA_ = traverse_(A)
  return (ta) => traverseA_(ta, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function getOrElse_<A, B>(fa: Datum<A>, b: () => B): A | B {
  return match_(fa, b, b, identity, identity)
}

export function getOrElse<B>(b: () => B): <A>(fa: Datum<A>) => A | B {
  return (fa) => getOrElse_(fa, b)
}

export function exists_<A, B extends A>(fa: Datum<A>, refinement: P.Refinement<A, B>): fa is Datum<B>
export function exists_<A>(fa: Datum<A>, predicate: P.Predicate<A>): boolean
export function exists_<A>(fa: Datum<A>, predicate: P.Predicate<A>): boolean {
  return match_(fa, constFalse, constFalse, predicate, predicate)
}

export function exists<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Datum<A>) => fa is Datum<B>
export function exists<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => boolean
export function exists<A>(predicate: P.Predicate<A>): (fa: Datum<A>) => boolean {
  return (fa) => exists_(fa, predicate)
}

export function elem_<A>(E: P.Eq<A>): (fa: Datum<A>, a: A) => boolean {
  return (fa, a) => match_(fa, constFalse, constFalse, E.equals(a), E.equals(a))
}

export function elem<A>(E: P.Eq<A>): (a: A) => (fa: Datum<A>) => boolean {
  const elemE_ = elem_(E)
  return (a) => (fa) => elemE_(fa, a)
}

export function toRefreshing<A>(fa: Datum<A>): Datum<A> {
  return match_(fa, pending, pending, () => fa, refreshing)
}

export function toReplete<A>(fa: Datum<A>): Datum<A> {
  return match_(fa, initial, pending, replete, () => fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<DatumF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<DatumF>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<DatumF>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<DatumF>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<DatumF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Alt = P.Alt<DatumF>({
  map_,
  alt_
})

export const Alternative = P.Alternative<DatumF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  alt_,
  nil
})

export const Filterable = P.Filterable<DatumF>({
  map_,
  filter_,
  partition_,
  filterMap_,
  partitionMap_
})

export const Foldable = P.Foldable<DatumF>({
  foldl_,
  foldr_,
  foldMap_
})

export const Traversable = P.Traversable<DatumF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export const Extend = P.Extend<DatumF>({
  map_,
  extend_
})
