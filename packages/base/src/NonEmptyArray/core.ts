import type { Guard } from '../Guard'
import type * as HKT from '../HKT'
import type { These } from '../internal/These'
import type { NonEmptyArrayURI } from '../Modules'
import type { Endomorphism } from '../prelude'
import type { ReadonlyRecord } from '../Record'

import * as Ev from '../Eval/core'
import * as G from '../Guard'
import * as _ from '../internal/Array'
import * as Th from '../internal/These'
import * as O from '../Option'
import * as Ord from '../Ord'
import * as P from '../prelude'
import { isArray } from '../prelude'
import * as S from '../Semigroup'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface NonEmptyArray<A> extends ReadonlyArray<A> {
  0: A
}

export interface MutableNonEmptyArray<A> extends Array<A> {
  0: A
}

/*
 * -------------------------------------------------------------------------------------------------
 * constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const prependW_: <A, B>(tail: ReadonlyArray<A>, head: B) => NonEmptyArray<A | B> = _.prependW_

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function prependW<B>(head: B): <A>(tail: ReadonlyArray<A>) => NonEmptyArray<A | B> {
  return (tail) => prependW_(tail, head)
}

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function prepend_<A>(tail: ReadonlyArray<A>, head: A): NonEmptyArray<A> {
  return prependW_(tail, head)
}
/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function prepend<A>(head: A): (tail: ReadonlyArray<A>) => NonEmptyArray<A> {
  return (tail) => prependW_(tail, head)
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const appendW_: <A, B>(init: ReadonlyArray<A>, last: B) => NonEmptyArray<A | B> = _.appendW_

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function appendW<B>(last: B): <A>(init: ReadonlyArray<A>) => NonEmptyArray<A | B> {
  return (init) => appendW_(init, last)
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function append_<A>(init: ReadonlyArray<A>, last: A): NonEmptyArray<A> {
  return appendW_(init, last)
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function append<B>(last: B): <A>(init: ReadonlyArray<A>) => NonEmptyArray<A | B> {
  return (init) => appendW_(init, last)
}

/**
 * Builds a `NonEmptyArray` from an array returning `none` if `as` is an empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: ReadonlyArray<A>): O.Option<NonEmptyArray<A>> {
  return _.isNonEmpty(as) ? O.some(as) : O.none()
}

/**
 * Return a `NonEmptyArray` of length `n` with element `i` initialized with `f(i)`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const makeBy: <A>(n: number, f: (i: number) => A) => NonEmptyArray<A> = _.makeBy

/**
 * Builds a `NonEmptyArray` from one or more elements
 *
 * @category Constructors
 * @since 1.0.0
 */
export function make<A>(...as: readonly [A, ...ReadonlyArray<A>]): NonEmptyArray<A> {
  return as
}

export function range(start: number, end: number): NonEmptyArray<number> {
  return start <= end ? makeBy(end - start + 1, (i) => start + i) : [start]
}

/**
 * Create a `NonEmptyArray` containing a value repeated the specified number of times.
 *
 * @note `n` is normalized to a natural number.
 *
 * @category constructors
 * @since 1.0.0
 */
