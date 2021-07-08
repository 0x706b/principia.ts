import type { Byte } from '../Byte'
import type { Either } from '../Either'
import type { ArrayURI } from '../Modules'
import type { NonEmptyArray } from '../NonEmptyArray'
import type { Option } from '../Option'
import type { ReadonlyRecord } from '../Record'
import type { These } from '../These'

import * as Ev from '../Eval/core'
import { identity, pipe, unsafeCoerce } from '../function'
import { GenLazyHKT, genWithHistoryF } from '../Gen'
import * as G from '../Guard'
import * as HKT from '../HKT'
import * as _ from '../internal/Array'
import * as E from '../internal/Either'
import * as Th from '../internal/These'
import * as NEA from '../NonEmptyArray/core'
import * as N from '../number'
import * as O from '../Option'
import * as Ord from '../Ord'
import { EQ } from '../Ordering'
import * as P from '../prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * model
 * -------------------------------------------------------------------------------------------------
 */

type URI = [HKT.URI<ArrayURI>]

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * A function that returns a type-safe empty Array
 *
 * @category constructors
 * @since 1.0.0
 */
export function empty<A>(): ReadonlyArray<A> {
  return []
}

/**
 * Constructs a new readpnly array from an interable.
 *
 * @category constructors
 * @since 1.0.0
 */
export function from<A>(as: Iterable<A>): ReadonlyArray<A> {
  return Array.from(as)
}

export function fromBuffer(as: Uint8Array): ReadonlyArray<Byte> {
  return unsafeCoerce(Array.from(as))
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @category constructors
 * @since 1.0.0
 */
export function makeBy<A>(n: number, f: (i: number) => A): ReadonlyArray<A> {
  return n <= 0 ? empty() : _.makeBy(n, f)
}

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @category constructors
 * @since 1.0.0
 */
export function range(start: number, end: number): ReadonlyArray<number> {
  return makeBy(end - start + 1, (i) => start + i)
}

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @category constructors
 * @since 1.0.0
 */
export const replicate: <A>(n: number, a: A) => ReadonlyArray<A> = NEA.replicate

/*
 * -------------------------------------------------------------------------------------------------
 * guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(as: ReadonlyArray<A>): boolean {
  return as.length === 0
}

export const isNonEmpty = _.isNonEmpty

export const isOutOfBound_: <A>(as: ReadonlyArray<A>, i: number) => boolean = _.isOutOfBound_

export function isOutOfBound(i: number): <A>(as: ReadonlyArray<A>) => boolean {
  return (as) => isOutOfBound_(as, i)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa: ReadonlyArray<A>, that: () => ReadonlyArray<A>): ReadonlyArray<A> {
  return concat_(fa, that())
}

/**
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 * @dataFirst alt_
 */
export function alt<A>(that: () => ReadonlyArray<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a value into an Array
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <A>(a: A) => NonEmptyArray<A> = NEA.pure

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function _ap<A, B>(fa: ReadonlyArray<A>, fab: ReadonlyArray<(a: A) => B>): ReadonlyArray<B> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B> {
  return chain_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst ap_
 */
export function ap<A>(fa: ReadonlyArray<A>): <B>(fab: ReadonlyArray<(a: A) => B>) => ReadonlyArray<B> {
  return (fab) => ap_(fab, fa)
}

/**
 * The cartesian product of two arrays, mapped with function `f`
 *
 * @category MonoidalFunctor
 * @since 1.0.0
 */
export function crossWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): ReadonlyArray<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * The cartesian product of two arrays, mapped with function `f`
 *
 * @category MonoidalFunctor
 * @since 1.0.0
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * The cartesian product of two arrays
 *
 * @category MonoidalFunctor
 * @since 1.0.0
 */
export function cross_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

/**
 * The cartesian product of two arrays
 *
 * @category MonoidalFunctor
 * @since 1.0.0
 * @dataFirst cross_
 */
export function cross<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Zips two arrays with the function `f`
 *
 * @category Zip
 * @since 1.0.0
 */
export function zipWith_<A, B, C>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>, f: (a: A, b: B) => C): ReadonlyArray<C> {
  const mut_fc = []
  const len    = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    mut_fc[i] = f(fa[i], fb[i])
  }
  return mut_fc
}

/**
 * Zips two arrays with the function `f`
 *
 * @category Zip
 * @since 1.0.0
 * @dataFirst zipWith_
 */
export function zipWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: NonEmptyArray<A>) => ReadonlyArray<C> {
  return (fa) => zipWith_(fa, fb, f)
}

/**
 * Zips two arrays
 *
 * @category Zip
 * @since 1.0.0
 */
export function zip_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b])
}

/**
 * Zips two arrays
 *
 * @category Zip
 * @since 1.0.0
 * @dataFirst zip_
 */
export function zip<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Compactable
 * @since 1.0.0
 */