export function replicate<A>(n: number, a: A): NonEmptyArray<A> {
  return makeBy(n, () => a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

export function fold<A>(S: P.Semigroup<A>): (as: NonEmptyArray<A>) => A {
  return (as) => _.ifoldl_(as.slice(1), as[0], (b, _, a) => S.combine_(b, a))
}

/**
 * Produces a couple of the first element of the array, and a new array of the remaining elements, if any.
 *
 * @category destructors
 * @since 1.0.0
 */
export function unprepend<A>(as: NonEmptyArray<A>): readonly [A, ReadonlyArray<A>] {
  return [head(as), tail(as)]
}

/**
 * Produces a couple of a copy of the array without its last element, and that last element.
 *
 * @category destructors
 * @since 1.0.0
 */
export function unappend<A>(as: NonEmptyArray<A>): readonly [ReadonlyArray<A>, A] {
  return [init(as), last(as)]
}

/**
 * Break a `NonEmptyArray` into its first element and remaining elements.
 *
 * @category destructors
 * @since 1.0.0
 */
export function matchLeft_<A, B>(as: NonEmptyArray<A>, f: (head: A, tail: ReadonlyArray<A>) => B): B {
  return f(head(as), tail(as))
}

/**
 * Break a `NonEmptyArray` into its first element and remaining elements.
 *
 * @category destructors
 * @since 1.0.0
 */
export function matchLeft<A, B>(f: (head: A, tail: ReadonlyArray<A>) => B): (as: NonEmptyArray<A>) => B {
  return (as) => matchLeft_(as, f)
}

/**
 * Break a `ReadonlyArray` into its initial elements and the last element.
 *
 * @category destructors
 * @since 1.0.0
 */
export function matchRight_<A, B>(as: NonEmptyArray<A>, f: (init: ReadonlyArray<A>, last: A) => B): B {
  return f(init(as), last(as))
}

/**
 * Break a `ReadonlyArray` into its initial elements and the last element.
 *
 * @category destructors
 * @since 1.0.0
 */
export function matchRight<A, B>(f: (init: ReadonlyArray<A>, last: A) => B): (as: NonEmptyArray<A>) => B {
  return (as) => matchRight_(as, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export const isNonEmpty: <A>(as: ReadonlyArray<A>) => as is NonEmptyArray<A> = _.isNonEmpty

export function isOutOfBound_<A>(as: NonEmptyArray<A>, i: number): boolean {
  return i < 0 || i >= as.length
}

export function isOutOfBound(i: number): <A>(as: NonEmptyArray<A>) => boolean {
  return (as) => isOutOfBound_(as, i)
}

/*
 * -------------------------------------------------------------------------------------------------
 * ALign
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (_: These<A, B>) => C
): NonEmptyArray<C> {
  const minlen  = Math.min(fa.length, fb.length)
  const maxlen  = Math.max(fa.length, fb.length)
  const mut_ret = allocWithHead(f(Th.both(head(fa), head(fb))), maxlen)
  for (let i = 1; i < minlen; i++) {
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
  fb: NonEmptyArray<B>,
  f: (_: These<A, B>) => C
): (fa: NonEmptyArray<A>) => NonEmptyArray<C> {
  return (fa) => alignWith_(fa, fb, f)
}

/**
 * @category Align
 * @since 1.0.0
 */
export function align_<A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<These<A, B>> {
  return alignWith_(fa, fb, P.identity)
}

/**
 * @category Align
 * @since 1.0.0
 */
export function align<B>(fb: NonEmptyArray<B>): <A>(fa: NonEmptyArray<A>) => NonEmptyArray<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa: NonEmptyArray<A>, that: () => NonEmptyArray<A>): NonEmptyArray<A> {
  return concat_(fa, that())
}

/**
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<A>(that: () => NonEmptyArray<A>): (fa: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a value into a `NonEmptyArray`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): NonEmptyArray<A> {
  return [a]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function zip_<A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]> {
  return zipWith_(fa, fb, P.tuple)
}

export function zip<B>(fb: NonEmptyArray<B>): <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWith_<A, B, C>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C> {
  const mut_cs = [f(fa[0], fb[0])] as MutableNonEmptyArray<C>
  const len    = Math.min(fa.length, fb.length)
  for (let i = 1; i < len; i++) {
    mut_cs[i] = f(fa[i], fb[i])
  }
  return mut_cs
}

export function zipWith<A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
): (fa: NonEmptyArray<A>) => NonEmptyArray<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function cross_<A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

export function cross<B>(fb: NonEmptyArray<B>): <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
): NonEmptyArray<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
): (fa: NonEmptyArray<A>) => NonEmptyArray<C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>): NonEmptyArray<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<A>(fa: NonEmptyArray<A>): <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Comonad
 * @since 1.0.0
 */
export const extract: <A>(ma: NonEmptyArray<A>) => A = head

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend_<A, B>(wa: NonEmptyArray<A>, f: (wa: NonEmptyArray<A>) => B): NonEmptyArray<B> {
  let next  = tail(wa)
  const out = [f(wa)] as MutableNonEmptyArray<B>
  while (isNonEmpty(next)) {
    out.push(f(next))
    next = tail(next)
  }
  return out
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend<A, B>(f: (wa: NonEmptyArray<A>) => B): (wa: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (wa) => extend_(wa, f)
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<A>(wa: NonEmptyArray<A>): NonEmptyArray<NonEmptyArray<A>> {
  return extend_(wa, P.identity)
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
export const ifoldl_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, i: number, a: A) => B) => B = _.ifoldl_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: NonEmptyArray<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl_<A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: NonEmptyArray<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldr_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, i: number, b: B) => B) => B = _.ifoldr_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldr<A, B>(b: B, f: (a: A, i: number, b: B) => B): (fa: NonEmptyArray<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr_<A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: NonEmptyArray<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S) => S {
  return <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S): S =>
    _.ifoldl_(tail(fa), f(0, fa[0]), (s, i, a) => S.combine_(s, f(i + 1, a)))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap<S>(S: P.Semigroup<S>): <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S {
  return (f) => (fa) => ifoldMap_(S)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (a: A) => S) => S {
  return (fa, f) => ifoldMap_(S)(fa, (_, a) => f(a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<S>(S: P.Semigroup<S>): <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>) => S {
  return (f) => (fa) => foldMap_(S)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function imap_<A, B>(fa: NonEmptyArray<A>, f: (i: number, a: A) => B): NonEmptyArray<B> {
  // perf: const mut_out = [f(0, fa[0])]
  const mut_out = allocWithHead(f(0, fa[0]), fa.length)
  for (let i = 1; i < fa.length; i++) {
    mut_out[i] = f(i, fa[i])
  }
  return mut_out
}

export function imap<A, B>(f: (i: number, a: A) => B): (fa: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (fa) => imap_(fa, f)
}

export function map_<A, B>(fa: NonEmptyArray<A>, f: (a: A) => B): NonEmptyArray<B> {
  return imap_(fa, (_, a) => f(a))
}

export function map<A, B>(f: (a: A) => B): (fa: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: NonEmptyArray<NonEmptyArray<A>>): NonEmptyArray<A> {
  return ichain_(mma, (_, a) => a)
}

export function ichain_<A, B>(ma: NonEmptyArray<A>, f: (i: number, a: A) => NonEmptyArray<B>): NonEmptyArray<B> {
  let outLen = 1
  const len  = ma.length
  // perf: const mut_temp = [f(0, ma[0])]
  const mut_temp = allocWithHead(f(0, ma[0]), len)
  mut_temp[0]    = f(0, ma[0])
  for (let i = 1; i < len; i++) {
    const e     = ma[i]
    const arr   = f(i, e)
    outLen     += arr.length
    mut_temp[i] = arr
  }
  // perf: const mut_out = clone(mut_temp[0])
  const mut_out = Array(outLen) as MutableNonEmptyArray<B>
  const out0    = mut_temp[0]
  const len0    = mut_temp[0].length
  for (let j = 0; j < len0; j++) {
    mut_out[j] = out0[j]
  }
  let start = mut_temp[0].length
  for (let i = 1; i < len; i++) {
    const arr = mut_temp[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_out[j + start] = arr[j]
    }
    start += l
  }
  return mut_out
}

export function ichain<A, B>(f: (i: number, a: A) => NonEmptyArray<B>): (ma: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (ma) => ichain_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<A, B>(ma: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>): NonEmptyArray<B> {
  return ichain_(ma, (_, a) => f(a))
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain<A, B>(f: (a: A) => NonEmptyArray<B>): (ma: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (ma) => chain_(ma, f)
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
export const imapA_: P.MapWithIndexAFn_<[HKT.URI<NonEmptyArrayURI>]> = (AG) => (ta, f) =>
  _.ifoldl_(tail(ta), AG.map_(f(0, ta[0]), pure), (fbs, i, a) => AG.crossWith_(fbs, f(i + 1, a), appendW_))

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const imapA: P.MapWithIndexAFn<[HKT.URI<NonEmptyArrayURI>]> = (AG) => {
  const imapAG_ = imapA_(AG)
  return (f) => (ta) => imapAG_(ta, f)
}

export const imapAccumM_: P.MapAccumWithIndexMFn_<[HKT.URI<NonEmptyArrayURI>]> = (M) => (ta, s, f) =>
  _.ifoldl_(
    tail(ta),
    M.map_(f(s, 0, head(ta)), ([b, s]) => [pure(b), s]),
    (b, i, a) => M.chain_(b, ([bs, s]) => M.map_(f(s, i, a), ([b, s]) => [append_(bs, b), s]))
  )

export const imapAccumM: P.MapAccumWithIndexMFn<[HKT.URI<NonEmptyArrayURI>]> = (M) => {
  const imapAccumMG_ = imapAccumM_(M)
  return (s, f) => (ta) => imapAccumMG_(ta, s, f)
}

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA_: P.MapAFn_<[HKT.URI<NonEmptyArrayURI>]> = (AG) => {
  const imapAG_ = imapA_(AG)
  return (ta, f) => imapAG_(ta, (_, a) => f(a))
}

/**
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const mapA: P.MapAFn<[HKT.URI<NonEmptyArrayURI>]> = (AG) => {
  const itraverseG_ = imapA_(AG)
  return (f) => (ta) => itraverseG_(ta, (_, a) => f(a))
}

export const mapAccumM_: P.MapAccumMFn_<[HKT.URI<NonEmptyArrayURI>]> = (M) => {
  const imapAccumMG_ = imapAccumM_(M)
  return (ta, s, f) => imapAccumMG_(ta, s, (s, _, a) => f(s, a))
}

export const mapAccumM: P.MapAccumMFn<[HKT.URI<NonEmptyArrayURI>]> = (M) => {
  const imapAccumMG_ = imapAccumM_(M)
  return (s, f) => (ta) => imapAccumMG_(ta, s, (s, _, a) => f(s, a))
}

/**
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[HKT.URI<NonEmptyArrayURI>]> = (AG) => mapA(AG)(P.identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Unit
 * @since 1.0.0
 */
export function unit(): NonEmptyArray<void> {
  return [undefined]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Test if a value is a member of an array. Takes a `P.Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `NonEmptyArray<A>`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function elem_<A>(E: P.Eq<A>): (as: NonEmptyArray<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals(element)(a)
    const len       = as.length
    for (let i = 0; i < len; i++) {
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
 * an array of type `NonEmptyArray<A>`.
 *
 * @category combinators
 * @since 1.0.0
 */
export function elem<A>(E: P.Eq<A>): (a: A) => (as: NonEmptyArray<A>) => boolean {
  const elemE_ = elem_(E)
  return (a) => (as) => elemE_(as, a)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function uniq<A>(E: P.Eq<A>): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => {
    if (as.length === 1) {
      return as
    }
    const elemE_ = elem_(E)
    const out    = [as[0]] as MutableNonEmptyArray<A>
    const len    = as.length
    for (let i = 1; i < len; i++) {
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
export function reverse<A>(as: NonEmptyArray<A>): NonEmptyArray<A> {
  if (as.length === 1) {
    return as
  }
  // perf: let out = [as[as.length - 1]]
  let mut_out = allocWithHead(as[as.length - 1], as.length)
  for (let j = 1, i = as.length - 2; i >= 0; i--, j++) {
    mut_out[j] = as[i]
  }
  return mut_out
}

function comprehensionLoop<A, R>(
  scope: ReadonlyArray<A>,
  input: ReadonlyArray<NonEmptyArray<A>>,
  f: (...xs: ReadonlyArray<A>) => R
): Ev.Eval<NonEmptyArray<R>> {
  if (input.length === 0) {
    return Ev.now([f(...scope)])
  } else {
    return P.pipe(
      input[0],
      map((x) => comprehensionLoop(append_(scope, x), input.slice(1), f)),
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
  input: readonly [NonEmptyArray<A>, NonEmptyArray<B>, NonEmptyArray<C>, NonEmptyArray<D>],
  f: (a: A, b: B, c: C, d: D) => R
): NonEmptyArray<R>
export function comprehension<A, B, C, R>(
  input: readonly [NonEmptyArray<A>, NonEmptyArray<B>, NonEmptyArray<C>],
  f: (a: A, b: B, c: C) => R
): NonEmptyArray<R>
export function comprehension<A, B, R>(
  input: readonly [NonEmptyArray<A>, NonEmptyArray<B>],
  f: (a: A, b: B) => R
): NonEmptyArray<R>
export function comprehension<A, R>(input: readonly [NonEmptyArray<A>], f: (a: A) => R): NonEmptyArray<R>
export function comprehension<A, R>(
  input: NonEmptyArray<NonEmptyArray<A>>,
  f: (...xs: ReadonlyArray<A>) => R
): NonEmptyArray<R> {
  return comprehensionLoop([], input, f).value
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function concatW_<A, B>(xs: ReadonlyArray<A>, ys: NonEmptyArray<B>): NonEmptyArray<A | B>
export function concatW_<A, B>(xs: NonEmptyArray<A>, ys: ReadonlyArray<B>): NonEmptyArray<A | B>
export function concatW_<A, B>(xs: ReadonlyArray<A>, ys: ReadonlyArray<B>): ReadonlyArray<A | B>
export function concatW_<A, B>(xs: ReadonlyArray<A>, ys: ReadonlyArray<B>): ReadonlyArray<A | B> {
  const lenx = xs.length
  if (lenx === 0) {
    return ys
  }
  const leny = ys.length
  if (leny === 0) {
    return xs
  }
  const mut_r = Array(lenx + leny)
  for (let i = 0; i < lenx; i++) {
    mut_r[i] = xs[i]
  }
  for (let i = 0; i < leny; i++) {
    mut_r[i + lenx] = ys[i]
  }
  return mut_r
}

export function concatW<B>(ys: NonEmptyArray<B>): <A>(xs: ReadonlyArray<A>) => NonEmptyArray<A | B>
export function concatW<B>(ys: ReadonlyArray<B>): {
  <A>(xs: NonEmptyArray<A>): NonEmptyArray<A | B>
  <A>(xs: ReadonlyArray<A>): ReadonlyArray<A | B>
}
export function concatW<B>(ys: ReadonlyArray<B>): <A>(xs: ReadonlyArray<A>) => ReadonlyArray<A | B> {
  return (xs) => concatW_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function concat_<A>(xs: ReadonlyArray<A>, ys: NonEmptyArray<A>): NonEmptyArray<A>
export function concat_<A>(xs: NonEmptyArray<A>, ys: ReadonlyArray<A>): NonEmptyArray<A>
export function concat_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A>
export function concat_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
  return concatW_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function concat<A>(ys: NonEmptyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>
export function concat<A>(ys: ReadonlyArray<A>): {
  (xs: NonEmptyArray<A>): NonEmptyArray<A>
  (xs: ReadonlyArray<A>): ReadonlyArray<A>
}
export function concat<A>(ys: ReadonlyArray<A>): (xs: NonEmptyArray<A>) => ReadonlyArray<A> {
  return (xs) => concat_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chunksOf_<A>(as: NonEmptyArray<A>, n: number): NonEmptyArray<NonEmptyArray<A>> {
  return chop_(as, splitAt(n))
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chunksOf(n: number): <A>(as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> {
  return (as) => chunksOf_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chop_<A, B>(
  as: NonEmptyArray<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): NonEmptyArray<B> {
  const [b, rest] = f(as)
  const result    = [b] as MutableNonEmptyArray<B>
  let next        = rest
  while (isNonEmpty(next)) {
    const [b, c] = f(next)
    result.push(b)
    next = c
  }
  return result
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (as) => chop_(as, f)
}

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @category combinators
 * @since 1.0.0
 */
export function group<A>(E: P.Eq<A>): (as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> {
  return chop((as) => {
    const h   = as[0]
    const out = [h] as MutableNonEmptyArray<A>
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
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @category combinators
 * @since 1.0.0
 */
export function groupSort<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> {
  const sortO  = sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
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
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
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
export function insertAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeInsertAt_(as, i, a))
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function insertAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => insertAt_(as, i, a)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function intersperse_<A>(as: NonEmptyArray<A>, a: A): NonEmptyArray<A> {
  const rest = tail(as)
  return isNonEmpty(rest) ? P.pipe(rest, prependAll(a), prepend(head(as))) : as
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function intersperce<A>(a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => intersperse_(as, a)
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt_<A>(as: NonEmptyArray<A>, i: number, f: (a: A) => A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeModifyAt_(as, i, f))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt<A>(i: number, f: (a: A) => A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => modifyAt_(as, i, f)
}

export function modifyHead_<A>(as: NonEmptyArray<A>, f: Endomorphism<A>): NonEmptyArray<A> {
  return _.prependW_(tail(as), f(head(as)))
}

export function modifyHead<A>(f: Endomorphism<A>): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => modifyHead_(as, f)
}

export function modifyLast_<A>(as: NonEmptyArray<A>, f: Endomorphism<A>): NonEmptyArray<A> {
  return _.appendW_(init(as), f(last(as)))
}

export function modifyLast<A>(f: Endomorphism<A>): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => modifyLast_(as, f)
}

export function prependAll_<A>(as: NonEmptyArray<A>, a: A): NonEmptyArray<A> {
  const out: MutableNonEmptyArray<A> = [a, head(as)]
  for (let i = 0; i < as.length; i++) {
    out.push(a, as[i])
  }
  return out
}

export function prependAll<A>(a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => prependAll_(as, a)
}

/**
 * Rotate a `ReadonlyNonEmptyArray` by `n` steps.
 *
 * @category combinators
 * @since 1.0.0
 */
export function rotate_<A>(as: NonEmptyArray<A>, n: number): NonEmptyArray<A> {
  const len = as.length
  const m   = Math.round(n) % len
  if (isOutOfBound_(as, Math.abs(m)) || m === 0) {
    return as
  }
  if (m < 0) {
    const [f, s] = splitAt_(as, -m)
    return concat_(s, f)
  } else {
    return rotate_(as, m - len)
  }
}

/**
 * Rotate a `ReadonlyNonEmptyArray` by `n` steps.
 *
 * @category combinators
 * @since 1.0.0
 */
export function rotate(n: number): <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => rotate_(as, n)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function sort<B>(O: P.Ord<B>): <A extends B>(as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => (as.length === 1 ? as : (mutableClone(as).sort((first, second) => O.compare_(first, second)) as any))
}

/**
 * Sort the elements of a `ReadonlyNonEmptyArray` in increasing order, where elements are compared using first `ords[0]`, then `ords[1]`,
 * etc...
 *
 * @category combinators
 * @since 1.0.0
 */
export function sortBy<B>(...ords: ReadonlyArray<P.Ord<B>>): <A extends B>(as: NonEmptyArray<A>) => NonEmptyArray<A> {
  if (isNonEmpty(ords)) {
    const M = Ord.getMonoid<B>()
    return sort(_.ifoldl_(ords, M.nat, (b, _, a) => M.combine_(b, a)))
  } else {
    return P.identity
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function splitAt_<A>(as: NonEmptyArray<A>, n: number): readonly [NonEmptyArray<A>, ReadonlyArray<A>] {
  const m = Math.max(1, n)
  return m >= as.length ? [as, []] : [as.slice(0, m) as unknown as NonEmptyArray<A>, as.slice(m)]
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function splitAt(n: number): <A>(as: NonEmptyArray<A>) => readonly [NonEmptyArray<A>, ReadonlyArray<A>] {
  return (as) => splitAt_(as, n)
}

export function updateAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.none() : O.some(unsafeUpdateAt_(as, i, a))
}

export function updateAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => updateAt_(as, i, a)
}

export function updateHead_<A>(as: NonEmptyArray<A>, a: A): NonEmptyArray<A> {
  return modifyHead_(as, () => a)
}

export function updateHead<A>(a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => updateHead_(as, a)
}

export function updateLast_<A>(as: NonEmptyArray<A>, a: A): NonEmptyArray<A> {
  return modifyLast_(as, () => a)
}

export function updateLast<A>(a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => updateLast_(as, a)
}

export function union_<A>(E: P.Eq<A>): (xs: NonEmptyArray<A>, ys: NonEmptyArray<A>) => NonEmptyArray<A> {
  const uniqE = uniq(E)
  return (xs, ys) => uniqE(concat_(xs, ys))
}

/**
 * @since 1.0.0
 */
export function unzip<A, B>(as: NonEmptyArray<readonly [A, B]>): readonly [NonEmptyArray<A>, NonEmptyArray<B>] {
  const mut_fa: MutableNonEmptyArray<A> = [as[0][0]]
  const mut_fb: MutableNonEmptyArray<B> = [as[0][1]]

  for (let i = 1; i < as.length; i++) {
    mut_fa[i] = as[i][0]
    mut_fb[i] = as[i][1]
  }

  return [mut_fa, mut_fb]
}

/*
 * -------------------------------------------------------------------------------------------------
 * Unsafe
 * -------------------------------------------------------------------------------------------------
 */

export function unsafeModifyAt_<A>(as: NonEmptyArray<A>, i: number, f: (a: A) => A): NonEmptyArray<A> {
  const next = f(as[i])
  if (as[i] === next) {
    return as
  }
  return mutate_(as, (mut_xs) => {
    mut_xs[i] = next
  }) as unknown as NonEmptyArray<A>
}

export function unsafeModifyAt<A>(i: number, f: (a: A) => A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => unsafeModifyAt_(as, i, f)
}

export function unsafeUpdateAt_<A>(as: NonEmptyArray<A>, i: number, a: A): NonEmptyArray<A> {
  if (as[i] === a) {
    return as
  }
  return mutate_(as, (mut_xs) => {
    mut_xs[i] = a
  }) as unknown as NonEmptyArray<A>
}

export function unsafeUpdateAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => unsafeUpdateAt_(as, i, a)
}

export function unsafeInsertAt_<A>(as: NonEmptyArray<A>, i: number, a: A): NonEmptyArray<A> {
  return mutate_(as, (xs) => {
    xs.splice(i, 0, a)
  }) as unknown as NonEmptyArray<A>
}

export function unsafeInsertAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => unsafeInsertAt_(as, i, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Clones a `NonEmptyArray` returning the clone typed as mutable
 *
 * @since 1.0.0
 */
export function mutableClone<A>(as: NonEmptyArray<A>): MutableNonEmptyArray<A> {
  return as.slice(0) as unknown as MutableNonEmptyArray<A>
}

/**
 * Clones a `NonEmptyArray` returning the clone typed as immutable
 *
 * @since 1.0.0
 */
export const clone: <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> = mutableClone

/**
 * Get the first element of a `NonEmptyArray`
 *
 * @since 1.0.0
 */
export function head<A>(as: NonEmptyArray<A>): A {
  return as[0]
}

/**
 * @since 1.0.0
 */
export function tail<A>(as: NonEmptyArray<A>): ReadonlyArray<A> {
  const mut_out = Array(as.length - 1)
  for (let i = 0; i < as.length - 1; i++) {
    mut_out[i] = as[i + 1]
  }
  return mut_out
}

/**
 * Get the last elements of a non empty array
 *
 * @since 1.0.0
 */
export function last<A>(as: NonEmptyArray<A>): A {
  return as[as.length - 1]
}

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @since 1.0.0
 */
export function init<A>(as: NonEmptyArray<A>): ReadonlyArray<A> {
  const mut_out = Array(as.length - 1)
  for (let i = 0; i < as.length - 1; i++) {
    mut_out[i] = as[i]
  }
  return mut_out
}

/**
 * Transiently mutate the `NonEmptyArray`. Copies the input array, then exececutes `f` on it
 *
 * @since 1.0.0
 */
export function mutate_<A>(as: NonEmptyArray<A>, f: (as: P.Mutable<NonEmptyArray<A>>) => void): ReadonlyArray<A> {
  const mut_as = mutableClone(as)
  f(mut_as)
  return mut_as
}

/**
 * Transiently mutate the `NonEmptyArray`. Copies the input array, then exececutes `f` on it
 *
 * @since 1.0.0
 */
export function mutate<A>(f: (as: P.Mutable<NonEmptyArray<A>>) => void): (as: NonEmptyArray<A>) => ReadonlyArray<A> {
  return (as) => mutate_(as, f)
}

/**
 * @since 1.0.0
 */
export function min<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const Sa = S.min(O)
  return (as) => {
    const [head, tail] = unprepend(as)
    return isNonEmpty(tail) ? foldl_(tail, head, Sa.combine_) : head
  }
}

/**
 * @since 1.0.0
 */
export function max<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const Sa = S.max(O)
  return (as) => {
    const [head, tail] = unprepend(as)
    return isNonEmpty(tail) ? foldl_(tail, head, Sa.combine_) : head
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

type URI = [HKT.URI<NonEmptyArrayURI>]

export const GuardUnknownNonEmptyArray: Guard<unknown, NonEmptyArray<unknown>> = G.Guard(
  (u: unknown): u is NonEmptyArray<unknown> => isArray(u) && u.length > 0
)

export const Semialign = P.Semialign<URI>({
  map_,
  alignWith_,
  align_
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

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_,
  ifoldr_,
  ifoldMap_
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
  foldl_,
  foldr_,
  foldMap_,
  mapA_: mapA_
})

export const TraversableWithIndex = P.TraversableWithIndex<URI>({
  imap_,
  ifoldl_,
  ifoldr_,
  ifoldMap_,
  imapA_: imapA_
})

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @internal
 */
function allocWithHead<A>(head: A, length: number): MutableNonEmptyArray<A> {
  const mut_as = Array(length) as MutableNonEmptyArray<A>
  mut_as[0]    = head
  return mut_as
}