export function compact<A>(as: ReadonlyArray<Option<A>>): ReadonlyArray<A> {
  return filterMap_(as, identity)
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export function separate<E, A>(fa: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>] {
  const len   = fa.length
  const left  = [] as Array<E>
  const right = [] as Array<A>
  for (let i = 0; i < len; i++) {
    const ea = fa[i]
    E.match_(
      ea,
      (e) => {
        left.push(e)
      },
      (a) => {
        right.push(a)
      }
    )
  }
  return [left, right]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category instances
 * @since 1.0.0
 */
export function getEq<A>(E: P.Eq<A>): P.Eq<ReadonlyArray<A>> {
  const equals_ = (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): boolean =>
    xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals_(x, ys[i])))
  return {
    equals_,
    equals: (ys) => (xs) => equals_(xs, ys)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend_<A, B>(wa: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): ReadonlyArray<B> {
  return imap_(wa, (i, _) => f(wa.slice(i)))
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend<A, B>(f: (as: ReadonlyArray<A>) => B): (wa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (wa) => extend_(wa, f)
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<A>(wa: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilter_<A, B extends A>(fa: ReadonlyArray<A>, f: P.RefinementWithIndex<number, A, B>): ReadonlyArray<B>
export function ifilter_<A>(fa: ReadonlyArray<A>, f: P.PredicateWithIndex<number, A>): ReadonlyArray<A>
export function ifilter_<A>(fa: ReadonlyArray<A>, f: P.PredicateWithIndex<number, A>): ReadonlyArray<A> {
  const result: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = fa[i]
    if (f(i, a)) {
      result.push(a)
    }
  }
  return result
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilter<A, B extends A>(
  f: P.RefinementWithIndex<number, A, B>
): (fa: ReadonlyArray<A>) => ReadonlyArray<B>
export function ifilter<A>(f: P.PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>
export function ifilter<A>(f: P.PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => ifilter_(fa, f)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: ReadonlyArray<A>, f: P.Refinement<A, B>): ReadonlyArray<B>
export function filter_<A>(fa: ReadonlyArray<A>, f: P.Predicate<A>): ReadonlyArray<A>
export function filter_<A>(fa: ReadonlyArray<A>, f: P.Predicate<A>): ReadonlyArray<A> {
  return ifilter_(fa, (_, a) => f(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filter<A, B extends A>(f: P.Refinement<A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>
export function filter<A>(f: P.Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>
export function filter<A>(f: P.Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => ifilter_(fa, (_, a) => f(a))
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilterMap_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => Option<B>): ReadonlyArray<B> {
  const result = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (O.isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilterMap<A, B>(f: (i: number, a: A) => Option<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filterMap_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ifilterMap_(fa, (_, a) => f(a))
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ipartition_<A, B extends A>(
  ta: ReadonlyArray<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function ipartition_<A>(
  ta: ReadonlyArray<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function ipartition_<A>(
  ta: ReadonlyArray<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  const left: Array<A>  = []
  const right: Array<A> = []
  for (let i = 0; i < ta.length; i++) {
    const a = ta[i]
    if (predicate(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return [left, right]
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (ta) => ipartition_(ta, predicate)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function partition_<A, B extends A>(
  ta: ReadonlyArray<A>,
  refinement: P.Refinement<A, B>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function partition_<A>(
  ta: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function partition_<A>(
  ta: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return ipartition_(ta, (_, a) => predicate(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function partition<A>(
  predicate: P.Predicate<A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function partition<A>(
  predicate: P.Predicate<A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (ta) => ipartition_(ta, (_, a) => predicate(a))
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ipartitionMap_<A, B, C>(
  ta: ReadonlyArray<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  const left  = [] as Array<B>
  const right = [] as Array<C>
  for (let i = 0; i < ta.length; i++) {
    const ea = f(i, ta[i])
    E.match_(
      ea,
      (b) => {
        left.push(b)
      },
      (c) => {
        right.push(c)
      }
    )
  }
  return [left, right]
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return (ta) => ipartitionMap_(ta, f)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function partitionMap_<A, B, C>(
  ta: ReadonlyArray<A>,
  f: (a: A) => Either<B, C>
): readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return ipartitionMap_(ta, (_, a) => f(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return (ta) => ipartitionMap_(ta, (_, a) => f(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldl_: <A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, i: number, a: A) => B) => B = _.ifoldl_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl_<A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldr_: <A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, i: number, b: B) => B) => B = _.ifoldr_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldr<A, B>(b: B, f: (a: A, i: number, b: B) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr_<A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => ifoldl_(fa, M.nat, (b, i, a) => M.combine_(b, f(i, a)))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M {
  const ifoldMapM_ = ifoldMap_(M)
  return (fa, f) => ifoldMapM_(fa, (_, a) => f(a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function fold_<M>(fa: ReadonlyArray<M>, M: P.Monoid<M>): M {
  return ifoldl_(fa, M.nat, (b, _, a) => M.combine_(b, a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function fold<M>(M: P.Monoid<M>): (fa: ReadonlyArray<M>) => M {
  return (fa) => ifoldl_(fa, M.nat, (b, _, a) => M.combine_(b, a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => B): ReadonlyArray<B> {
  const len    = fa.length
  const mut_bs = Array(len)
  for (let i = 0; i < len; i++) {
    mut_bs[i] = f(i, fa[i])
  }
  return mut_bs
}

/**
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap<A, B>(f: (i: number, a: A) => B): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => imap_(fa, f)
}

/**
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function ichain_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => ReadonlyArray<B>): ReadonlyArray<B> {
  let outLen     = 0
  const len      = fa.length
  const mut_temp = Array(len)
  for (let i = 0; i < len; i++) {
    const e     = fa[i]
    const arr   = f(i, e)
    outLen     += arr.length
    mut_temp[i] = arr
  }
  const mut_out = Array(outLen)
  let start     = 0
  for (let i = 0; i < len; i++) {
    const arr = mut_temp[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_out[j + start] = arr[j]
    }
    start += l
  }
  return mut_out
}

export function ichain<A, B>(f: (i: number, a: A) => ReadonlyArray<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ichain_(fa, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> {
  return ichain_(fa, (_, a) => f(a))
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain<A, B>(f: (a: A) => ReadonlyArray<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => chain_(fa, f)
}

/**
 * Removes one level of nesting from a nested `Array`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> {
  let rLen  = 0
  const len = mma.length
  for (let i = 0; i < len; i++) {
    rLen += mma[i].length
  }
  const mut_r = Array(rLen)
  let start   = 0
  for (let i = 0; i < len; i++) {
    const arr = mma[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_r[j + start] = arr[j]
    }
    start += l
  }
  return mut_r
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category instances
 * @since 1.0.0
 */
export function getMonoid<A = never>(): P.Monoid<ReadonlyArray<A>> {
  return P.Monoid(concat_, empty())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Ord
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Derives an `Ord` over the `Array` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @category instances
 * @since 1.0.0
 */
export function getOrd<A>(O: P.Ord<A>): P.Ord<ReadonlyArray<A>> {
  return P.Ord({
    compare_: (a, b) => {
      const aLen = a.length
      const bLen = b.length
      const len  = Math.min(aLen, bLen)
      for (let i = 0; i < len; i++) {
        const ordering = O.compare_(a[i], b[i])
        if (ordering === EQ) {
          return ordering
        }
      }
      return N.Ord.compare_(aLen, bLen)
    },
    equals_: getEq(O).equals_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Align
 * @since 1.0.0
 */
export function alignWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (_: These<A, B>) => C
): ReadonlyArray<C> {
  const minlen  = Math.min(fa.length, fb.length)
  const maxlen  = Math.max(fa.length, fb.length)
  const mut_ret = Array(maxlen)
  for (let i = 0; i < minlen; i++) {
    mut_ret[i] = f(Th.both(fa[i], fb[i]))
  }
  if (minlen === maxlen) {
    return mut_ret
  } else if (fa.length > fb.length) {
    for (let i = minlen; i < maxlen; i++) {
      mut_ret[i] = f(Th.left(fa[i]))
    }
  } else {
    for (let i = minlen; i < maxlen; i++) {
      mut_ret[i] = f(Th.right(fb[i]))
    }
  }
  return mut_ret
}

/**
 * @category Align
 * @since 1.0.0
 */
export function alignWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (_: These<A, B>) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => alignWith_(fa, fb, f)
}

/**
 * @category Align
 * @since 1.0.0
 */
export function align_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

/**
 * @category Align
 * @since 1.0.0
 */
export function align<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category instances
 * @since 1.0.0
 */
export function getShow<A>(S: P.Show<A>): P.Show<ReadonlyArray<A>> {
  return {
    show: (as) => `[${as.map(S.show).join(', ')}]`
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const imapA_ = P.implementMapWithIndexA_<[HKT.URI<ArrayURI>]>()((_) => (G) => {
  return (ta, f) => ifoldl_(ta, G.pure(empty<typeof _.B>()), (fbs, i, a) => G.crossWith_(fbs, f(i, a), append_))
})

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const imapA: P.MapWithIndexAFn<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = imapA_(G)
  return (f) => (ta) => itraverseG_(ta, f)
}

export const imapAccumM_: P.MapAccumWithIndexMFn_<[HKT.URI<ArrayURI>]> = (M) => (ta, s, f) =>
  ifoldl_(ta, M.pure([[] as any[], s]), (b, i, a) =>
    M.chain_(b, ([bs, s]) => M.map_(f(s, i, a), ([b, s]) => [append_(bs, b), s]))
  )

export const imapAccumM: P.MapAccumWithIndexMFn<[HKT.URI<ArrayURI>]> = (M) => {
  const imapAccum_ = imapAccumM_(M)
  return (s, f) => (ta) => imapAccum_(ta, s, f)
}

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA_: P.MapAFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = imapA_(G)
  return (ta, f) => itraverseG_(ta, (_, a) => f(a))
}

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA: P.MapAFn<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = imapA_(G)
  return (f) => (ta) => itraverseG_(ta, (_, a) => f(a))
}

export const mapAccumM_: P.MapAccumMFn_<[HKT.URI<ArrayURI>]> = (M) => {
  const imapAccum_ = imapAccumM_(M)
  return (ta, s, f) => imapAccum_(ta, s, (s, _, a) => f(s, a))
}

export const mapAccumM: P.MapAccumMFn<[HKT.URI<ArrayURI>]> = (M) => {
  const imapAccum_ = imapAccumM_(M)
  return (s, f) => (ta) => imapAccum_(ta, s, (s, _, a) => f(s, a))
}

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence = P.implementSequence<[HKT.URI<ArrayURI>]>()((_) => (G) => {
  const traverseG = mapA(G)
  return traverseG(identity)
})

/*
 * -------------------------------------------------------------------------------------------------
 * Unfoldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category instances
 * @since 1.0.0
 */
export function unfold<A, B>(b: B, f: (b: B) => Option<readonly [A, B]>): ReadonlyArray<A> {
  const ret = []
  let bb    = b
  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const mt = f(bb)
    if (O.isSome(mt)) {
      const [a, b] = mt.value
      ret.push(a)
      bb = b
    } else {
      break
    }
  }
  return ret
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * The unit `Array`
 *
 * @category Unit
 * @since 1.0.0
 */
export const unit: () => ReadonlyArray<void> = NEA.unit

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const icompactA_: P.FilterMapWithIndexAFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const traverseG = imapA_(G)
  return (wa, f) => pipe(traverseG(wa, f), G.map(compact))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const icompactA: P.FilterMapWithIndexAFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => icompactA_(G)(wa, f)

/**
 * @category Witherable
 * @since 1.0.0
 */
export const compactA_: P.FilterMapAFn_<[HKT.URI<ArrayURI>]> = (G) => (wa, f) => icompactA_(G)(wa, (_, a) => f(a))

/**
 * @category Witherable
 * @since 1.0.0
 */
export const compactA: P.FilterMapAFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => compactA_(G)(wa, f)

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const iseparateA_: P.PartitionMapWithIndexAFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const traverseG = imapA_(G)
  return (wa, f) => pipe(traverseG(wa, f), G.map(separate))
}

/**
 * @category WitherableWithIndex
 * @since 1.0.0
 */
export const iseparateA: P.PartitionMapWithIndexAFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => iseparateA_(G)(wa, f)

/**
 * @category Witherable
 * @since 1.0.0
 */
export const separateA_: P.PartitionMapAFn_<[HKT.URI<ArrayURI>]> = (G) => (wa, f) => iseparateA_(G)(wa, (_, a) => f(a))

/**
 * @category Witherable
 * @since 1.0.0
 */
export const separateA: P.PartitionMapAFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => separateA_(G)(wa, f)

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category combinators
 * @since 1.0.0
 */
export function append_<A>(init: ReadonlyArray<A>, end: A): NonEmptyArray<A> {
  const len   = init.length
  const mut_r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    mut_r[i] = init[i]
  }
  mut_r[len] = end
  return mut_r as unknown as NonEmptyArray<A>
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst append_
 */
export function append<A>(end: A): (init: ReadonlyArray<A>) => NonEmptyArray<A> {
  return (init) => append_(init, end)
}

/**
 * A useful recursion pattern for processing a `ReadonlyArray` to produce a new `ReadonlyArray`,
 * often used for "chopping" up the input `ReadonlyArray`. Typically chop is called with some function
 * that will consume an initial prefix of the `ReadonlyArray` and produce a value and the rest of the `ReadonlyArray`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function chop_<A, B>(
  as: ReadonlyArray<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): ReadonlyArray<B> {
  const result: Array<B>   = []
  let cs: ReadonlyArray<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    result.push(b)
    cs = c
  }
  return result
}

/**
 * A useful recursion pattern for processing a `ReadonlyArray` to produce a new `ReadonlyArray`,
 * often used for "chopping" up the input `ReadonlyArray`. Typically chop is called with some function
 * that will consume an initial prefix of the `ReadonlyArray` and produce a value and the rest of the `ReadonlyArray`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => chop_(as, f)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chunksOf_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<ReadonlyArray<A>> {
  return chop_(as, splitAt(n))
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chunksOf(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  return chop(splitAt(n))
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function collectWhile_<A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> {
  const result: Array<B> = []
  for (let i = 0; i < as.length; i++) {
    const o = f(as[i])
    if (O.isSome(o)) {
      result.push(o.value)
    } else {
      break
    }
  }
  return result
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function collectWhile<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => collectWhile_(as, f)
}

function comprehensionLoop<A, R>(
  scope: ReadonlyArray<A>,
  input: ReadonlyArray<ReadonlyArray<A>>,
  f: (...xs: ReadonlyArray<A>) => R,
  g: (...xs: ReadonlyArray<A>) => boolean
): Ev.Eval<ReadonlyArray<R>> {
  if (input.length === 0) {
    return g(...scope) ? Ev.now([f(...scope)]) : Ev.now(empty())
  } else {
    return pipe(
      input[0],
      map((x) => comprehensionLoop(append_(scope, x), input.slice(1), f, g)),
      sequence(Ev.Applicative),
      Ev.map(flatten)
    )
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function comprehension<A, B, C, D, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>, ReadonlyArray<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, C, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: ReadonlyArray<ReadonlyArray<A>>,
  f: (...xs: ReadonlyArray<A>) => R,
  g: (...xs: ReadonlyArray<A>) => boolean = () => true
): ReadonlyArray<R> {
  return comprehensionLoop([], input, f, g).value
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const concatW_: <A, B>(xs: ReadonlyArray<A>, ys: ReadonlyArray<B>) => ReadonlyArray<A | B> = NEA.concatW_

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst concatW_
 */
export const concatW: <A>(ys: ReadonlyArray<A>) => <B>(xs: ReadonlyArray<B>) => ReadonlyArray<A | B> = NEA.concatW

/**
 * @category combinators
 * @since 1.0.0
 */
export const concat_: <A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> = NEA.concat_

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst concat_
 */
export const concat: <A>(ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> = NEA.concat

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @category combinators
 * @since 1.0.0
 */
export function deleteAt_<A>(as: ReadonlyArray<A>, i: number): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeDeleteAt_(as, i))
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @category combinators
 * @since 1.0.0
 * @dataFirst deleteAt_
 */
export function deleteAt(i: number): <A>(as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => deleteAt_(as, i)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function difference_<A>(E: P.Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) => filter_(xs, (a) => !elemE_(ys, a))
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst difference_
 */
export function difference<A>(E: P.Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const differenceE_ = difference_(E)
  return (ys) => (xs) => differenceE_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function drop_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(n)
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst drop_
 */
export function drop(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => drop_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function dropLast_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, as.length - n)
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst dropLast_
 */
export function dropLast(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropLast_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function dropWhile_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexLeft_(as, predicate)
  const l        = as.length
  const mut_rest = Array(l - i)
  for (let j = i; j < l; j++) {
    mut_rest[j - i] = as[j]
  }
  return mut_rest
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst dropWhile_
 */
export function dropWhile<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropWhile_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function dropLastWhile_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexRight_(as, predicate)
  const mut_rest = Array(i + 1)
  for (let j = 0; j <= i; j++) {
    mut_rest[j] = as[j]
  }
  return mut_rest
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst dropLastWhile_
 */
export function dropLastWhile<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropLastWhile_(as, predicate)
}

/**
 * Test if a value is a member of an array. Takes a `P.Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `ReadonlyArray<A>`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function elem_<A>(E: P.Eq<A>): (as: ReadonlyArray<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals_(element, a)
    let i           = 0
    const len       = as.length
    for (; i < len; i++) {
      if (predicate(as[i])) {
        return true
      }
    }
    return false
  }
}

/**
 * Test if a value is a member of an array. Takes a `P.Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `ReadonlyArray<A>`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function elem<A>(E: P.Eq<A>): (a: A) => (as: ReadonlyArray<A>) => boolean {
  const elemE_ = elem_(E)
  return (a) => (as) => elemE_(as, a)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function findLast_<A, B extends A>(as: ReadonlyArray<A>, refinement: P.Refinement<A, B>): Option<B>
export function findLast_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<A>
export function findLast_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<A> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return O.some(as[i])
    }
  }
  return O.none()
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst findLast_
 */
export function findLast<A, B extends A>(refinement: P.Refinement<A, B>): (as: ReadonlyArray<A>) => Option<B>
export function findLast<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<A>
export function findLast<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => findLast_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function findLastMap_<A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): Option<B> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    const v = f(as[i])
    if (O.isSome(v)) {
      return v
    }
  }
  return O.none()
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst findLastMap_
 */
export function findLastMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => findLastMap_(as, f)
}

/**
 * Find the first index for which a predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function findIndex_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<number> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return O.some(i)
    }
  }
  return O.none()
}

/**
 * Find the first index for which a predicate holds
 *
 * @category combinators
 * @since 1.0.0
 * @dataFirst findFirstIndex_
 */
export function findIndex<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => findIndex_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function find_<A, B extends A>(as: ReadonlyArray<A>, refinement: P.Refinement<A, B>): Option<B>
export function find_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<A>
export function find_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<A> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return O.some(as[i])
    }
  }
  return O.none()
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst findFirst_
 */
export function find<A, B extends A>(refinement: P.Refinement<A, B>): (as: ReadonlyArray<A>) => Option<B>
export function find<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<A>
export function find<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => find_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function findMap_<A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): Option<B> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    const v = f(as[i])
    if (O.isSome(v)) {
      return v
    }
  }
  return O.none()
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst findMap_
 */
export function findMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => findMap_(as, f)
}

/**
 * Find the last index for which a predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function findLastIndex_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): Option<number> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return O.some(i)
    }
  }
  return O.none()
}

/**
 * Find the last index for which a predicate holds
 *
 * @category combinators
 * @since 1.0.0
 * @dataFirst findLastIndex_
 */
export function findLastIndex<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => findLastIndex_(as, predicate)
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function ifoldlWhile_<A, B>(
  as: ReadonlyArray<A>,
  b: B,
  predicate: P.Predicate<B>,
  f: (b: B, i: number, a: A) => B
): B {
  let out  = b
  let cont = predicate(out)
  for (let i = 0; cont && i < as.length; i++) {
    out  = f(out, i, as[i])
    cont = predicate(out)
  }
  return out
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function ifoldlWhile<A, B>(
  b: B,
  predicate: P.Predicate<B>,
  f: (b: B, i: number, a: A) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => ifoldlWhile_(as, b, predicate, f)
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlWhile_<A, B>(as: ReadonlyArray<A>, b: B, predicate: P.Predicate<B>, f: (b: B, a: A) => B): B {
  return ifoldlWhile_(as, b, predicate, (b, _, a) => f(b, a))
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldlWhile<A, B>(b: B, predicate: P.Predicate<B>, f: (b: B, a: A) => B): (as: ReadonlyArray<A>) => B {
  return (as) => foldlWhile_(as, b, predicate, f)
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function ifoldrWhile_<A, B>(
  as: ReadonlyArray<A>,
  b: B,
  predicate: P.Predicate<B>,
  f: (a: A, i: number, b: B) => B
): B {
  let out  = b
  let cont = predicate(out)
  for (let i = as.length - 1; cont && i >= 0; i--) {
    out  = f(as[i], i, out)
    cont = predicate(out)
  }
  return out
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function ifoldrWhile<A, B>(
  b: B,
  predicate: P.Predicate<B>,
  f: (a: A, i: number, b: B) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => ifoldrWhile_(as, b, predicate, f)
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldrWhile_<A, B>(as: ReadonlyArray<A>, b: B, predicate: P.Predicate<B>, f: (a: A, b: B) => B): B {
  return ifoldrWhile_(as, b, predicate, (a, _, b) => f(a, b))
}

/**
 * Perform a left-associative fold on an array while the predicate holds
 *
 * @category combinators
 * @since 1.0.0
 */
export function foldrWhile<A, B>(b: B, predicate: P.Predicate<B>, f: (a: A, b: B) => B): (as: ReadonlyArray<A>) => B {
  return (as) => foldrWhile_(as, b, predicate, f)
}

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @category combinators
 * @since 1.0.0
 */
export function group<A>(E: P.Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
  return chop((as) => {
    const h   = as[0]
    const out = [h] as P.Mutable<NonEmptyArray<A>>
    let i     = 1
    for (; i < as.length; i++) {
      const a = as[i]
      if (E.equals_(a, h)) {
        out.push(a)
      } else {
        break
      }
    }
    return [out, as.slice(i)]
  })
}

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category combinators
 * @since 1.0.0
 */
export function groupBy_<A>(as: ReadonlyArray<A>, f: (a: A) => string): ReadonlyRecord<string, NonEmptyArray<A>> {
  const mut_out: Record<string, P.Mutable<NonEmptyArray<A>>> = {}
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    const k = f(a)
    if (Object.prototype.hasOwnProperty.call(mut_out, k)) {
      mut_out[k].push(a)
    } else {
      mut_out[k] = [a]
    }
  }
  return mut_out
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function groupBy<A>(f: (a: A) => string): (as: ReadonlyArray<A>) => ReadonlyRecord<string, NonEmptyArray<A>> {
  return (as) => groupBy_(as, f)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function insertAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeInsertAt_(as, i, a))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @category combinators
 * @since 1.0.0
 * @dataFirst insertAt_
 */
export function insertAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<NonEmptyArray<A>> {
  return (as) => insertAt_(as, i, a)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function intersection_<A>(E: P.Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) => filter_(xs, (a) => elemE_(ys, a))
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function intersection<A>(E: P.Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const intersectionE_ = intersection_(E)
  return (ys) => (xs) => intersectionE_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function intersperse_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  const len = as.length
  return len === 0 ? as : prepend_(prependAll_(as.slice(1, len), a), as[0])
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst intersperse_
 */
export function intersperse<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => intersperse_(as, a)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function lookup_<A>(as: ReadonlyArray<A>, i: number): Option<A> {
  return isOutOfBound_(as, i) ? O.none() : O.some(as[i])
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst lookup_
 */
export function lookup(i: number): <A>(as: ReadonlyArray<A>) => Option<A> {
  return (as) => lookup_(as, i)
}

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Right` elements are extracted in order
 *
 * @category combinators
 * @since 1.0.0
 */
export function lefts<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> {
  const ls: Array<E> = []
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    if (E.isLeft(a)) {
      ls.push(a.left)
    }
  }
  return ls
}

/**
 * Statefully maps over the array, producing new elements of type B. Analogous to a combination of map + foldl.
 *
 * @category combinators
 * @since 1.0.0
 */
export function mapAccum_<A, S, B>(
  as: ReadonlyArray<A>,
  s: S,
  f: (s: S, a: A) => readonly [B, S]
): readonly [ReadonlyArray<B>, S] {
  const mut_bs = new Array(as.length)
  let state    = s
  for (let i = 0; i < as.length; i++) {
    const result = f(s, as[i])
    mut_bs[i]    = result[0]
    state        = result[1]
  }
  return [mut_bs, state]
}

/**
 * Statefully maps over the array, producing new elements of type B. Analogous to a combination of map + foldl.
 *
 * @category combinators
 * @since 1.0.0
 */
export function mapAccum<A, S, B>(
  s: S,
  f: (s: S, a: A) => readonly [B, S]
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, S] {
  return (as) => mapAccum_(as, s, f)
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt_<A>(as: ReadonlyArray<A>, i: number, f: (a: A) => A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeUpdateAt_(as, i, f(as[i])))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt<A>(i: number, f: (a: A) => A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => modifyAt_(as, i, f)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const prependW_: <A, B>(tail: ReadonlyArray<A>, head: B) => NonEmptyArray<A | B> = NEA.prependW_

/**
 * @category combinators
 * @since 1.0.0
 */
export const prependW: <B>(head: B) => <A>(tail: ReadonlyArray<A>) => NonEmptyArray<A | B> = NEA.prependW

/**
 * @category combinators
 * @since 1.0.0
 */
export const prepend_: <A>(tail: ReadonlyArray<A>, head: A) => NonEmptyArray<A> = NEA.prepend_

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst prepend_
 */
export const prepend: <A>(head: A) => (tail: ReadonlyArray<A>) => NonEmptyArray<A> = NEA.prepend

/**
 * @category combinators
 * @since 1.0.0
 */
export function prependAll_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  const mut_out: Array<A> = []
  for (let i = 0; i < as.length; i++) {
    mut_out.push(a, as[i])
  }
  return mut_out
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst prependAll_
 */
export function prependAll<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => prependAll_(as, a)
}

/**
 * Reverse an array, creating a new array
 *
 * @category combinators
 * @since 1.0.0
 */
export function reverse<A>(as: ReadonlyArray<A>): ReadonlyArray<A> {
  if (isEmpty(as)) {
    return empty()
  } else if (as.length === 1) {
    return [as[0]]
  } else {
    let mut_out = Array(as.length)
    for (let j = 0, i = as.length - 1; i >= 0; i--, j++) {
      mut_out[j] = as[i]
    }
    return mut_out
  }
}

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @category combinators
 * @since 1.0.0
 */
export function rights<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> {
  const rs: Array<A> = []
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    if (E.isRight(a)) {
      rs.push(a.right)
    }
  }
  return rs
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function rotate_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  const len = as.length
  if (n === 0 || len <= 1 || len === Math.abs(n)) {
    return as
  } else if (n < 0) {
    return rotate_(as, len + n)
  } else {
    return concat_(as.slice(-n), as.slice(0, len - n))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function rotate(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => rotate_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function scanl_<A, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B> {
  const l     = as.length
  const mut_r = new Array(l + 1) as P.Mutable<NonEmptyArray<B>>
  mut_r[0]    = b
  for (let i = 0; i < l; i++) {
    mut_r[i + 1] = f(mut_r[i], as[i])
  }
  return mut_r
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst scanl_
 */
export function scanl<A, B>(b: B, f: (b: B, a: A) => B): (as: ReadonlyArray<A>) => NonEmptyArray<B> {
  return (as) => scanl_(as, b, f)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function scanr_<A, B>(as: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): NonEmptyArray<B> {
  const l     = as.length
  const mut_r = new Array(l + 1) as P.Mutable<NonEmptyArray<B>>
  mut_r[l]    = b
  for (let i = l - 1; i >= 0; i--) {
    mut_r[i] = f(as[i], mut_r[i + 1])
  }
  return mut_r
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst scanl_
 */
export function scanr<A, B>(b: B, f: (a: A, b: B) => B): (as: ReadonlyArray<A>) => NonEmptyArray<B> {
  return (as) => scanr_(as, b, f)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function slice_<A>(as: ReadonlyArray<A>, start?: number, end?: number): ReadonlyArray<A> {
  return as.slice(start, end)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function slice(start?: number, end?: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(start, end)
}

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @category combinators
 * @since 1.0.0
 */
export function sort<B>(O: P.Ord<B>): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => (isEmpty(as) ? empty() : as.length === 1 ? as : mutableClone(as).sort((a, b) => O.compare(a)(b)))
}

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`, then `ords[1]`,
 * etc...
 *
 * @category combinators
 * @since 1.0.0
 */
export function sortBy<B>(ords: ReadonlyArray<P.Ord<B>>): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const M = Ord.getMonoid<B>()
    return sort(foldl_(ords, M.nat, (b, a) => M.combine_(a, b)))(as)
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function spanl_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: P.Refinement<A, B>
): readonly [ReadonlyArray<B>, ReadonlyArray<A>]
export function spanl_<A>(
  as: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function spanl_<A>(
  as: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  const i        = spanIndexLeft_(as, predicate)
  const mut_init = Array(i)
  for (let j = 0; j < i; j++) {
    mut_init[j] = as[j]
  }
  const l        = as.length
  const mut_rest = Array(l - i)
  for (let j = i; j < l; j++) {
    mut_rest[j - i] = as[j]
  }
  return [mut_init, mut_rest]
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function spanl<A, B extends A>(
  refinement: P.Refinement<A, B>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<A>]
export function spanl<A>(
  predicate: P.Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function spanl<A>(
  predicate: P.Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => spanl_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function spanr_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: P.Refinement<A, B>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function spanr_<A>(
  as: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function spanr_<A>(
  as: ReadonlyArray<A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  const i        = spanIndexRight_(as, predicate)
  const l        = as.length
  const mut_tail = Array(l - i - 1)
  for (let j = l - 1; j > i; j--) {
    mut_tail[j - i - 1] = as[j]
  }
  const mut_rest = Array(i)
  for (let j = i; j >= 0; j--) {
    mut_rest[j] = as[j]
  }
  return [mut_rest, mut_tail]
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function spanr<A, B extends A>(
  refinement: P.Refinement<A, B>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function spanr<A>(
  predicate: P.Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function spanr<A>(
  predicate: P.Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => spanr_(as, predicate)
}

/**
 * Splits an array on the specified index
 *
 * @category combinators
 * @since 1.0.0
 */
export function splitAt_<A>(as: ReadonlyArray<A>, n: number): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return [as.slice(0, n), as.slice(n)]
}

/**
 * Splits an array on the specified index
 *
 * @category combinators
 * @since 1.0.0
 */
export function splitAt(n: number): <A>(as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => splitAt_(as, n)
}

/**
 * Splits an array on the first element that matches this predicate.
 *
 * @category combinators
 * @since 1.0.0
 */
export function splitWhere_<A>(as: ReadonlyArray<A>, f: P.Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  let cont = true
  let i    = 0
  while (cont && i < as.length) {
    if (f(as[i])) {
      cont = false
    } else {
      i++
    }
  }
  return splitAt_(as, i)
}

/**
 * Splits an array on the first element that matches this predicate.
 *
 * @category combinators
 * @since 1.0.0
 */
export function splitWhere<A>(
  predicate: P.Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => splitWhere_(as, predicate)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function take_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, n)
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst take_
 */
export function take(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => take_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function takeLast_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return isEmpty(as) ? empty() : as.slice(-n)
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst takeLast_
 */
export function takeLast(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => takeLast_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function takeWhile_<A, B extends A>(as: ReadonlyArray<A>, refinement: P.Refinement<A, B>): ReadonlyArray<B>
export function takeWhile_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): ReadonlyArray<A>
export function takeWhile_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexLeft_(as, predicate)
  const mut_init = Array(i)
  for (let j = 0; j < i; j++) {
    mut_init[j] = as[j]
  }
  return mut_init
}

/**
 * @category combinators
 * @since 1.0.0
 * @dataFirst takeWhile_
 */
export function takeWhile<A, B extends A>(refinement: P.Refinement<A, B>): (as: ReadonlyArray<A>) => ReadonlyArray<B>
export function takeWhile<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A>
export function takeWhile<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => takeWhile_(as, predicate)
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeUpdateAt_(as, i, a))
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @category combinators
 * @since 1.0.0
 * @dataFirst updateAt_
 */
export function updateAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => updateAt_(as, i, a)
}

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @category combinators
 * @since 1.0.0
 */
export function unzip<A, B>(as: ReadonlyArray<readonly [A, B]>): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const mut_fa: Array<A> = []
  const mut_fb: Array<B> = []

  for (let i = 0; i < as.length; i++) {
    mut_fa[i] = as[i][0]
    mut_fb[i] = as[i][1]
  }

  return [mut_fa, mut_fb]
}

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @category combinators
 * @since 1.0.0
 */
export function uniq<A>(E: P.Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    if (as.length === 1) {
      return as
    }
    const elemE_        = elem_(E)
    const out: Array<A> = []
    const len           = as.length
    let i               = 0
    for (; i < len; i++) {
      const a = as[i]
      if (!elemE_(out, a)) {
        out.push(a)
      }
    }
    return out
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function union_<A>(E: P.Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) =>
    concat_(
      xs,
      filter_(ys, (a) => !elemE_(xs, a))
    )
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function union<A>(E: P.Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const unionE_ = union_(E)
  return (ys) => (xs) => unionE_(xs, ys)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const UnknownArrayEq: P.Eq<ReadonlyArray<unknown>> = P.Eq((x, y) => x.length === y.length)

export const UnknownArrayGuard: G.Guard<unknown, ReadonlyArray<unknown>> = G.Guard((u): u is ReadonlyArray<unknown> =>
  Array.isArray(u)
)

export function getGuard<A>(item: G.Guard<unknown, A>): G.Guard<unknown, ReadonlyArray<A>> {
  return pipe(
    UnknownArrayGuard,
    G.refine((u): u is ReadonlyArray<A> => u.every((v) => item.is(v)))
  )
}

export const Align = P.Align<URI>({
  map_,
  alignWith_,
  nil: empty
})

export const Functor = P.Functor<URI>({
  map_
})

export const FunctorWithIndex = P.FunctorWithIndex<URI>({
  imap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<URI>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure,
  unit
})

export const Zip = P.Zip<URI>({
  zip_,
  zipWith_
})

export const Alt = P.Alt<URI>({
  map_,
  alt_
})

export const Alternative = P.Alternative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  alt_,
  nil: empty
})

export const Compactable = HKT.instance<P.Compactable<URI>>({
  compact,
  separate
})

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<URI>({
  imap_,
  ifilter_,
  ifilterMap_,
  ipartition_,
  ipartitionMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_,
  ifoldr_,
  ifoldMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  chain_,
  flatten
})

export const Traversable = P.Traversable<URI>({
  map_,
  mapA_: mapA_,
  foldl_,
  foldr_,
  foldMap_
})

export const TraversableWithIndex = P.TraversableWithIndex<URI>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  imapA_: imapA_
})

export const Unfoldable = HKT.instance<P.Unfoldable<URI>>({
  unfold
})

export const Witherable = P.Witherable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  mapA_: mapA_,
  filterMapA_: compactA_,
  partitionMapA_: separateA_
})

export const WitherableWithIndex = P.WitherableWithIndex<URI>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  ifilter_,
  ifilterMap_,
  ipartition_,
  ipartitionMap_,
  imapA_: imapA_,
  ifilterMapA_: icompactA_,
  ipartitionMapA_: iseparateA_
})

/*
 * -------------------------------------------------------------------------------------------------
 * Do
 * -------------------------------------------------------------------------------------------------
 */

const of: ReadonlyArray<{}> = pure({})
export { of as do }

export const chainS_ = P.chainSF_(Monad)

export const chainS: <A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => ReadonlyArray<A>
) => (mk: ReadonlyArray<K>) => ReadonlyArray<
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> = P.chainSF(Monad)

export const pureS_ = P.pureSF_(Monad)

export const pureS: <K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
) => (mk: ReadonlyArray<K>) => ReadonlyArray<{ [k in N | keyof K]: k extends keyof K ? K[k] : A }> = P.pureSF(Monad)

export const toS_ = P.toSF_(Monad)

export const toS: <K, N extends string>(
  name: Exclude<N, keyof K>
) => <A>(fa: ReadonlyArray<A>) => ReadonlyArray<
  {
    [k in Exclude<N, keyof K>]: A
  }
> = P.toSF(Functor)

/*
 * -------------------------------------------------------------------------------------------------
 * Gen
 * -------------------------------------------------------------------------------------------------
 */

const adapter: {
  <A>(_: () => O.Option<A>): GenLazyHKT<ReadonlyArray<A>, A>
  <A>(_: () => ReadonlyArray<A>): GenLazyHKT<ReadonlyArray<A>, A>
} = (_: () => any) =>
  new GenLazyHKT(() => {
    const x = _()
    if (O.isOption(x)) {
      return new GenLazyHKT(() => O.match_(x, () => [], pure))
    }
    return x
  })

export const gen = genWithHistoryF(Monad, { adapter })

/*
 * -------------------------------------------------------------------------------------------------
 * Unsafe
 * -------------------------------------------------------------------------------------------------
 */

export function unsafeModifyAt_<A>(as: ReadonlyArray<A>, i: number, f: (a: A) => A): ReadonlyArray<A> {
  const next = f(as[i])
  if (as[i] === next) {
    return as
  }
  return mutate_(as, (mut_xs) => {
    mut_xs[i] = next
  })
}

export function unsafeModifyAt<A>(i: number, f: (a: A) => A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => unsafeModifyAt_(as, i, f)
}

export function unsafeInsertAt_<A>(as: ReadonlyArray<A>, i: number, a: A): NonEmptyArray<A> {
  return mutate_(as, (xs) => {
    xs.splice(i, 0, a)
  }) as unknown as NonEmptyArray<A>
}

export function unsafeInsertAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => NonEmptyArray<A> {
  return (as) => unsafeInsertAt_(as, i, a)
}

export function unsafeUpdateAt_<A>(as: ReadonlyArray<A>, i: number, a: A): ReadonlyArray<A> {
  if (as[i] === a) {
    return as
  } else {
    return mutate_(as, (mut_xs) => {
      mut_xs[i] = a
    })
  }
}

export function unsafeUpdateAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => unsafeUpdateAt_(as, i, a)
}

export function unsafeDeleteAt_<A>(as: ReadonlyArray<A>, i: number): ReadonlyArray<A> {
  return mutate_(as, (xs) => {
    xs.splice(i, 1)
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * utils
 * -------------------------------------------------------------------------------------------------
 */

export const clone: <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> = mutableClone

export function ievery_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): as is ReadonlyArray<B>
export function ievery_<A>(as: ReadonlyArray<A>, predicate: P.PredicateWithIndex<number, A>): boolean
export function ievery_<A>(as: ReadonlyArray<A>, predicate: P.PredicateWithIndex<number, A>): boolean {
  let result = true
  let i      = 0
  while (result && i < as.length) {
    result = predicate(i, as[i])
    i++
  }
  return result
}

export function ievery<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (as: ReadonlyArray<A>) => as is ReadonlyArray<B>
export function ievery<A>(predicate: P.PredicateWithIndex<number, A>): (as: ReadonlyArray<A>) => boolean
export function ievery<A>(predicate: P.PredicateWithIndex<number, A>): (as: ReadonlyArray<A>) => boolean {
  return (as) => ievery_(as, predicate)
}

/**
 * Determines whether every element of the array satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function every_<A, B extends A>(as: ReadonlyArray<A>, refinement: P.Refinement<A, B>): as is ReadonlyArray<B>
export function every_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): boolean
export function every_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): boolean {
  return ievery_(as, (_, a) => predicate(a))
}

/**
 * Determines whether every element of the array satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function every<A, B extends A>(refinement: P.Refinement<A, B>): (as: ReadonlyArray<A>) => as is ReadonlyArray<B>
export function every<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => boolean
export function every<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => boolean {
  return (as) => every_(as, predicate)
}

/**
 * Determines whether at least one element of the array satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function exists_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): as is NonEmptyArray<A> {
  let result = false
  let i      = 0
  while (!result && i < as.length) {
    result = predicate(as[i])
    i++
  }
  return result
}

/**
 * Determines whether at least one element of the array satisfies the given predicate
 *
 * @category utils
 * @since 1.0.0
 */
export function exists<A>(predicate: P.Predicate<A>): (as: ReadonlyArray<A>) => as is NonEmptyArray<A> {
  return (as): as is NonEmptyArray<A> => exists_(as, predicate)
}

export function head<A>(as: ReadonlyArray<A>): Option<A> {
  return isEmpty(as) ? O.none() : O.some(as[0])
}

export function init<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  const len = as.length
  return len === 0 ? O.none() : O.some(as.slice(0, len - 1))
}

export function last<A>(as: ReadonlyArray<A>): Option<A> {
  return lookup_(as, as.length - 1)
}

export function mutableClone<A>(as: ReadonlyArray<A>): Array<A> {
  return as.slice(0) as unknown as Array<A>
}

/**
 * Transiently mutate the Array. Copies the input array, then exececutes `f` on it
 */
export function mutate_<A>(as: ReadonlyArray<A>, f: (as: Array<A>) => void): ReadonlyArray<A> {
  const mut_as = mutableClone(as)
  f(mut_as)
  return mut_as
}

/**
 * Transiently mutate the Array. Copies the input array, then exececutes `f` on it
 */
export function mutate<A>(f: (as: Array<A>) => void): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => mutate_(as, f)
}

export function join_(as: ReadonlyArray<string>, s: string): string {
  return as.join(s)
}

export function join(s: string): (as: ReadonlyArray<string>) => string {
  return (as) => as.join(s)
}

export function size<A>(as: ReadonlyArray<A>): number {
  return as.length
}

export function spanIndexLeft_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): number {
  const l = as.length
  let i   = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

export function spanIndexRight_<A>(as: ReadonlyArray<A>, predicate: P.Predicate<A>): number {
  let i = as.length - 1
  for (; i >= 0; i--) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

/**
 * @category utils
 * @since 1.0.0
 */
export function sum(as: ReadonlyArray<number>): number {
  return foldl_(as, 0, (b, a) => b + a)
}

export function tail<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  return isEmpty(as) ? O.none() : O.some(as.slice(1))
}

export function toBuffer(as: ReadonlyArray<Byte>): Uint8Array {
  return Uint8Array.from(unsafeCoerce(as))
}
