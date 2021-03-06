/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-var */

/**
 * `Vector` is an implementation of a Relaxed Radix-Balanced Tree, a fast immutable data structure.
 *
 * It is forked from [List](https://github.com/funkia/list)
 */

import type { Either } from '../../../Either'
import type { Ordering } from '../../../Ordering'
import type { Predicate } from '../../../Predicate'
import type { Refinement } from '../../../Refinement'
import type { These } from '../../../These'

import { identity, unsafeCoerce } from '../../../function'
import * as HKT from '../../../HKT'
import { tuple } from '../../../internal/tuple'
import * as M from '../../../Maybe'
import * as P from '../../../prelude'
import * as Equ from '../../../Structural/Equatable'
import * as Ha from '../../../Structural/Hashable'
import * as Th from '../../../These'

export const VectorTypeId = Symbol.for('@principia/base/collection/immutable/Vector')
export type VectorTypeId = typeof VectorTypeId

export interface VectorF extends HKT.HKT {
  readonly type: Vector<this['A']>
  readonly index: number
  readonly variance: {
    A: '+'
  }
}

/**
 * Represents a Vector of elements.
 */
export class Vector<A> implements Iterable<A> {
  readonly [VectorTypeId]: VectorTypeId = VectorTypeId
  constructor(
    /** @private */
    readonly bits: number,
    /** @private */
    readonly offset: number,
    readonly length: number,
    /** @private */
    readonly prefix: A[],
    /** @private */
    readonly root: Node | undefined,
    /** @private */
    readonly suffix: A[]
  ) {}

  [Symbol.iterator](): Iterator<A> {
    return new ForwardVectorIterator(this)
  }

  toJSON(): readonly A[] {
    return foldl_<A, A[]>(this, [], arrayPush)
  }

  get [Ha.$hash](): number {
    return Ha.hashIterator(this[Symbol.iterator]())
  }

  [Equ.$equals](that: unknown): boolean {
    return isVector(that) && corresponds_(this, that, Equ.equals)
  }
}

export function isVector(u: unknown): u is Vector<unknown> {
  return P.isObject(u) && VectorTypeId in u
}

export type MutableVector<A> = { -readonly [K in keyof Vector<A>]: Vector<A>[K] } & {
  [Symbol.iterator]: () => Iterator<A>
  /**
   * This property doesn't exist at run-time. It exists to prevent a
   * MutableVector from being assignable to a Vector.
   */
  '@@mutable': true
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function emptyPushable<A>(): MutableVector<A> {
  return new Vector(0, 0, 0, [], undefined, []) as any
}

/**
 * Creates a Vector of the given elements.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function vector<A>(...elements: A[]): Vector<A> {
  const l = emptyPushable<A>()
  for (const element of elements) {
    push(element, l)
  }
  return l
}

/**
 * Creates an empty Vector.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function empty<A = any>(): Vector<A> {
  return new Vector(0, 0, 0, emptyAffix, undefined, emptyAffix)
}

/**
 * Takes a single arguments and returns a singleton Vector that contains it.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function single<A>(a: A): Vector<A> {
  return vector(a)
}

/**
 * Takes two arguments and returns a Vector that contains them.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function pair<A>(first: A, second: A): Vector<A> {
  return new Vector(2, 0, 2, emptyAffix, undefined, [first, second])
}

/**
 * Converts an array, an array-like, or an iterable into a Vector.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function from<A>(sequence: A[] | ArrayLike<A> | Iterable<A>): Vector<A>
export function from<A>(sequence: any): Vector<A> {
  const l = emptyPushable<A>()
  if (sequence.length > 0 && (sequence[0] !== undefined || 0 in sequence)) {
    for (let i = 0; i < sequence.length; ++i) {
      push(sequence[i], l)
    }
  } else if (Symbol.iterator in sequence) {
    const iterator = sequence[Symbol.iterator]()
    let cur
    while (!(cur = iterator.next()).done) {
      push(cur.value, l)
    }
  }
  return l
}

/**
 * Returns a Vector of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function range(start: number, end: number): Vector<number> {
  const vec = emptyPushable<number>()
  for (let i = start; i < end; ++i) {
    push(i, vec)
  }
  return vec
}

/**
 * Returns a Vector of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function replicate<A>(n: number, a: A): Vector<A> {
  let t   = n
  const l = emptyPushable<A>()
  while (--t >= 0) {
    push(a, l)
  }
  return l
}

/**
 * Generates a new Vector by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function makeBy<A>(n: number, f: (index: number) => A): Vector<A> {
  const l = emptyPushable<A>()
  for (let i = 0; i < n; i++) {
    push(f(i), l)
  }
  return l
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<A>(l: Vector<A>): boolean {
  return l.length === 0
}

export function isNonEmpty<A>(l: Vector<A>): boolean {
  return l.length > 0
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns an iterable that iterates backwards over the given Vector.
 *
 * @complexity O(1)
 */
export function backwardIterable<A>(l: Vector<A>): Iterable<A> {
  return {
    [Symbol.iterator](): Iterator<A> {
      return new BackwardVectorIterator(l)
    }
  }
}

/**
 * Returns an iterable that iterates forwards over the given Vector.
 *
 * @complexity O(1)
 */
export function forwardIterable<A>(l: Vector<A>): Iterable<A> {
  return {
    [Symbol.iterator](): Iterator<A> {
      return new ForwardVectorIterator(l)
    }
  }
}

/**
 * Gets the nth element of the Vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function unsafeGet_<A>(l: Vector<A>, index: number): A | undefined {
  if (index < 0 || l.length <= index) {
    return undefined
  }
  const prefixSize = getPrefixSize(l)
  const suffixSize = getSuffixSize(l)
  if (index < prefixSize) {
    return l.prefix[prefixSize - index - 1]
  } else if (index >= l.length - suffixSize) {
    return l.suffix[index - (l.length - suffixSize)]
  }
  const { offset } = l
  const depth      = getDepth(l)
  return l.root!.sizes === undefined
    ? nodeNthDense(l.root!, depth, offset === 0 ? index - prefixSize : handleOffset(depth, offset, index - prefixSize))
    : nodeNth(l.root!, depth, offset, index - prefixSize)
}

/**
 * Gets the nth element of the Vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @dataFirst unsafeGet_
 */
export function unsafeGet(index: number): <A>(l: Vector<A>) => A | undefined {
  return (l) => unsafeGet_(l, index)
}

/**
 * Gets the nth element of the Vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 */
export function get_<A>(l: Vector<A>, index: number): M.Maybe<A> {
  return M.fromNullable(unsafeGet_(l, index))
}

/**
 * Gets the nth element of the Vector. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @dataFirst get_
 */
export function get(index: number): <A>(l: Vector<A>) => M.Maybe<A> {
  return (l) => get_(l, index)
}

/**
 * Returns the first element of the Vector. If the Vector is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 */
export function unsafeHead<A>(l: Vector<A>): A | undefined {
  const prefixSize = getPrefixSize(l)
  return prefixSize !== 0 ? l.prefix[prefixSize - 1] : l.length !== 0 ? l.suffix[0] : undefined
}

/**
 * Returns the first element of the Vector.
 *
 * @complexity O(1)
 */
export function head<A>(l: Vector<A>): M.Maybe<NonNullable<A>> {
  return M.fromNullable(unsafeHead(l))
}

/**
 * Returns the last element of the Vector. If the Vector is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 */
export function unsafeLast<A>(l: Vector<A>): A | undefined {
  const suffixSize = getSuffixSize(l)
  return suffixSize !== 0 ? l.suffix[suffixSize - 1] : l.length !== 0 ? l.prefix[0] : undefined
}

/**
 * Returns the last element of the Vector.
 *
 * @complexity O(1)
 */
export function last<A>(l: Vector<A>): M.Maybe<NonNullable<A>> {
  return M.fromNullable(unsafeLast(l))
}

/**
 * Converts a Vector into an array.
 *
 * @complexity `O(n)`
 */
export function toArray<A>(l: Vector<A>): readonly A[] {
  return foldl_<A, A[]>(l, [], arrayPush)
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
export function alignWith_<A, B, C>(fa: Vector<A>, fb: Vector<B>, f: (_: These<A, B>) => C): Vector<C> {
  const minLen        = Math.min(fa.length, fb.length)
  const maxLen        = Math.max(fa.length, fb.length)
  const out           = emptyPushable<C>()
  const leftIterator  = fa[Symbol.iterator]()
  const rightIterator = fb[Symbol.iterator]()
  let i               = 0
  let left
  let right
  while (i < minLen && !(left = leftIterator.next()).done && !(right = rightIterator.next()).done) {
    push(f(Th.both(left.value, right.value)), out)
    i++
  }
  if (minLen === maxLen) {
    return out
  } else if (fa.length > fb.length) {
    i = minLen
    while (i < maxLen && !(left = leftIterator.next()).done) {
      push(f(Th.left(left.value)), out)
    }
  } else {
    i = minLen
    while (i < maxLen && !(right = rightIterator.next()).done) {
      push(f(Th.right(right.value)), out)
    }
  }
  return out
}

/**
 * @category Align
 * @since 1.0.0
 *
 * @dataFirst alignWith_
 */
export function alignWith<A, B, C>(fb: Vector<B>, f: (_: These<A, B>) => C): (fa: Vector<A>) => Vector<C> {
  return (fa) => alignWith_(fa, fb, f)
}

/**
 * @category Align
 * @since 1.0.0
 */
export function align_<A, B>(fa: Vector<A>, fb: Vector<B>): Vector<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

/**
 * @category Align
 * @since 1.0.0
 *
 * @dataFirst align_
 */
export function align<B>(fb: Vector<B>): <A>(fa: Vector<A>) => Vector<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

export function alt_<A>(fa: Vector<A>, f: () => Vector<A>): Vector<A> {
  return concat_(fa, f())
}

/**
 * @dataFirst alt_
 */
export function alt<A>(f: () => Vector<A>): (fa: Vector<A>) => Vector<A> {
  return (fa) => alt_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure value into a Vector
 *
 * @section Applicative
 * @since 1.0.0
 */
export const pure: <A>(a: A) => Vector<A> = single

/**
 * Returns the unit Vector
 *
 * @section Applicative
 * @since 1.0.0
 */
export function unit(): Vector<void> {
  return single(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Applies a Vector of functions to a Vector of values.
 */
export function ap_<A, B>(fab: Vector<(a: A) => B>, fa: Vector<A>): Vector<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * Applies a Vector of functions to a Vector of values.
 *
 * @dataFirst ap_
 */
export function ap<A, B>(fa: Vector<A>): (fab: Vector<(a: A) => B>) => Vector<B> {
  return (fab) => ap_(fab, fa)
}

export function crossWith_<A, B, C>(fa: Vector<A>, fb: Vector<B>, f: (a: A, b: B) => C): Vector<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, B, C>(fb: Vector<B>, f: (a: A, b: B) => C): (fa: Vector<A>) => Vector<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: Vector<A>, fb: Vector<B>): Vector<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * @dataFirst cross_
 */
export function cross<B>(fb: Vector<B>): <A>(fa: Vector<A>) => Vector<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Zip
 * -------------------------------------------------------------------------------------------------
 */

/**
 * This is like mapping over two Vectors at the same time. The two Vectors
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new Vector.
 *
 * The shortest Vector determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * Vector.
 */
export function zipWith_<A, B, C>(as: Vector<A>, bs: Vector<B>, f: (a: A, b: B) => C): Vector<C> {
  const swapped  = bs.length < as.length
  const iterator = (swapped ? as : bs)[Symbol.iterator]()
  return imap_((swapped ? bs : as) as any, (_, a: any) => {
    const b: any = iterator.next().value
    return swapped ? f(b, a) : f(a, b)
  })
}

/**
 * This is like mapping over two Vectors at the same time. The two Vectors
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new Vector.
 *
 * The shortest Vector determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * Vector.
 * @dataFirst zipWith_
 */
export function zipWith<A, B, C>(bs: Vector<B>, f: (a: A, b: B) => C): (as: Vector<A>) => Vector<C> {
  return (as) => zipWith_(as, bs, f)
}

/**
 * Iterate over two Vectors in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * Vector.
 */
export function zip_<A, B>(as: Vector<A>, bs: Vector<B>): Vector<readonly [A, B]> {
  return zipWith_(as, bs, (a, b) => [a, b] as [A, B])
}

/**
 * Iterate over two Vectors in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * Vector.
 * @dataFirst zip_
 */
export function zip<B>(bs: Vector<B>): <A>(as: Vector<A>) => Vector<readonly [A, B]> {
  return (as) => zip_(as, bs)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filter out optional values
 */
export function compact<A>(fa: Vector<M.Maybe<A>>): Vector<A> {
  return filterMap_(fa, identity)
}

/**
 * Splits the Vector into two Vectors. One Vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function separate<B, C>(fa: Vector<Either<B, C>>): readonly [Vector<B>, Vector<C>] {
  return partitionMap_(fa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Vector<A>> {
  return P.Eq((xs, ys) => corresponds_(xs, ys, E.equals_))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */
/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function ifilter_<A, B extends A>(fa: Vector<A>, refinement: P.RefinementWithIndex<number, A, B>): Vector<B>
export function ifilter_<A>(fa: Vector<A>, predicate: P.PredicateWithIndex<number, A>): Vector<A>
export function ifilter_<A>(fa: Vector<A>, predicate: P.PredicateWithIndex<number, A>): Vector<A> {
  return ifoldl_(fa, emptyPushable(), (i, acc, a) => (predicate(i, a) ? push(a, acc) : acc))
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 * @dataFirst ifilter_
 */
export function ifilter<A, B extends A>(refinement: P.RefinementWithIndex<number, A, B>): (fa: Vector<A>) => Vector<B>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Vector<A>) => Vector<A>
export function ifilter<A>(predicate: P.PredicateWithIndex<number, A>): (fa: Vector<A>) => Vector<A> {
  return (fa) => ifilter_(fa, predicate)
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 */
export function filter_<A, B extends A>(fa: Vector<A>, refinement: Refinement<A, B>): Vector<B>
export function filter_<A>(fa: Vector<A>, predicate: Predicate<A>): Vector<A>
export function filter_<A>(fa: Vector<A>, predicate: Predicate<A>): Vector<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the predicate returns `true`.
 *
 * @complexity O(n)
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Vector<A>) => Vector<B>
export function filter<A>(predicate: Predicate<A>): (fa: Vector<A>) => Vector<A>
export function filter<A>(predicate: Predicate<A>): (fa: Vector<A>) => Vector<A> {
  return (fa) => filter_(fa, predicate)
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the f returns `Just`.
 *
 * @complexity O(n)
 */
export function ifilterMap_<A, B>(fa: Vector<A>, f: (i: number, a: A) => M.Maybe<B>): Vector<B> {
  return ifoldl_(fa, emptyPushable(), (i, b, a) => {
    const result = f(i, a)
    if (result._tag === 'Just') {
      push(result.value, b)
    }
    return b
  })
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the f returns `Just`.
 *
 * @complexity O(n)
 * @dataFirst ifilterMap_
 */
export function ifilterMap<A, B>(f: (i: number, a: A) => M.Maybe<B>): (fa: Vector<A>) => Vector<B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the f returns `Some`.
 *
 * @complexity O(n)
 */
export function filterMap_<A, B>(fa: Vector<A>, f: (a: A) => M.Maybe<B>): Vector<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * Returns a new Vector that only contains the elements of the original
 * Vector for which the f returns `Some`.
 *
 * @complexity O(n)
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => M.Maybe<B>): (fa: Vector<A>) => Vector<B> {
  return (fa) => filterMap_(fa, f)
}

/**
 * Splits the Vector into two Vectors. One Vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function ipartition_<A, B extends A>(
  fa: Vector<A>,
  refinement: P.RefinementWithIndex<number, A, B>
): readonly [Vector<Exclude<A, B>>, Vector<B>]
export function ipartition_<A>(
  fa: Vector<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Vector<A>, Vector<A>]
export function ipartition_<A>(
  fa: Vector<A>,
  predicate: P.PredicateWithIndex<number, A>
): readonly [Vector<A>, Vector<A>] {
  return ifoldl_(
    fa,
    [emptyPushable<A>(), emptyPushable<A>()],
    (i, b, a) => (predicate(i, a) ? push(a, b[1]) : push(a, b[0]), b)
  )
}

/**
 * Splits the Vector into two Vectors. One Vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 * @dataFirst ipartition_
 */
export function ipartition<A, B extends A>(
  refinement: P.RefinementWithIndex<number, A, B>
): (fa: Vector<A>) => readonly [Vector<Exclude<A, B>>, Vector<B>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Vector<A>) => readonly [Vector<A>, Vector<A>]
export function ipartition<A>(
  predicate: P.PredicateWithIndex<number, A>
): (fa: Vector<A>) => readonly [Vector<A>, Vector<A>] {
  return (fa) => ipartition_(fa, predicate)
}

/**
 * Splits the Vector into two Vectors. One Vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 */
export function partition_<A, B extends A>(
  fa: Vector<A>,
  refinement: Refinement<A, B>
): readonly [Vector<Exclude<A, B>>, Vector<B>]
export function partition_<A>(fa: Vector<A>, predicate: Predicate<A>): readonly [Vector<A>, Vector<A>]
export function partition_<A>(fa: Vector<A>, predicate: Predicate<A>): readonly [Vector<A>, Vector<A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

/**
 * Splits the Vector into two Vectors. One Vector that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (l: Vector<A>) => readonly [Vector<B>, Vector<Exclude<A, B>>]
export function partition<A>(predicate: Predicate<A>): (l: Vector<A>) => readonly [Vector<A>, Vector<A>]
export function partition<A>(predicate: Predicate<A>): (l: Vector<A>) => readonly [Vector<A>, Vector<A>] {
  return (l) => partition_(l, predicate)
}

/**
 * Splits the Vector into two Vectors. One Vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function ipartitionMap_<A, B, C>(
  fa: Vector<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Vector<B>, Vector<C>] {
  return ifoldl_(fa, [emptyPushable<B>(), emptyPushable<C>()], (i, b, a) => {
    const result = f(i, a)
    if (result._tag === 'Left') {
      push(result.left, b[0])
    } else {
      push(result.right, b[1])
    }
    return b
  })
}

/**
 * Splits the Vector into two Vectors. One Vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 * @dataFirst ipartitionMap_
 */
export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (fa: Vector<A>) => readonly [Vector<B>, Vector<C>] {
  return (fa) => ipartitionMap_(fa, f)
}

/**
 * Splits the Vector into two Vectors. One Vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 */
export function partitionMap_<A, B, C>(fa: Vector<A>, f: (a: A) => Either<B, C>): readonly [Vector<B>, Vector<C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

/**
 * Splits the Vector into two Vectors. One Vector that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 * @dataFirst partitionMap_
 */
export function partitionMap<A, B, C>(f: (_: A) => Either<B, C>): (fa: Vector<A>) => readonly [Vector<B>, Vector<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldl_<A, B>(fa: Vector<A>, b: B, f: (i: number, b: B, a: A) => B): B {
  const suffixSize = getSuffixSize(fa)
  const prefixSize = getPrefixSize(fa)
  let [acc, index] = foldlPrefix(f, b, fa.prefix, prefixSize)
  if (fa.root !== undefined) {
    [acc, index] = foldlNode(f, acc, fa.root, getDepth(fa), index)
  }
  return foldlSuffix(f, acc, fa.suffix, suffixSize, index)[0]
}

/**
 * @dataFirst ifoldl_
 */
export function ifoldl<A, B>(b: B, f: (i: number, b: B, a: A) => B): (fa: Vector<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

/**
 * Folds a function over a Vector. Left-associative.
 */
export function foldl_<A, B>(fa: Vector<A>, initial: B, f: (acc: B, a: A) => B): B {
  return ifoldl_(fa, initial, (_, b, a) => f(b, a))
}

/**
 * Folds a function over a Vector. Left-associative.
 */
export function foldl<A, B>(initial: B, f: (acc: B, value: A) => B): (fa: Vector<A>) => B {
  return (l) => foldl_(l, initial, f)
}

/**
 * Folds a function over a Vector. Right-associative.
 *
 * @complexity O(n)
 */
export function ifoldr_<A, B>(fa: Vector<A>, b: B, f: (i: number, a: A, b: B) => B): B {
  const suffixSize = getSuffixSize(fa)
  const prefixSize = getPrefixSize(fa)
  let [acc, j]     = foldrSuffix(f, b, fa.suffix, suffixSize, fa.length - 1)
  if (fa.root !== undefined) {
    [acc, j] = foldrNode(f, acc, fa.root, getDepth(fa), j)
  }
  return foldrPrefix(f, acc, fa.prefix, prefixSize, j)[0]
}

/**
 * @dataFirst ifoldr_
 */
export function ifoldr<A, B>(b: B, f: (i: number, a: A, b: B) => B): (fa: Vector<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

/**
 * Folds a function over a Vector. Right-associative.
 *
 * @complexity O(n)
 */
export function foldr_<A, B>(fa: Vector<A>, initial: B, f: (value: A, acc: B) => B): B {
  return ifoldr_(fa, initial, (_, a, b) => f(a, b))
}

/**
 * Folds a function over a Vector. Right-associative.
 *
 * @complexity O(n)
 */
export function foldr<A, B>(initial: B, f: (value: A, acc: B) => B): (l: Vector<A>) => B {
  return (l) => foldr_(l, initial, f)
}

export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: Vector<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => ifoldl_(fa, M.nat, (i, b, a) => M.combine_(b, f(i, a)))
}

/**
 * @dataFirst ifoldMap_
 */
export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Vector<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Vector<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Vector<A>) => M {
  const foldMapM_ = foldMap_(M)
  return (f) => (fa) => foldMapM_(fa, f)
}

export function mapAccum_<A, S, B>(fa: Vector<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Vector<B>, S] {
  return foldl_(fa, [emptyPushable(), s], ([acc, s], a) => {
    const r = f(s, a)
    push(r[0], acc)
    return [acc, r[1]]
  })
}

export function mapAccum<A, S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): (l: Vector<A>) => readonly [Vector<B>, S] {
  return (l) => mapAccum_(l, s, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Applies a function to each element in the given Vector and returns a
 * new Vector of the values that the function return.
 *
 * @complexity O(n)
 */
export function imap_<A, B>(fa: Vector<A>, f: (i: number, a: A) => B): Vector<B> {
  return new Vector(
    fa.bits,
    fa.offset,
    fa.length,
    mapPrefix(f, fa.prefix, getPrefixSize(fa)),
    fa.root === undefined ? undefined : mapNode(f, fa.root, getDepth(fa), getPrefixSize(fa), 1)[0],
    mapAffix(f, fa.suffix, getSuffixSize(fa), fa.length)
  )
}

/**
 * Applies a function to each element in the given Vector and returns a
 * new Vector of the values that the function return.
 *
 * @complexity O(n)
 * @dataFirst imap_
 */
export function imap<A, B>(f: (i: number, a: A) => B): (fa: Vector<A>) => Vector<B> {
  return (fa) => imap_(fa, f)
}

/**
 * Applies a function to each element in the given Vector and returns a
 * new Vector of the values that the function return.
 *
 * @complexity O(n)
 */
export function map_<A, B>(fa: Vector<A>, f: (a: A) => B): Vector<B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Applies a function to each element in the given Vector and returns a
 * new Vector of the values that the function return.
 *
 * @complexity O(n)
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (fa: Vector<A>) => Vector<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Flattens a Vector of Vectors into a Vector. Note that this function does
 * not flatten recursively. It removes one level of nesting only.
 *
 * @complexity O(n * log(m)), where n is the length of the outer Vector and m the length of the inner Vectors.
 */
export function flatten<A>(mma: Vector<Vector<A>>): Vector<A> {
  return foldl_<Vector<A>, Vector<A>>(mma, empty(), concat_)
}

/**
 * Maps a function over a Vector and concatenates all the resulting
 * Vectors together.
 */
export function chain_<A, B>(ma: Vector<A>, f: (a: A) => Vector<B>): Vector<B> {
  return flatten(map_(ma, f))
}

/**
 * Maps a function over a Vector and concatenates all the resulting
 * Vectors together.
 *
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Vector<B>): (ma: Vector<A>) => Vector<B> {
  return (ma) => chain_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * TailRec
 * -------------------------------------------------------------------------------------------------
 */

export function chainRecDepthFirst_<A, B>(a: A, f: (a: A) => Vector<Either<A, B>>): Vector<B> {
  let buffer = f(a)
  let out    = emptyPushable<B>()

  while (buffer.length > 0) {
    const e = unsafeHead(buffer)!
    buffer  = tail(buffer)
    if (e._tag === 'Left') {
      buffer = concat_(f(e.left), buffer)
    } else {
      out = push(e.right, out)
    }
  }

  return out
}

/**
 * @dataFirst chainRecDepthFirst_
 */
export function chainRecDepthFirst<A, B>(f: (a: A) => Vector<Either<A, B>>): (a: A) => Vector<B> {
  return (a) => chainRecDepthFirst_(a, f)
}

export function chainRecBreadthFirst_<A, B>(a: A, f: (a: A) => Vector<Either<A, B>>): Vector<B> {
  const initial = f(a)
  let buffer    = emptyPushable<Either<A, B>>()
  let out       = emptyPushable<B>()

  function go(e: Either<A, B>): void {
    if (e._tag === 'Left') {
      forEach_(f(e.left), (ab) => push(ab, buffer))
    } else {
      push(e.right, out)
    }
  }

  forEach_(initial, go)
  while (buffer.length > 0) {
    const ab = unsafeHead(buffer)!
    buffer   = tail(buffer) as MutableVector<Either<A, B>>
    go(ab)
  }

  return out
}

/**
 * @dataFirst chainRecBreadthFirst_
 */
export function chainRecBreadthFirst<A, B>(f: (a: A) => Vector<Either<A, B>>): (a: A) => Vector<B> {
  return (a) => chainRecBreadthFirst_(a, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const itraverse_: P.TraverseIndexFn_<VectorF> = P.implementTraverseWithIndex_<VectorF>()(
  () => (A) => (ta, f) =>
    ifoldr_(ta, A.pure(empty()), (i, a, fb) => A.crossWith_(f(i, a), fb, (b, l) => prepend_(l, b)))
)

/**
 * @dataFirst itraverse_
 */
export const itraverse: P.MapWithIndexAFn<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (ta) => itraverseA_(ta, f)
}

export const traverse_: P.TraverseFn_<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (ta, f) => itraverseA_(ta, (_, a) => f(a))
}

export const traverse: P.TraverseFn<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (ta) => itraverseA_(ta, (_, a) => f(a))
}

export const sequence: P.SequenceFn<VectorF> = (A) => (ta) => traverse_(A)(ta, identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Unfoldable
 * -------------------------------------------------------------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => M.Maybe<readonly [A, B]>): Vector<A> {
  const out = emptyPushable<A>()
  let state = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(state)
    if (mt._tag === 'Just') {
      const [a, b] = mt.value
      push(a, out)
      state = b
    } else {
      break
    }
  }
  return out
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const iwither_: P.WitherWithIndexFn_<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (wa, f) => A.map_(itraverseA_(wa, f), compact)
}

/**
 * @dataFirst iwither_
 */
export const iwither: P.WitherWithIndexFn<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (wa) => A.map_(itraverseA_(wa, f), compact)
}

export const wither_: P.WitherFn_<VectorF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (wa, f) => iwitherA_(wa, (_, a) => f(a))
}

/**
 * @dataFirst wither_
 */
export const wither: P.WitherFn<VectorF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (f) => (wa) => iwitherA_(wa, (_, a) => f(a))
}

export const iwilt_: P.WiltWithIndexFn_<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (wa, f) => A.map_(itraverseA_(wa, f), separate)
}

/**
 * @dataFirst iwilt_
 */
export const iwilt: P.WiltWithIndexFn<VectorF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (wa) => A.map_(itraverseA_(wa, f), separate)
}

export const wilt_: P.WiltFn_<VectorF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (wa, f) => iwiltA_(wa, (_, a) => f(a))
}

/**
 * @dataFirst wilt_
 */
export const wilt: P.WiltFn<VectorF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (f) => (wa) => iwiltA_(wa, (_, a) => f(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Appends an element to the end of a Vector and returns the new Vector.
 *
 * @complexity O(n)
 */
export function append_<A>(as: Vector<A>, a: A): Vector<A> {
  const suffixSize = getSuffixSize(as)
  if (suffixSize < 32) {
    return new Vector(
      incrementSuffix(as.bits),
      as.offset,
      as.length + 1,
      as.prefix,
      as.root,
      affixPush(a, as.suffix, suffixSize)
    )
  }
  const newSuffix = [a]
  const newVector = mutableClone(as)
  appendNodeToTree(newVector, as.suffix)
  newVector.suffix = newSuffix
  newVector.length++
  newVector.bits = setSuffix(1, newVector.bits)
  return newVector
}

/**
 * Appends an element to the end of a Vector and returns the new Vector.
 *
 * @complexity O(n)
 * @dataFirst append_
 */
export function append<A>(a: A): (as: Vector<A>) => Vector<A> {
  return (as) => append_(as, a)
}

/**
 * Splits the Vector into chunks of the given size.
 */
export function chunksOf_<A>(as: Vector<A>, size: number): Vector<Vector<A>> {
  const { buffer, l2 } = foldl_(
    as,
    { l2: emptyPushable<Vector<A>>(), buffer: emptyPushable<A>() },
    ({ buffer, l2 }, elm) => {
      push(elm, buffer)
      if (buffer.length === size) {
        return { l2: push(buffer, l2), buffer: emptyPushable<A>() }
      } else {
        return { l2, buffer }
      }
    }
  )
  return buffer.length === 0 ? l2 : push(buffer, l2)
}

/**
 * Splits the Vector into chunks of the given size.
 *
 * @dataFirst chunksOf_
 */
export function chunksOf(size: number): <A>(as: Vector<A>) => Vector<Vector<A>> {
  return (as) => chunksOf_(as, size)
}

/**
 * Concatenates two Vectors.
 *
 * @complexity O(log(n))
 */
export function concat_<A>(xs: Vector<A>, ys: Vector<A>): Vector<A> {
  if (xs.length === 0) {
    return ys
  } else if (ys.length === 0) {
    return xs
  }
  const newSize         = xs.length + ys.length
  const rightSuffixSize = getSuffixSize(ys)
  let newVector         = mutableClone(xs)
  if (ys.root === undefined) {
    // right is nothing but a prefix and a suffix
    const nrOfAffixes = concatAffixes(xs, ys)
    for (let i = 0; i < nrOfAffixes; ++i) {
      newVector         = appendNodeToTree(newVector, concatBuffer[i])
      newVector.length += concatBuffer[i].length
      // wipe pointer, otherwise it might end up keeping the array alive
      concatBuffer[i] = undefined
    }
    newVector.length          = newSize
    newVector.suffix          = concatBuffer[nrOfAffixes]
    newVector.bits            = setSuffix(concatBuffer[nrOfAffixes].length, newVector.bits)
    concatBuffer[nrOfAffixes] = undefined
    return newVector
  } else {
    const leftSuffixSize = getSuffixSize(xs)
    if (leftSuffixSize > 0) {
      newVector         = appendNodeToTree(newVector, xs.suffix.slice(0, leftSuffixSize))
      newVector.length += leftSuffixSize
    }
    newVector      = appendNodeToTree(newVector, ys.prefix.slice(0, getPrefixSize(ys)).reverse())
    const newNode  = concatSubTree(newVector.root!, getDepth(newVector), ys.root, getDepth(ys), true)
    const newDepth = getHeight(newNode)
    setSizes(newNode, newDepth)
    newVector.root    = newNode
    newVector.offset &= ~(mask << (getDepth(xs) * branchBits))
    newVector.length  = newSize
    newVector.bits    = setSuffix(rightSuffixSize, setDepth(newDepth, newVector.bits))
    newVector.suffix  = ys.suffix
    return newVector
  }
}

/**
 * Concatenates two Vectors.
 *
 * @complexity O(log(n))
 * @dataFirst concat_
 */
export function concat<A>(xs: Vector<A>): (ys: Vector<A>) => Vector<A> {
  return (left) => concat_(left, xs)
}

/**
 * Concatenates two Vectors and widens the type
 *
 * @complexity O(log(n))
 */
export function concatW_<A, B>(as: Vector<A>, bs: Vector<B>): Vector<A | B> {
  return concat_(as, unsafeCoerce(bs))
}

/**
 * Concatenates two Vectors and widens the type
 *
 * @complexity O(log(n))
 * @dataFirst concatW_
 */
export function concatW<B>(bs: Vector<B>): <A>(as: Vector<A>) => Vector<A | B> {
  return (as) => concatW_(as, bs)
}

/**
 * Returns `true` if the Vector contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 */
export function contains_<A>(as: Vector<A>, element: A): boolean {
  containsState.element = element
  containsState.result  = false
  return foldlCb(containsCb, containsState, as).result
}

/**
 * Returns `true` if the Vector contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 * @dataFirst contains_
 */
export function contains<A>(element: A): (as: Vector<A>) => boolean {
  return (as) => contains_(as, element)
}

/**
 * Delete an element at the specified index
 *
 * @complexity `O(log(n))`
 */
export function deleteAt_<A>(as: Vector<A>, i: number): Vector<A> {
  return remove_(as, i, 1)
}

/**
 * Delete an element at the specified index
 *
 * @complexity `O(log(n))`
 * @dataFirst deleteAt_
 */
export function deleteAt(i: number): <A>(as: Vector<A>) => Vector<A> {
  return (as) => deleteAt_(as, i)
}

/**
 * Returns a new Vector without the first `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function drop_<A>(as: Vector<A>, n: number): Vector<A> {
  return slice_(as, n, as.length)
}

/**
 * Returns a new Vector without the first `n` elements.
 *
 * @complexity `O(log(n))`
 * @dataFirst drop_
 */
export function drop(n: number): <A>(as: Vector<A>) => Vector<A> {
  return (as) => drop_(as, n)
}

/**
 * Returns a new Vector without the last `n` elements.
 *
 * @complexity `O(log(n))`
 */
export function dropLast_<A>(as: Vector<A>, n: number): Vector<A> {
  return slice_(as, 0, as.length - n)
}

/**
 * Returns a new Vector without the last `n` elements.
 *
 * @complexity `O(log(n))`
 * @dataFirst dropLast_
 */
export function dropLast<A>(n: number): (as: Vector<A>) => Vector<A> {
  return (as) => dropLast_(as, n)
}

/**
 * Returns a new Vector without repeated elements.
 *
 * @complexity `O(n)`
 */
export function dropRepeats<A>(as: Vector<A>): Vector<A> {
  return dropRepeatsWith_(as, elementEquals)
}

/**
 * Returns a new Vector without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 */
export function dropRepeatsWith_<A>(as: Vector<A>, predicate: (a: A, b: A) => boolean): Vector<A> {
  return foldl_(as, emptyPushable(), (acc, a) =>
    acc.length !== 0 && predicate(unsafeLast(acc)!, a) ? acc : push(a, acc)
  )
}

/**
 * Returns a new Vector without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 * @dataFirst dropRepeatsWith_
 */
export function dropRepeatsWith<A>(predicate: (a: A, b: A) => boolean): (as: Vector<A>) => Vector<A> {
  return (as) => dropRepeatsWith_(as, predicate)
}

/**
 * Removes the first elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function dropWhile_<A>(as: Vector<A>, predicate: Predicate<A>): Vector<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, as)
  return slice_(as, index, as.length)
}

/**
 * Removes the first elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @dataFirst dropWhile_
 */
export function dropWhile<A>(predicate: Predicate<A>): (as: Vector<A>) => Vector<A> {
  return (as) => dropWhile_(as, predicate)
}

export function elem_<A>(E: P.Eq<A>): (as: Vector<A>, a: A) => boolean {
  const elemState: ElemState = { equals: E.equals_, element: undefined, result: false }
  return (as, a) => {
    elemState.element = a
    return foldlCb(elemCb, elemState, as).result
  }
}

/**
 * @dataFirst elem_
 */
export function elem<A>(E: P.Eq<A>): (a: A) => (as: Vector<A>) => boolean {
  const elemE_ = elem_(E)
  return (a) => (as) => elemE_(as, a)
}

/**
 * Returns true if the two Vectors are equivalent.
 *
 * @complexity O(n)
 */
export function equals_<A>(xs: Vector<A>, yx: Vector<A>): boolean {
  return corresponds_(xs, yx, elementEquals)
}

/**
 * Returns true if the two Vectors are equivalent.
 *
 * @complexity O(n)
 * @dataFirst equals_
 */
export function equals<A>(ys: Vector<A>): (xs: Vector<A>) => boolean {
  return (l1) => equals_(l1, ys)
}

/**
 * Returns true if the two Vectors are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 */
export function corresponds_<A, B>(as: Vector<A>, bs: Vector<B>, f: (a: A, b: B) => boolean): boolean {
  if (as.length !== bs.length) {
    return false
  } else {
    const s = { iterator: bs[Symbol.iterator](), equals: true, f }
    return foldlCb<A, EqualsState<A, B>>(equalsCb, s, as).equals
  }
}

/**
 * Returns true if the two Vectors are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 * @dataFirst corresponds_
 */
export function corresponds<A, B>(bs: Vector<B>, f: (a: A, b: B) => boolean): (as: Vector<A>) => boolean {
  return (as) => corresponds_(as, bs, f)
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given Vector.
 *
 * @complexity O(n)
 */
export function every_<A, B extends A>(as: Vector<A>, refinement: Refinement<A, B>): as is Vector<B>
export function every_<A>(as: Vector<A>, predicate: Predicate<A>): boolean
export function every_<A>(as: Vector<A>, predicate: Predicate<A>): boolean {
  return foldlCb<A, PredState>(everyCb, { predicate, result: true }, as).result
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given Vector.
 *
 * @complexity O(n)
 * @dataFirst every_
 */
export function every<A, B extends A>(refinement: Refinement<A, B>): (as: Vector<A>) => as is Vector<B>
export function every<A>(predicate: Predicate<A>): (as: Vector<A>) => boolean
export function every<A>(predicate: Predicate<A>): (as: Vector<A>) => boolean {
  return (as) => every_(as, predicate)
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function find_<A>(as: Vector<A>, predicate: Predicate<A>): M.Maybe<A> {
  return M.fromNullable(unsafeFind_(as, predicate))
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @dataFirst find_
 */
export function find<A>(predicate: Predicate<A>): (as: Vector<A>) => M.Maybe<A> {
  return (as) => find_(as, predicate)
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findIndex_<A>(as: Vector<A>, predicate: Predicate<A>): number {
  const { found, index } = foldlCb<A, FindIndexState>(findIndexCb, { predicate, found: false, index: -1 }, as)
  return found ? index : -1
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 * @dataFirst findIndex_
 */
export function findIndex<A>(predicate: Predicate<A>): (as: Vector<A>) => number {
  return (as) => findIndex_(as, predicate)
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function findLast_<A>(as: Vector<A>, predicate: Predicate<A>): M.Maybe<A> {
  return M.fromNullable(unsafeFindLast_(as, predicate))
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @dataFirst findLast_
 */
export function findLast<A>(predicate: Predicate<A>): (as: Vector<A>) => M.Maybe<A> {
  return (as) => findLast_(as, predicate)
}

/**
 * Returns the index of the `last` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 */
export function findLastIndex_<A>(as: Vector<A>, predicate: Predicate<A>): number {
  const { found, index } = foldrCb<A, FindIndexState>(findIndexCb, { predicate, found: false, index: -0 }, as)
  return found ? index : -1
}

/**
 * Returns the index of the `last` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 * @dataFirst findLastIndex_
 */
export function findLastIndex<A>(predicate: Predicate<A>): (as: Vector<A>) => number {
  return (as) => findLastIndex_(as, predicate)
}

export function iforEach_<A>(as: Vector<A>, f: (i: number, a: A) => void): void {
  ifoldl_(as, undefined as void, (index, _, element) => f(index, element))
}

export function iforEach<A>(f: (i: number, a: A) => void): (as: Vector<A>) => void {
  return (as) => iforEach_(as, f)
}

/**
 * Invokes a given callback for each element in the Vector from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new Vector `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new Vector is unneeded.
 *
 * @complexity O(n)
 */
export function forEach_<A>(as: Vector<A>, f: (a: A) => void): void {
  foldl_(as, undefined as void, (_, element) => f(element))
}

/**
 * Invokes a given callback for each element in the Vector from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new Vector `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new Vector is unneeded.
 *
 * @complexity O(n)
 * @dataFirst forEach_
 */
export function forEach<A>(f: (a: A) => void): (as: Vector<A>) => void {
  return (l) => forEach_(l, f)
}

/**
 * Returns a Vector of Vectors where each subvector's elements are all
 * equal.
 */
export function group<B>(E: P.Eq<B>): <A extends B>(as: Vector<A>) => Vector<Vector<A>> {
  return (as) => groupWith_(as, E.equals_)
}

/**
 * Returns a Vector of Vectors where each subvector's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the Vector should be sorted
 * before grouping.
 */
export function groupWith_<A>(as: Vector<A>, f: (a: A, b: A) => boolean): Vector<Vector<A>> {
  const result = emptyPushable<MutableVector<A>>()
  let buffer   = emptyPushable<A>()
  forEach_(as, (a) => {
    if (buffer.length !== 0 && !f(unsafeLast(buffer)!, a)) {
      push(buffer, result)
      buffer = emptyPushable()
    }
    push(a, buffer)
  })
  return buffer.length === 0 ? result : push(buffer, result)
}

/**
 * Returns a Vector of Vectors where each subvector's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the Vector should be sorted
 * before grouping.
 *
 * @dataFirst groupWith_
 */
export function groupWith<A>(f: (a: A, b: A) => boolean): (as: Vector<A>) => Vector<Vector<A>> {
  return (l) => groupWith_(l, f)
}

export function foldlWhile_<A, B>(fa: Vector<A>, b: B, cont: Predicate<B>, f: (b: B, a: A, i: number) => B): B {
  if (!cont(b)) {
    return b
  }
  return foldlCb<A, FoldWhileState<A, B>>(foldWhileCb, { predicate: cont, f, result: b }, fa).result
}

/**
 * @dataFirst foldlWhile_
 */
export function foldlWhile<A, B>(b: B, cont: Predicate<B>, f: (b: B, a: A, i: number) => B): (fa: Vector<A>) => B {
  return (fa) => foldlWhile_(fa, b, cont, f)
}

export function foldrWhile_<A, B>(fa: Vector<A>, b: B, cont: Predicate<B>, f: (a: A, b: B, i: number) => B): B {
  return foldrCb<A, FoldWhileState<A, B>>(foldWhileCb, { predicate: cont, result: b, f: (b, a, i) => f(a, b, i) }, fa)
    .result
}

/**
 * @dataFirst foldrWhile_
 */
export function foldrWhile<A, B>(b: B, cont: Predicate<B>, f: (a: A, b: B, i: number) => B): (fa: Vector<A>) => B {
  return (fa) => foldrWhile_(fa, b, cont, f)
}

/**
 * Returns the index of the _first_ element in the Vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function indexOf_<A>(as: Vector<A>, element: A): number {
  const state = { element, found: false, index: -1 }
  foldlCb(indexOfCb, state, as)
  return state.found ? state.index : -1
}

/**
 * Returns the index of the _first_ element in the Vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @dataFirst indexOf_
 */
export function indexOf<A>(element: A): (as: Vector<A>) => number {
  return (as) => indexOf_(as, element)
}

/**
 * Inserts the given element at the given index in the Vector.
 *
 * @complexity O(log(n))
 */
export function insertAt_<A>(as: Vector<A>, index: number, element: A): Vector<A> {
  return concat_(append_(slice_(as, 0, index), element), slice_(as, index, as.length))
}

/**
 * Inserts the given element at the given index in the Vector.
 *
 * @complexity O(log(n))
 * @dataFirst insertAt_
 */
export function insertAt<A>(index: number, element: A): (as: Vector<A>) => Vector<A> {
  return (as) => insertAt_(as, index, element)
}

/**
 * Inserts the given Vector of elements at the given index in the Vector.
 *
 * @complexity `O(log(n))`
 */
export function insertAllAt_<A>(as: Vector<A>, index: number, elements: Vector<A>): Vector<A> {
  return concat_(concat_(slice_(as, 0, index), elements), slice_(as, index, as.length))
}

/**
 * Inserts the given Vector of elements at the given index in the Vector.
 *
 * @complexity `O(log(n))`
 * @dataFirst insertAllAt_
 */
export function insertAllAt<A>(index: number, elements: Vector<A>): (as: Vector<A>) => Vector<A> {
  return (as) => insertAllAt_(as, index, elements)
}

/**
 * Inserts a separator between each element in a Vector.
 */
export function intersperse_<A>(as: Vector<A>, separator: A): Vector<A> {
  return pop(foldl_(as, emptyPushable(), (l2, a) => push(separator, push(a, l2))))
}

/**
 * Inserts a separator between each element in a Vector.
 *
 * @dataFirst intersperse_
 */
export function intersperse<A>(separator: A): (as: Vector<A>) => Vector<A> {
  return (as) => intersperse_(as, separator)
}

/**
 * Concatenates the strings in the Vector separated by a specified separator.
 */
export function join_(as: Vector<string>, separator: string): string {
  return foldl_(as, '', (a, b) => (a.length === 0 ? b : a + separator + b))
}

/**
 * Concatenates the strings in the Vector separated by a specified separator.
 *
 * @dataFirst join_
 */
export function join(separator: string): (as: Vector<string>) => string {
  return (as) => join_(as, separator)
}

/**
 * Returns the index of the _last_ element in the Vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 */
export function lastIndexOf_<A>(as: Vector<A>, element: A): number {
  const state = { element, found: false, index: 0 }
  foldrCb(indexOfCb, state, as)
  return state.found ? as.length - state.index : -1
}

/**
 * Returns the index of the _last_ element in the Vector that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @dataFirst lastIndexOf_
 */
export function lastIndexOf<A>(element: A): (as: Vector<A>) => number {
  return (as) => lastIndexOf_(as, element)
}

/**
 * Gets the length of a Vector.
 *
 * @complexity `O(1)`
 */
export function length(as: Vector<any>): number {
  return as.length
}

/**
 * Returns a Vector that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given Vector is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 */
export function modifyAt_<A>(as: Vector<A>, i: number, f: (a: A) => A): Vector<A> {
  if (i < 0 || as.length <= i) {
    return as
  }
  return updateAt_(as, i, f(unsafeGet_(as, i)!))
}

/**
 * Returns a Vector that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given Vector is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 * @dataFirst modifyAt_
 */
export function modifyAt<A>(i: number, f: (a: A) => A): (as: Vector<A>) => Vector<A> {
  return (as) => modifyAt_(as, i, f)
}

export function mutableClone<A>(as: Vector<A>): MutableVector<A> {
  return new Vector(as.bits, as.offset, as.length, as.prefix, as.root, as.suffix) as any
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given Vector.
 *
 * @complexity O(n)
 */
export function none_<A>(as: Vector<A>, predicate: Predicate<A>): boolean {
  return !exists_(as, predicate)
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given Vector.
 *
 * @complexity O(n)
 * @dataFirst none_
 */
export function none<A>(predicate: Predicate<A>): (as: Vector<A>) => boolean {
  return (as) => none_(as, predicate)
}

/**
 * Extracts the specified property from each object in the Vector.
 */
export function pluck_<A, K extends keyof A>(as: Vector<A>, k: K): Vector<A[K]> {
  return map_(as, (a) => a[k])
}

/**
 * Extracts the specified property from each object in the Vector.
 *
 * @dataFirst pluck_
 */
export function pluck<A, K extends keyof A>(k: K): (as: Vector<A>) => Vector<A[K]> {
  return (as) => pluck_(as, k)
}

/**
 * Returns a new Vector with the last element removed. If the Vector is
 * empty the empty Vector is returned.
 *
 * @complexity `O(1)`
 */
export function pop<A>(as: Vector<A>): Vector<A> {
  return slice_(as, 0, -1)
}

/**
 * Prepends an element to the front of a Vector and returns the new Vector.
 *
 * @complexity O(1)
 */
export function prepend_<A>(as: Vector<A>, a: A): Vector<A> {
  const prefixSize = getPrefixSize(as)
  if (prefixSize < 32) {
    return new Vector<A>(
      incrementPrefix(as.bits),
      as.offset,
      as.length + 1,
      affixPush(a, as.prefix, prefixSize),
      as.root,
      as.suffix
    )
  } else {
    const newVector = mutableClone(as)
    prependNodeToTree(newVector, reverseArray(as.prefix))
    const newPrefix  = [a]
    newVector.prefix = newPrefix
    newVector.length++
    newVector.bits = setPrefix(1, newVector.bits)
    return newVector
  }
}

/**
 * Prepends an element to the front of a Vector and returns the new Vector.
 *
 * @complexity O(1)
 * @dataFirst prepend_
 */
export function prepend<A>(a: A): (as: Vector<A>) => Vector<A> {
  return (as) => prepend_(as, a)
}

/**
 * Takes an index, a number of elements to remove and a Vector. Returns a
 * new Vector with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 */
export function remove_<A>(as: Vector<A>, from: number, amount: number): Vector<A> {
  return concat_(slice_(as, 0, from), slice_(as, from + amount, as.length))
}

/**
 * Takes an index, a number of elements to remove and a Vector. Returns a
 * new Vector with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 * @dataFirst remove_
 */
export function remove(from: number, amount: number): <A>(as: Vector<A>) => Vector<A> {
  return (as) => remove_(as, from, amount)
}

/**
 * Reverses a Vector.
 * @complexity O(n)
 */
export function reverse<A>(as: Vector<A>): Vector<A> {
  return foldl_(as, empty(), (newL, element) => prepend_(newL, element))
}

/**
 * Folds a function over a Vector from left to right while collecting
 * all the intermediate steps in a resulting Vector.
 */
export function scanl_<A, B>(as: Vector<A>, initial: B, f: (acc: B, value: A) => B): Vector<B> {
  return foldl_(as, push(initial, emptyPushable<B>()), (l2, a) => push(f(unsafeLast(l2)!, a), l2))
}

/**
 * Folds a function over a Vector from left to right while collecting
 * all the intermediate steps in a resulting Vector.
 *
 * @dataFirst scanl_
 */
export function scanl<A, B>(initial: B, f: (acc: B, value: A) => B): (as: Vector<A>) => Vector<B> {
  return (as) => scanl_(as, initial, f)
}

/**
 * Returns a slice of a Vector. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the Vector.
 *
 * @complexity `O(log(n))`
 */
export function slice_<A>(as: Vector<A>, from: number, to: number): Vector<A> {
  let { bits, length } = as
  let _to              = to
  let _from            = from
  _to                  = Math.min(length, to)
  // Handle negative indices
  if (_from < 0) {
    _from = length + from
  }
  if (_to < 0) {
    _to = length + to
  }

  // Should we just return the empty Vector?
  if (_to <= _from || _to <= 0 || length <= _from) {
    return empty()
  }

  // Return Vector unchanged if we are slicing nothing off
  if (_from <= 0 && length <= _to) {
    return as
  }

  const newLength  = _to - _from
  let prefixSize   = getPrefixSize(as)
  const suffixSize = getSuffixSize(as)

  // Both indices lie in the prefix
  if (_to <= prefixSize) {
    return new Vector(
      setPrefix(newLength, 0),
      0,
      newLength,
      as.prefix.slice(prefixSize - _to, prefixSize - _from),
      undefined,
      emptyAffix
    )
  }

  const suffixStart = length - suffixSize
  // Both indices lie in the suffix
  if (suffixStart <= _from) {
    return new Vector(
      setSuffix(newLength, 0),
      0,
      newLength,
      emptyAffix,
      undefined,
      as.suffix.slice(_from - suffixStart, _to - suffixStart)
    )
  }

  const newVector  = mutableClone(as)
  newVector.length = newLength

  // Both indices lie in the tree
  if (prefixSize <= _from && _to <= suffixStart) {
    sliceTreeVector(
      _from - prefixSize + as.offset,
      _to - prefixSize + as.offset - 1,
      as.root!,
      getDepth(as),
      as.offset,
      newVector
    )
    return newVector
  }

  if (0 < _from) {
    // we need _to slice something off of the left
    if (_from < prefixSize) {
      // shorten the prefix even though it's not strictly needed,
      // so that referenced items can be GC'd
      newVector.prefix = as.prefix.slice(0, prefixSize - _from)
      bits             = setPrefix(prefixSize - _from, bits)
    } else {
      // if we're here `_to` can't lie in the tree, so we can set the
      // root
      zeroOffset()
      newVector.root   = sliceLeft(newVector.root!, getDepth(as), _from - prefixSize, as.offset, true)
      newVector.offset = newOffset
      if (newVector.root === undefined) {
        bits = setDepth(0, bits)
      }
      bits             = setPrefix(newAffix.length, bits)
      prefixSize       = newAffix.length
      newVector.prefix = newAffix
    }
  }
  if (_to < length) {
    // we need _to slice something off of the right
    if (length - _to < suffixSize) {
      bits = setSuffix(suffixSize - (length - _to), bits)
      // slice the suffix even though it's not strictly needed,
      // _to allow the removed items _to be GC'd
      newVector.suffix = as.suffix.slice(0, suffixSize - (length - _to))
    } else {
      newVector.root = sliceRight(newVector.root!, getDepth(as), _to - prefixSize - 1, newVector.offset)
      if (newVector.root === undefined) {
        bits             = setDepth(0, bits)
        newVector.offset = 0
      }
      bits             = setSuffix(newAffix.length, bits)
      newVector.suffix = newAffix
    }
  }
  newVector.bits = bits
  return newVector
}

/**
 * Returns a slice of a Vector. Elements are removed from the beginning and
 * end. Both the indices can be negative in which case they will count
 * from the right end of the Vector.
 *
 * @complexity `O(log(n))`
 * @dataFirst slice_
 */
export function slice(from: number, to: number): <A>(as: Vector<A>) => Vector<A> {
  return (as) => slice_(as, from, to)
}

/**
 * Returns true if and only if there exists an element in the Vector for
 * which the predicate returns true.
 *
 * @complexity O(n)
 */
export function exists_<A>(as: Vector<A>, predicate: Predicate<A>): boolean {
  return foldlCb<A, PredState>(someCb, { predicate, result: false }, as).result
}

/**
 * Returns true if and only if there exists an element in the Vector for
 * which the predicate returns true.
 *
 * @complexity O(n)
 * @dataFirst exists_
 */
export function exists<A>(predicate: Predicate<A>): (as: Vector<A>) => boolean {
  return (as) => exists_(as, predicate)
}

/**
 * Sort the given Vector by comparing values using the given Ord instance
 *
 * @complexity O(n * log(n))
 */
export function sort<B>(O: P.Ord<B>): <A extends B>(as: Vector<A>) => Vector<A> {
  return (as) => sortWith_(as, O.compare_)
}

/**
 * Sort the given Vector by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 */
export function sortWith_<A>(as: Vector<A>, compare: (a: A, b: A) => Ordering): Vector<A> {
  const arr: { idx: number, elm: A }[] = []
  let i = 0
  forEach_(as, (elm) => arr.push({ idx: i++, elm }))
  arr.sort(({ elm: a, idx: i }, { elm: b, idx: j }) => {
    const c = compare(a, b)
    return c !== 0 ? c : i < j ? -1 : 1
  })
  const newL = emptyPushable<A>()
  for (let i = 0; i < arr.length; ++i) {
    push(arr[i].elm, newL)
  }
  return newL
}

/**
 * Sort the given Vector by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 * @dataFirst sortWith_
 */
export function sortWith<A>(compare: (a: A, b: A) => Ordering): (as: Vector<A>) => Vector<A> {
  return (as) => sortWith_(as, compare)
}

/**
 * Splits a Vector at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 */
export function splitAt_<A>(as: Vector<A>, index: number): [Vector<A>, Vector<A>] {
  return [slice_(as, 0, index), slice_(as, index, as.length)]
}

/**
 * Splits a Vector at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 * @dataFirst splitAt_
 */
export function splitAt(index: number): <A>(as: Vector<A>) => [Vector<A>, Vector<A>] {
  return (as) => splitAt_(as, index)
}

/**
 * Splits a Vector at the first element in the Vector for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 */
export function splitWhen_<A>(as: Vector<A>, predicate: Predicate<A>): [Vector<A>, Vector<A>] {
  const idx = findIndex_(as, predicate)
  return idx === -1 ? [as, empty()] : splitAt_(as, idx)
}

/**
 * Splits a Vector at the first element in the Vector for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 * @dataFirst splitWhen_
 */
export function splitWhen<A>(predicate: Predicate<A>): (as: Vector<A>) => [Vector<A>, Vector<A>] {
  return (as) => splitWhen_(as, predicate)
}

/**
 * Returns a new Vector with the first element removed. If the Vector is
 * empty the empty Vector is returned.
 *
 * @complexity `O(1)`
 */
export function tail<A>(as: Vector<A>): Vector<A> {
  return slice_(as, 1, as.length)
}

/**
 * Takes the first `n` elements from a Vector and returns them in a new Vector.
 *
 * @complexity `O(log(n))`
 */
export function take_<A>(as: Vector<A>, n: number): Vector<A> {
  return slice_(as, 0, n)
}

/**
 * Takes the first `n` elements from a Vector and returns them in a new Vector.
 *
 * @complexity `O(log(n))`
 * @dataFirst take_
 */
export function take(n: number): <A>(as: Vector<A>) => Vector<A> {
  return (as) => take_(as, n)
}

/**
 * Takes the first elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 */
export function takeWhile_<A>(as: Vector<A>, predicate: Predicate<A>): Vector<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate, index: 0 }, as)
  return slice_(as, 0, index)
}

/**
 * Takes the first elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 * @dataFirst takeWhile_
 */
export function takeWhile<A>(predicate: Predicate<A>): (as: Vector<A>) => Vector<A> {
  return (as) => takeWhile_(as, predicate)
}

/**
 * Takes the last elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 */
export function takeLastWhile_<A>(as: Vector<A>, predicate: Predicate<A>): Vector<A> {
  const { index } = foldrCb(findNotIndexCb, { predicate, index: 0 }, as)
  return slice_(as, as.length - index, as.length)
}

/**
 * Takes the last elements in the Vector for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @dataFirst takeLastWhile_
 */
export function takeLastWhile<A>(predicate: Predicate<A>): (as: Vector<A>) => Vector<A> {
  return (as) => takeLastWhile_(as, predicate)
}

/**
 * Takes the last `n` elements from a Vector and returns them in a new
 * Vector.
 *
 * @complexity `O(log(n))`
 */
export function takeLast_<A>(as: Vector<A>, n: number): Vector<A> {
  return slice_(as, as.length - n, as.length)
}

/**
 * Takes the last `n` elements from a Vector and returns them in a new
 * Vector.
 *
 * @complexity `O(log(n))`
 * @dataFirst takeLast_
 */
export function takeLast<A>(n: number): (as: Vector<A>) => Vector<A> {
  return (as) => takeLast_(as, n)
}

/**
 * Returns a Vector that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given Vector is returned unchanged.
 *
 * @complexity O(log(n))
 */
export function updateAt_<A>(as: Vector<A>, i: number, a: A): Vector<A> {
  if (i < 0 || as.length <= i) {
    return as
  }
  const prefixSize = getPrefixSize(as)
  const suffixSize = getSuffixSize(as)
  const newVector  = mutableClone(as)
  if (i < prefixSize) {
    const newPrefix                     = copyArray(newVector.prefix)
    newPrefix[newPrefix.length - i - 1] = a
    newVector.prefix                    = newPrefix
  } else if (i >= as.length - suffixSize) {
    const newSuffix = copyArray(newVector.suffix)
    newSuffix[i - (as.length - suffixSize)] = a
    newVector.suffix = newSuffix
  } else {
    newVector.root = updateNode(as.root!, getDepth(as), i - prefixSize, as.offset, a)
  }
  return newVector
}

/**
 * Returns a Vector that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given Vector is returned unchanged.
 *
 * @complexity O(log(n))
 * @dataFirst updateAt_
 */
export function updateAt<A>(i: number, a: A): (as: Vector<A>) => Vector<A> {
  return (as) => updateAt_(as, i, a)
}

/**
 * Returns a new Vector without repeated elements by using the given
 * Eq instance to determine when elements are equal
 *
 * @complexity `O(n)`
 */
export function uniq<A>(E: P.Eq<A>): (as: Vector<A>) => Vector<A> {
  return (as) => dropRepeatsWith_(as, E.equals_)
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFind_<A>(as: Vector<A>, predicate: Predicate<A>): A | undefined {
  return foldlCb<A, PredState>(findCb, { predicate, result: undefined }, as).result
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @dataFirst unsafeFind_
 */
export function unsafeFind<A>(predicate: Predicate<A>): (as: Vector<A>) => A | undefined {
  return (as) => unsafeFind_(as, predicate)
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 */
export function unsafeFindLast_<A>(as: Vector<A>, predicate: Predicate<A>): A | undefined {
  return foldrCb<A, PredState>(findCb, { predicate, result: undefined }, as).result
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @dataFirst unsafeFindLast_
 */
export function unsafeFindLast<A>(predicate: Predicate<A>): (as: Vector<A>) => A | undefined {
  return (as) => unsafeFindLast_(as, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Align = P.Align<VectorF>({
  map_,
  alignWith_,
  align_,
  nil: empty
})

export const Functor = P.Functor<VectorF>({
  map_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<VectorF>({
  map_,
  cross_,
  crossWith_
})

export const Apply = P.Apply<VectorF>({
  map_,
  cross_,
  crossWith_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<VectorF>({
  map_,
  cross_,
  crossWith_,
  unit
})

export const Applicative = P.Applicative<VectorF>({
  map_,
  cross_,
  crossWith_,
  ap_,
  pure,
  unit
})

export const Zip = P.Zip<VectorF>({
  zipWith_,
  zip_
})

export const Alt = P.Alt<VectorF>({
  map_,
  alt_
})

export const Alternative = P.Alternative<VectorF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  alt_,
  nil: empty
})

export const Compactable = HKT.instance<P.Compactable<VectorF>>({
  compact,
  separate
})

export const Filterable = P.Filterable<VectorF>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const Foldable = P.Foldable<VectorF>({
  foldl_,
  foldr_,
  foldMap_
})

export const Monad = P.Monad<VectorF>({
  map_,
  crossWith_,
  cross_,
  ap_,
  pure,
  unit,
  chain_,
  flatten
})

export const Traversable = P.Traversable<VectorF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export const mapAccumM_ = P.getMapAccumM_(Traversable)
/**
 * @dataFirst mapAccumM_
 */
export const mapAccumM = P.getMapAccumM(Traversable)

export const Witherable = P.Witherable<VectorF>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  traverse_,
  wither_,
  wilt_
})

export const Unfolable = HKT.instance<P.Unfoldable<VectorF>>({
  unfold
})

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @internal
 */
abstract class VectorIterator<A> implements Iterator<A> {
  stack: any[][] | undefined
  indices: number[] | undefined
  idx: number
  prefixSize: number
  middleSize: number
  result: IteratorResult<A> = { done: false, value: undefined as any }
  constructor(protected l: Vector<A>, direction: 1 | -1) {
    this.idx        = direction === 1 ? -1 : l.length
    this.prefixSize = getPrefixSize(l)
    this.middleSize = l.length - getSuffixSize(l)
    if (l.root !== undefined) {
      const depth     = getDepth(l)
      this.stack      = new Array(depth + 1)
      this.indices    = new Array(depth + 1)
      let currentNode = l.root.array
      for (let i = depth; 0 <= i; --i) {
        this.stack[i]   = currentNode
        const idx       = direction === 1 ? 0 : currentNode.length - 1
        this.indices[i] = idx
        currentNode     = currentNode[idx].array
      }
      this.indices[0] -= direction
    }
  }
  abstract next(): IteratorResult<A>
}

/**
 * @internal
 */
class ForwardVectorIterator<A> extends VectorIterator<A> {
  constructor(l: Vector<A>) {
    super(l, 1)
  }
  nextInTree(): void {
    for (var i = 0; ++this.indices![i] === this.stack![i].length; ++i) {
      this.indices![i] = 0
    }
    for (; 0 < i; --i) {
      this.stack![i - 1] = this.stack![i][this.indices![i]].array
    }
  }
  next(): IteratorResult<A> {
    let newVal
    const idx = ++this.idx
    if (idx < this.prefixSize) {
      newVal = this.l.prefix[this.prefixSize - idx - 1]
    } else if (idx < this.middleSize) {
      this.nextInTree()
      newVal = this.stack![0][this.indices![0]]
    } else if (idx < this.l.length) {
      newVal = this.l.suffix[idx - this.middleSize]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}

/**
 * @internal
 */
class BackwardVectorIterator<A> extends VectorIterator<A> {
  constructor(l: Vector<A>) {
    super(l, -1)
  }
  prevInTree(): void {
    for (var i = 0; this.indices![i] === 0; ++i) {
      //
    }
    --this.indices![i]
    for (; 0 < i; --i) {
      const n              = this.stack![i][this.indices![i]].array
      this.stack![i - 1]   = n
      this.indices![i - 1] = n.length - 1
    }
  }
  next(): IteratorResult<A> {
    let newVal
    const idx = --this.idx
    if (this.middleSize <= idx) {
      newVal = this.l.suffix[idx - this.middleSize]
    } else if (this.prefixSize <= idx) {
      this.prevInTree()
      newVal = this.stack![0][this.indices![0]]
    } else if (0 <= idx) {
      newVal = this.l.prefix[this.prefixSize - idx - 1]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}

/**
 * @internal
 */
const branchingFactor = 32

/**
 * @internal
 */
const branchBits = 5

/**
 * @internal
 */
const mask = 31

/**
 * @internal
 */
type Sizes = number[] | undefined

/** @internal */
class Node {
  constructor(public sizes: Sizes, public array: any[]) {}
}

/**
 * @internal
 */
function elementEquals(a: any, b: any): boolean {
  return a === b
}

/**
 * @internal
 */
function createPath(depth: number, value: any): any {
  let current = value
  for (let i = 0; i < depth; ++i) {
    current = new Node(undefined, [current])
  }
  return current
}

// Array Helpers

/**
 * @internal
 */
function copyArray(source: any[]): any[] {
  const array = []
  for (let i = 0; i < source.length; ++i) {
    array[i] = source[i]
  }
  return array
}

/**
 * @internal
 */
function pushElements<A>(source: A[], target: A[], offset: number, amount: number): void {
  for (let i = offset; i < offset + amount; ++i) {
    target.push(source[i])
  }
}

/**
 * @internal
 */
function copyIndices(source: any[], sourceStart: number, target: any[], targetStart: number, length: number): void {
  for (let i = 0; i < length; ++i) {
    target[targetStart + i] = source[sourceStart + i]
  }
}

/**
 * @internal
 */
function arrayPrepend<A>(value: A, array: A[]): A[] {
  const newLength = array.length + 1
  const result    = new Array(newLength)
  result[0]       = value
  for (let i = 1; i < newLength; ++i) {
    result[i] = array[i - 1]
  }
  return result
}

/**
 * Create a reverse _copy_ of an array.
 * @internal
 */
function reverseArray<A>(array: A[]): A[] {
  return array.slice().reverse()
}

/**
 * @internal
 */
function arrayFirst<A>(array: A[]): A {
  return array[0]
}

/**
 * @internal
 */
function arrayLast<A>(array: A[]): A {
  return array[array.length - 1]
}

const pathResult = { path: 0, index: 0, updatedOffset: 0 }
type PathResult = typeof pathResult

/**
 * @internal
 */
function getPath(index: number, offset: number, depth: number, sizes: Sizes): PathResult {
  let i = index
  if (sizes === undefined && offset !== 0) {
    pathResult.updatedOffset = 0
    i = handleOffset(depth, offset, i)
  }
  let path = (i >> (depth * branchBits)) & mask
  if (sizes !== undefined) {
    while (sizes[path] <= i) {
      path++
    }
    const traversed = path === 0 ? 0 : sizes[path - 1]
    i              -= traversed
    pathResult.updatedOffset = offset
  }
  pathResult.path  = path
  pathResult.index = i
  return pathResult
}

/**
 * @internal
 */
function updateNode(node: Node, depth: number, index: number, offset: number, value: any): Node {
  const { path, index: newIndex, updatedOffset } = getPath(index, offset, depth, node.sizes)

  const array = copyArray(node.array)
  array[path] = depth > 0 ? updateNode(array[path], depth - 1, newIndex, updatedOffset, value) : value
  return new Node(node.sizes, array)
}

/**
 * @internal
 */
function cloneNode({ sizes, array }: Node): Node {
  return new Node(sizes === undefined ? undefined : copyArray(sizes), copyArray(array))
}

// This array should not be mutated. Thus a dummy element is placed in
// it. Thus the affix will not be owned and thus not mutated.

/**
 * @internal
 */
const emptyAffix: any[] = [0]

// We store a bit field in Vector. From right to left, the first five
// bits are suffix length, the next five are prefix length and the
// rest is depth. The functions below are for working with the bits in
// a sane way.

/**
 * @internal
 */
const affixBits = 6

/**
 * @internal
 */
const affixMask = 0b111111

/**
 * @internal
 */
function getSuffixSize(l: Vector<any>): number {
  return l.bits & affixMask
}

/**
 * @internal
 */
function getPrefixSize(l: Vector<any>): number {
  return (l.bits >> affixBits) & affixMask
}

/**
 * @internal
 */
function getDepth(l: Vector<any>): number {
  return l.bits >> (affixBits * 2)
}

/**
 * @internal
 */
function setPrefix(size: number, bits: number): number {
  return (size << affixBits) | (bits & ~(affixMask << affixBits))
}

/**
 * @internal
 */
function setSuffix(size: number, bits: number): number {
  return size | (bits & ~affixMask)
}

/**
 * @internal
 */
function setDepth(depth: number, bits: number): number {
  return (depth << (affixBits * 2)) | (bits & (affixMask | (affixMask << affixBits)))
}

/**
 * @internal
 */
function incrementPrefix(bits: number): number {
  return bits + (1 << affixBits)
}

/**
 * @internal
 */
function incrementSuffix(bits: number): number {
  return bits + 1
}

/**
 * @internal
 */
function incrementDepth(bits: number): number {
  return bits + (1 << (affixBits * 2))
}

/**
 * @internal
 */
function decrementDepth(bits: number): number {
  return bits - (1 << (affixBits * 2))
}

/**
 * Appends the value to the Vector by _mutating_ the Vector and its content.
 */
export function push<A>(value: A, l: MutableVector<A>): MutableVector<A> {
  const suffixSize = getSuffixSize(l)
  if (l.length === 0) {
    l.bits   = setPrefix(1, l.bits)
    l.prefix = [value]
  } else if (suffixSize < 32) {
    l.bits = incrementSuffix(l.bits)
    l.suffix.push(value)
  } else if (l.root === undefined) {
    l.root   = new Node(undefined, l.suffix)
    l.suffix = [value]
    l.bits   = setSuffix(1, l.bits)
  } else {
    const newNode = new Node(undefined, l.suffix)
    const index   = l.length - 1 - 32 + 1
    let current   = l.root!
    let depth     = getDepth(l)
    l.suffix      = [value]
    l.bits        = setSuffix(1, l.bits)
    if (index - 1 < branchingFactor ** (depth + 1)) {
      for (; depth >= 0; --depth) {
        const path = (index >> (depth * branchBits)) & mask
        if (path < current.array.length) {
          current = current.array[path]
        } else {
          current.array.push(createPath(depth - 1, newNode))
          break
        }
      }
    } else {
      l.bits = incrementDepth(l.bits)
      l.root = new Node(undefined, [l.root, createPath(depth, newNode)])
    }
  }
  l.length++
  return l
}

/**
 * @internal
 */
function nodeNthDense(node: Node, depth: number, index: number): any {
  let current = node
  // eslint-disable-next-line no-param-reassign
  for (; depth >= 0; --depth) {
    current = current.array[(index >> (depth * branchBits)) & mask]
  }
  return current
}

/**
 * @internal
 */
function handleOffset(depth: number, offset: number, index: number): number {
  let i = index
  i    += offset
  // eslint-disable-next-line no-param-reassign
  for (; depth >= 0; --depth) {
    i = index - (offset & (mask << (depth * branchBits)))
    if (((index >> (depth * branchBits)) & mask) !== 0) {
      break
    }
  }
  return i
}

/**
 * @internal
 */
function nodeNth(node: Node, depth: number, offset: number, index: number): any {
  let path
  let current = node
  let i       = index
  let ofs     = offset
  let dep     = depth
  while (current.sizes !== undefined) {
    path = (i >> (dep * branchBits)) & mask
    while (current.sizes[path] <= i) {
      path++
    }
    if (path !== 0) {
      i  -= current.sizes[path - 1]
      ofs = 0 // Offset is discarded if the left spine isn't traversed
    }
    dep--
    current = current.array[path]
  }
  return nodeNthDense(current, dep, ofs === 0 ? i : handleOffset(dep, ofs, i))
}

/**
 * @internal
 */
function setSizes(node: Node, height: number): Node {
  let sum         = 0
  const sizeTable = []
  for (let i = 0; i < node.array.length; ++i) {
    sum         += sizeOfSubtree(node.array[i], height - 1)
    sizeTable[i] = sum
  }
  node.sizes = sizeTable
  return node
}

/**
 * Returns the number of elements stored in the node.
 *
 * @internal
 */
function sizeOfSubtree(node: Node, height: number): number {
  if (height !== 0) {
    if (node.sizes !== undefined) {
      return arrayLast(node.sizes)
    } else {
      // the node is leftwise dense so all all but the last child are full
      const lastSize = sizeOfSubtree(arrayLast(node.array), height - 1)
      return ((node.array.length - 1) << (height * branchBits)) + lastSize
    }
  } else {
    return node.array.length
  }
}

// prepend & append

/**
 * @internal
 */
function affixPush<A>(a: A, array: A[], length: number): A[] {
  if (array.length === length) {
    array.push(a)
    return array
  } else {
    const newArray: A[] = []
    copyIndices(array, 0, newArray, 0, length)
    newArray.push(a)
    return newArray
  }
}

/**
 * Traverses down the left edge of the tree and copies k nodes.
 * Returns the last copied node.
 *
 * @internal
 */
function copyLeft(l: MutableVector<any>, k: number): Node {
  let currentNode = cloneNode(l.root!) // copy root
  l.root          = currentNode // install copy of root

  for (let i = 1; i < k; ++i) {
    const index = 0 // go left
    if (currentNode.sizes !== undefined) {
      for (let i = 0; i < currentNode.sizes.length; ++i) {
        currentNode.sizes[i] += 32
      }
    }
    const newNode = cloneNode(currentNode.array[index])
    // Install the copied node
    currentNode.array[index] = newNode
    currentNode              = newNode
  }
  return currentNode
}

/**
 * Prepends an element to a node
 *
 * @internal
 */
function nodePrepend(value: any, size: number, node: Node): Node {
  const array = arrayPrepend(value, node.array)
  let sizes   = undefined
  if (node.sizes !== undefined) {
    sizes    = new Array(node.sizes.length + 1)
    sizes[0] = size
    for (let i = 0; i < node.sizes.length; ++i) {
      sizes[i + 1] = node.sizes[i] + size
    }
  }
  return new Node(sizes, array)
}

/**
 * Prepends a node to a tree. Either by shifting the nodes in the root
 * left or by increasing the height
 *
 * @internal
 */
function prependTopTree<A>(l: MutableVector<A>, depth: number, node: Node): number {
  let newOffset
  if (l.root!.array.length < branchingFactor) {
    // There is space in the root, there is never a size table in this
    // case
    newOffset = 32 ** depth - 32
    l.root    = new Node(undefined, arrayPrepend(createPath(depth - 1, node), l.root!.array))
  } else {
    // We need to create a new root
    l.bits      = incrementDepth(l.bits)
    const sizes = l.root!.sizes === undefined ? undefined : [32, arrayLast(l.root!.sizes!) + 32]
    newOffset   = depth === 0 ? 0 : 32 ** (depth + 1) - 32
    l.root      = new Node(sizes, [createPath(depth, node), l.root])
  }
  return newOffset
}

/**
 * Takes a Vector and a node tail. It then prepends the node to the tree
 * of the Vector.
 *
 * @internal
 */
function prependNodeToTree<A>(l: MutableVector<A>, array: A[]): Vector<A> {
  if (l.root === undefined) {
    if (getSuffixSize(l) === 0) {
      // ensure invariant 1
      l.bits   = setSuffix(array.length, l.bits)
      l.suffix = array
    } else {
      l.root = new Node(undefined, array)
    }
    return l
  } else {
    const node    = new Node(undefined, array)
    const depth   = getDepth(l)
    let newOffset = 0
    if (l.root.sizes === undefined) {
      if (l.offset !== 0) {
        newOffset = l.offset - branchingFactor
        l.root    = prependDense(l.root, depth, l.offset, node)
      } else {
        // in this case we can be sure that the is not room in the tree
        // for the new node
        newOffset = prependTopTree(l, depth, node)
      }
    } else {
      // represents how many nodes _with size-tables_ that we should copy.
      let copyableCount = 0
      // go down while there is size tables
      let nodesTraversed = 0
      let currentNode    = l.root
      while (currentNode.sizes !== undefined && nodesTraversed < depth) {
        ++nodesTraversed
        if (currentNode.array.length < 32) {
          // there is room if offset is > 0 or if the first node does not
          // contain as many nodes as it possibly can
          copyableCount = nodesTraversed
        }
        currentNode = currentNode.array[0]
      }
      if (l.offset !== 0) {
        const copiedNode = copyLeft(l, nodesTraversed)
        for (let i = 0; i < copiedNode.sizes!.length; ++i) {
          copiedNode.sizes![i] += branchingFactor
        }
        copiedNode.array[0] = prependDense(copiedNode.array[0], depth - nodesTraversed, l.offset, node)
        l.offset            = l.offset - branchingFactor
        return l
      } else {
        if (copyableCount === 0) {
          l.offset = prependTopTree(l, depth, node)
        } else {
          let parent: Node | undefined
          let prependableNode: Node
          // Copy the part of the path with size tables
          if (copyableCount > 1) {
            parent          = copyLeft(l, copyableCount - 1)
            prependableNode = parent.array[0]
          } else {
            parent          = undefined
            prependableNode = l.root!
          }
          const path = createPath(depth - copyableCount, node)
          // add offset
          l.offset        = 32 ** (depth - copyableCount + 1) - 32
          const prepended = nodePrepend(path, 32, prependableNode)
          if (parent === undefined) {
            l.root = prepended
          } else {
            parent.array[0] = prepended
          }
        }
        return l
      }
    }
    l.offset = newOffset
    return l
  }
}

/**
 * Prepends a node to a dense tree. The given `offset` is never zero.
 *
 * @internal
 */
function prependDense(node: Node, depth: number, offset: number, value: Node): Node {
  // We're indexing down `offset - 1`. At each step `path` is either 0 or -1.
  const curOffset = (offset >> (depth * branchBits)) & mask
  const path      = (((offset - 1) >> (depth * branchBits)) & mask) - curOffset
  if (path < 0) {
    return new Node(undefined, arrayPrepend(createPath(depth - 1, value), node.array))
  } else {
    const array = copyArray(node.array)
    array[0]    = prependDense(array[0], depth - 1, offset, value)
    return new Node(undefined, array)
  }
}

/**
 * Takes a RRB-tree and an affix. It then appends the node to the
 * tree.
 *
 * @internal
 */
function appendNodeToTree<A>(l: MutableVector<A>, array: A[]): MutableVector<A> {
  if (l.root === undefined) {
    // The old Vector has no content in tree, all content is in affixes
    if (getPrefixSize(l) === 0) {
      l.bits   = setPrefix(array.length, l.bits)
      l.prefix = reverseArray(array)
    } else {
      l.root = new Node(undefined, array)
    }
    return l
  }
  const depth      = getDepth(l)
  let index        = handleOffset(depth, l.offset, l.length - 1 - getPrefixSize(l))
  let nodesToCopy  = 0
  let nodesVisited = 0
  let shift        = depth * 5
  let currentNode  = l.root
  if (32 ** (depth + 1) < index) {
    shift        = 0 // there is no room
    nodesVisited = depth
  }
  while (shift > 5) {
    let childIndex: number
    if (currentNode.sizes === undefined) {
      // does not have size table
      childIndex = (index >> shift) & mask
      index     &= ~(mask << shift) // wipe just used bits
    } else {
      childIndex = currentNode.array.length - 1
      index     -= currentNode.sizes[childIndex - 1]
    }
    nodesVisited++
    if (childIndex < mask) {
      // we are not going down the far right path, this implies that
      // there is still room in the current node
      nodesToCopy = nodesVisited
    }
    currentNode = currentNode.array[childIndex]
    if (currentNode === undefined) {
      // This will only happened in a pvec subtree. The index does not
      // exist so we'll have to create a new path from here on.
      nodesToCopy = nodesVisited
      shift       = 5 // Set shift to break out of the while-loop
    }
    shift -= 5
  }

  if (shift !== 0) {
    nodesVisited++
    if (currentNode.array.length < branchingFactor) {
      // there is room in the found node
      nodesToCopy = nodesVisited
    }
  }

  const node = new Node(undefined, array)
  if (nodesToCopy === 0) {
    // there was no room in the found node
    const newPath = nodesVisited === 0 ? node : createPath(nodesVisited, node)
    const newRoot = new Node(undefined, [l.root, newPath])
    l.root        = newRoot
    l.bits        = incrementDepth(l.bits)
  } else {
    const copiedNode = copyFirstK(l, nodesToCopy, array.length)
    copiedNode.array.push(createPath(depth - nodesToCopy, node))
  }
  return l
}

/**
 * Traverses down the right edge of the tree and copies k nodes.
 *
 * @internal
 */
function copyFirstK(newVector: MutableVector<any>, k: number, leafSize: number): Node {
  let currentNode = cloneNode(newVector.root!) // copy root
  newVector.root  = currentNode // install root

  for (let i = 1; i < k; ++i) {
    const index = currentNode.array.length - 1
    if (currentNode.sizes !== undefined) {
      currentNode.sizes[index] += leafSize
    }
    const newNode = cloneNode(currentNode.array[index])
    // Install the copied node
    currentNode.array[index] = newNode
    currentNode              = newNode
  }
  if (currentNode.sizes !== undefined) {
    currentNode.sizes.push(arrayLast(currentNode.sizes) + leafSize)
  }
  return currentNode
}

const eMax = 2

/**
 * @internal
 */
function createConcatPlan(array: Node[]): number[] | undefined {
  const sizes = []
  let sum     = 0
  for (let i = 0; i < array.length; ++i) {
    sum     += array[i].array.length // FIXME: maybe only access array once
    sizes[i] = array[i].array.length
  }
  const optimalLength = Math.ceil(sum / branchingFactor)
  let n               = array.length
  let i               = 0
  if (optimalLength + eMax >= n) {
    return undefined // no rebalancing needed
  }
  while (optimalLength + eMax < n) {
    while (sizes[i] > branchingFactor - eMax / 2) {
      // Skip nodes that are already sufficiently balanced
      ++i
    }
    // the node at this index is too short
    let remaining = sizes[i] // number of elements to re-distribute
    do {
      const size = Math.min(remaining + sizes[i + 1], branchingFactor)
      sizes[i]   = size
      remaining  = remaining - (size - sizes[i + 1])
      ++i
    } while (remaining > 0)
    // Shift nodes after
    for (let j = i; j <= n - 1; ++j) {
      sizes[j] = sizes[j + 1]
    }
    --i
    --n
  }
  sizes.length = n
  return sizes
}

/**
 * Combines the children of three nodes into an array. The last child
 * of `left` and the first child of `right is ignored as they've been
 * concatenated into `center`.
 *
 * @internal
 */
function concatNodeMerge(left: Node | undefined, center: Node, right: Node | undefined): Node[] {
  const array = []
  if (left !== undefined) {
    for (let i = 0; i < left.array.length - 1; ++i) {
      array.push(left.array[i])
    }
  }
  for (let i = 0; i < center.array.length; ++i) {
    array.push(center.array[i])
  }
  if (right !== undefined) {
    for (let i = 1; i < right.array.length; ++i) {
      array.push(right.array[i])
    }
  }
  return array
}

/**
 * @internal
 */
function executeConcatPlan(merged: Node[], plan: number[], height: number): any[] {
  const result  = []
  let sourceIdx = 0 // the current node we're copying from
  let offset    = 0 // elements in source already used
  for (let toMove of plan) {
    let source = merged[sourceIdx].array
    if (toMove === source.length && offset === 0) {
      // source matches target exactly, reuse source
      result.push(merged[sourceIdx])
      ++sourceIdx
    } else {
      const node = new Node(undefined, [])
      while (toMove > 0) {
        const available   = source.length - offset
        const itemsToCopy = Math.min(toMove, available)
        pushElements(source, node.array, offset, itemsToCopy)
        if (toMove >= available) {
          ++sourceIdx
          source = merged[sourceIdx].array
          offset = 0
        } else {
          offset += itemsToCopy
        }
        toMove -= itemsToCopy
      }
      if (height > 1) {
        // Set sizes on children unless they are leaf nodes
        setSizes(node, height - 1)
      }
      result.push(node)
    }
  }
  return result
}

/**
 * Takes three nodes and returns a new node with the content of the
 * three nodes. Note: The returned node does not have its size table
 * set correctly. The caller must do that.
 *
 * @internal
 */
function rebalance(left: Node | undefined, center: Node, right: Node | undefined, height: number, top: boolean): Node {
  const merged   = concatNodeMerge(left, center, right)
  const plan     = createConcatPlan(merged)
  const balanced = plan !== undefined ? executeConcatPlan(merged, plan, height) : merged
  if (balanced.length <= branchingFactor) {
    if (top === true) {
      return new Node(undefined, balanced)
    } else {
      // Return a single node with extra height for balancing at next
      // level
      return new Node(undefined, [setSizes(new Node(undefined, balanced), height)])
    }
  } else {
    return new Node(undefined, [
      setSizes(new Node(undefined, balanced.slice(0, branchingFactor)), height),
      setSizes(new Node(undefined, balanced.slice(branchingFactor)), height)
    ])
  }
}

/**
 * @internal
 */
function concatSubTree<A>(left: Node, lDepth: number, right: Node, rDepth: number, isTop: boolean): Node {
  if (lDepth > rDepth) {
    const c = concatSubTree(arrayLast(left.array), lDepth - 1, right, rDepth, false)
    return rebalance(left, c, undefined, lDepth, isTop)
  } else if (lDepth < rDepth) {
    const c = concatSubTree(left, lDepth, arrayFirst(right.array), rDepth - 1, false)
    return rebalance(undefined, c, right, rDepth, isTop)
  } else if (lDepth === 0) {
    return new Node(undefined, [left, right])
  } else {
    const c = concatSubTree<A>(arrayLast(left.array), lDepth - 1, arrayFirst(right.array), rDepth - 1, false)
    return rebalance(left, c, right, lDepth, isTop)
  }
}

/**
 * @internal
 */
const concatBuffer = new Array(3)

/**
 * @internal
 */
function concatAffixes<A>(left: Vector<A>, right: Vector<A>): number {
  // TODO: Try and find a neat way to reduce the LOC here
  let nr           = 0
  let arrIdx       = 0
  let i            = 0
  let length       = getSuffixSize(left)
  concatBuffer[nr] = []
  for (i = 0; i < length; ++i) {
    concatBuffer[nr][arrIdx++] = left.suffix[i]
  }
  length = getPrefixSize(right)
  for (i = 0; i < length; ++i) {
    if (arrIdx === 32) {
      arrIdx = 0
      ++nr
      concatBuffer[nr] = []
    }
    concatBuffer[nr][arrIdx++] = right.prefix[length - 1 - i]
  }
  length = getSuffixSize(right)
  for (i = 0; i < length; ++i) {
    if (arrIdx === 32) {
      arrIdx = 0
      ++nr
      concatBuffer[nr] = []
    }
    concatBuffer[nr][arrIdx++] = right.suffix[i]
  }
  return nr
}

/**
 * @internal
 */
function getHeight(node: Node): number {
  if (node.array[0] instanceof Node) {
    return 1 + getHeight(node.array[0])
  } else {
    return 0
  }
}

/**
 * @internal
 */
let newAffix: any[]

// function getBitsForDepth(n: number, depth: number): number {
//   return n & ~(~0 << ((depth + 1) * branchBits));
// }

function sliceNode(
  node: Node,
  index: number,
  depth: number,
  pathLeft: number,
  pathRight: number,
  childLeft: Node | undefined,
  childRight: Node | undefined
): Node {
  const array = node.array.slice(pathLeft, pathRight + 1)
  if (childLeft !== undefined) {
    array[0] = childLeft
  }
  if (childRight !== undefined) {
    array[array.length - 1] = childRight
  }
  let sizes = node.sizes
  if (sizes !== undefined) {
    sizes             = sizes.slice(pathLeft, pathRight + 1)
    let slicedOffLeft = pathLeft !== 0 ? node.sizes![pathLeft - 1] : 0
    if (childLeft !== undefined) {
      // If the left child has been sliced into a new child we need to know
      // how many elements have been removed from the child.
      if (childLeft.sizes !== undefined) {
        // If the left child has a size table we can simply look at that.
        const oldChild: Node = node.array[pathLeft]
        slicedOffLeft       += arrayLast(oldChild.sizes!) - arrayLast(childLeft.sizes)
      } else {
        // If the left child does not have a size table we can
        // calculate how many elements have been removed from it by
        // looking at the index. Note that when we slice into a leaf
        // the leaf is moved up as a prefix. Thus slicing, for
        // instance, at index 20 will remove 32 elements from the
        // child. Similarly slicing at index 50 will remove 64
        // elements at slicing at 64 will remove 92 elements.
        slicedOffLeft += ((index - slicedOffLeft) & ~0b011111) + 32
      }
    }
    for (let i = 0; i < sizes.length; ++i) {
      sizes[i] -= slicedOffLeft
    }
    if (childRight !== undefined) {
      const slicedOffRight     = sizeOfSubtree(node.array[pathRight], depth - 1) - sizeOfSubtree(childRight, depth - 1)
      sizes[sizes.length - 1] -= slicedOffRight
    }
  }
  return new Node(sizes, array)
}

/**
 * @internal
 */
let newOffset = 0

function sliceLeft(tree: Node, depth: number, index: number, offset: number, top: boolean): Node | undefined {
  let { index: newIndex, path, updatedOffset } = getPath(index, offset, depth, tree.sizes)
  if (depth === 0) {
    newAffix = tree.array.slice(path).reverse()
    // This leaf node is moved up as a suffix so there is nothing here
    // after slicing
    return undefined
  } else {
    const child = sliceLeft(tree.array[path], depth - 1, newIndex, updatedOffset, false)
    if (child === undefined) {
      // There is nothing in the child after slicing so we don't include it
      ++path
      if (path === tree.array.length) {
        return undefined
      }
    }
    // If we've sliced something away and it's not a the root, update offset
    if (tree.sizes === undefined && top === false) {
      newOffset |= (32 - (tree.array.length - path)) << (depth * branchBits)
    }
    return sliceNode(tree, index, depth, path, tree.array.length - 1, child, undefined)
  }
}

/** Slice elements off of a tree from the right */
function sliceRight(node: Node, depth: number, index: number, offset: number): Node | undefined {
  let { index: newIndex, path } = getPath(index, offset, depth, node.sizes)
  if (depth === 0) {
    newAffix = node.array.slice(0, path + 1)
    // this leaf node is moved up as a suffix so there is nothing here
    // after slicing
    return undefined
  } else {
    // slice the child, note that we subtract 1 then the radix lookup
    // algorithm can find the last element that we want to include
    // and sliceRight will do a slice that is inclusive on the index.
    const child = sliceRight(node.array[path], depth - 1, newIndex, path === 0 ? offset : 0)
    if (child === undefined) {
      // there is nothing in the child after slicing so we don't include it
      --path
      if (path === -1) {
        return undefined
      }
    }
    // note that we add 1 to the path since we want the slice to be
    // inclusive on the end index. Only at the leaf level do we want
    // to do an exclusive slice.
    const array = node.array.slice(0, path + 1)
    if (child !== undefined) {
      array[array.length - 1] = child
    }
    let sizes: Sizes | undefined = node.sizes
    if (sizes !== undefined) {
      sizes = sizes.slice(0, path + 1)
      if (child !== undefined) {
        const slicedOff          = sizeOfSubtree(node.array[path], depth - 1) - sizeOfSubtree(child, depth - 1)
        sizes[sizes.length - 1] -= slicedOff
      }
    }
    return new Node(sizes, array)
  }
}

function sliceTreeVector<A>(
  from: number,
  to: number,
  tree: Node,
  depth: number,
  offset: number,
  l: MutableVector<A>
): Vector<A> {
  const sizes = tree.sizes
  let { index: newFrom, path: pathLeft } = getPath(from, offset, depth, sizes)
  let { index: newTo, path: pathRight }  = getPath(to, offset, depth, sizes)
  if (depth === 0) {
    // we are slicing a piece off a leaf node
    l.prefix = emptyAffix
    l.suffix = tree.array.slice(pathLeft, pathRight + 1)
    l.root   = undefined
    l.bits   = setSuffix(pathRight - pathLeft + 1, 0)
    return l
  } else if (pathLeft === pathRight) {
    // Both ends are located in the same subtree, this means that we
    // can reduce the height
    l.bits = decrementDepth(l.bits)
    return sliceTreeVector(newFrom, newTo, tree.array[pathLeft], depth - 1, pathLeft === 0 ? offset : 0, l)
  } else {
    const childRight = sliceRight(tree.array[pathRight], depth - 1, newTo, 0)
    l.bits           = setSuffix(newAffix.length, l.bits)
    l.suffix         = newAffix
    if (childRight === undefined) {
      --pathRight
    }
    newOffset = 0

    const childLeft = sliceLeft(
      tree.array[pathLeft],
      depth - 1,
      newFrom,
      pathLeft === 0 ? offset : 0,
      pathLeft === pathRight
    )
    l.offset = newOffset
    l.bits   = setPrefix(newAffix.length, l.bits)
    l.prefix = newAffix

    if (childLeft === undefined) {
      ++pathLeft
    }
    if (pathLeft >= pathRight) {
      if (pathLeft > pathRight) {
        // This only happens when `pathLeft` originally was equal to
        // `pathRight + 1` and `childLeft === childRight === undefined`.
        // In this case there is no tree left.
        l.bits = setDepth(0, l.bits)
        l.root = undefined
      } else {
        // Height can be reduced
        l.bits        = decrementDepth(l.bits)
        const newRoot =
          childRight !== undefined ? childRight : childLeft !== undefined ? childLeft : tree.array[pathLeft]
        l.root = new Node(newRoot.sizes, newRoot.array) // Is this size handling good enough?
      }
    } else {
      l.root = sliceNode(tree, from, depth, pathLeft, pathRight, childLeft, childRight)
    }
    return l
  }
}

/**
 * @internal
 */
function zeroOffset(): void {
  newOffset = 0
}

type FoldCb<Input, State> = (input: Input, state: State, index: number) => boolean

function foldlArrayCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  array: A[],
  from: number,
  to: number,
  offset: number
): [boolean, number] {
  for (var i = from; i < to && cb(array[i], state, i + offset); ++i) {
    //
  }
  return [i === to, i + offset + 1]
}

function foldrArrayCb<A, B>(
  cb: FoldCb<A, B>,
  state: B,
  array: A[],
  from: number,
  to: number,
  offset: number
): [boolean, number] {
  // eslint-disable-next-line no-param-reassign
  for (var i = from - 1; to <= i && cb(array[i], state, offset); --i, offset--) {
    //
  }
  return [i === to - 1, offset]
}

function foldlNodeCb<A, B>(cb: FoldCb<A, B>, state: B, node: Node, depth: number, offset: number): [boolean, number] {
  const { array } = node
  if (depth === 0) {
    return foldlArrayCb(cb, state, array, 0, array.length, offset)
  }
  const to = array.length
  let j    = offset
  let cont
  for (let i = 0; i < to; ++i) {
    [cont, j] = foldlNodeCb(cb, state, array[i], depth - 1, j)
    if (!cont) {
      return [false, j]
    }
  }
  return [true, j]
}

/**
 * This function is a lot like a fold. But the reducer function is
 * supposed to mutate its state instead of returning it. Instead of
 * returning a new state it returns a boolean that tells wether or not
 * to continue the fold. `true` indicates that the folding should
 * continue.
 */
function foldlCb<A, B>(cb: FoldCb<A, B>, state: B, l: Vector<A>): B {
  const prefixSize = getPrefixSize(l)
  let i            = prefixSize - 1
  let cont         = true
  ;[cont, i] = foldrArrayCb(cb, state, l.prefix, prefixSize, 0, i)
  if (!cont) {
    return state
  }
  i = prefixSize
  if (l.root !== undefined) {
    [cont, i] = foldlNodeCb(cb, state, l.root, getDepth(l), i)
    if (!cont) {
      return state
    }
  }
  const suffixSize = getSuffixSize(l)
  foldlArrayCb(cb, state, l.suffix, 0, suffixSize, i)
  return state
}

function foldrNodeCb<A, B>(cb: FoldCb<A, B>, state: B, node: Node, depth: number, offset: number): [boolean, number] {
  const { array } = node
  if (depth === 0) {
    return foldrArrayCb(cb, state, array, array.length, 0, offset)
  }
  let j = offset
  let cont
  for (let i = array.length - 1; 0 <= i; --i) {
    [cont, j] = foldrNodeCb(cb, state, array[i], depth - 1, j)
    if (!cont) {
      return [false, j]
    }
  }
  return [true, j]
}

function foldrCb<A, B>(cb: FoldCb<A, B>, state: B, l: Vector<A>): B {
  const suffixSize = getSuffixSize(l)
  const prefixSize = getPrefixSize(l)
  let i            = l.length - 1
  let cont         = true
  ;[cont, i] = foldrArrayCb(cb, state, l.suffix, suffixSize, 0, i)
  if (!cont) {
    return state
  }
  if (l.root !== undefined) {
    [cont, i] = foldrNodeCb(cb, state, l.root, getDepth(l), i)
    if (!cont) {
      return state
    }
  }
  const prefix = l.prefix
  foldlArrayCb(cb, state, l.prefix, prefix.length - prefixSize, prefix.length, prefix.length - 1)
  return state
}

function foldlPrefix<A, B>(f: (i: number, b: B, a: A) => B, b: B, array: A[], length: number): [B, number] {
  let acc = b
  let j   = 0
  for (let i = length - 1; 0 <= i; --i, j++) {
    acc = f(j, acc, array[i])
  }
  return [acc, j]
}

function foldlNode<A, B>(
  f: (i: number, b: B, a: A) => B,
  b: B,
  node: Node,
  depth: number,
  offset: number
): [B, number] {
  const { array } = node
  let acc         = b
  let j           = offset
  if (depth === 0) {
    return foldlSuffix(f, b, array, array.length, offset)
  }
  for (let i = 0; i < array.length; ++i) {
    [acc, j] = foldlNode(f, acc, array[i], depth - 1, j)
  }
  return [acc, j]
}

function foldlSuffix<A, B>(
  f: (i: number, b: B, a: A) => B,
  b: B,
  array: A[],
  length: number,
  offset: number
): [B, number] {
  let acc = b
  let j   = offset
  for (let i = 0; i < length; ++i, j++) {
    acc = f(j, acc, array[i])
  }
  return [acc, j]
}

function foldrPrefix<A, B>(
  f: (i: number, a: A, b: B) => B,
  b: B,
  array: A[],
  length: number,
  offset: number
): [B, number] {
  let acc = b
  let j   = offset
  for (let i = 0; i < length; ++i, j--) {
    acc = f(j, array[i], acc)
  }
  return [acc, j]
}

function foldrNode<A, B>(
  f: (i: number, a: A, b: B) => B,
  b: B,
  node: Node,
  depth: number,
  offset: number
): [B, number] {
  const { array } = node
  let acc         = b
  let j           = offset
  if (depth === 0) {
    return foldrSuffix(f, b, array, array.length, offset)
  }
  for (let i = array.length - 1; 0 <= i; --i) {
    [acc, j] = foldrNode(f, acc, array[i], depth - 1, j)
  }
  return [acc, j]
}

function foldrSuffix<A, B>(
  f: (i: number, a: A, b: B) => B,
  b: B,
  array: A[],
  length: number,
  offset: number
): [B, number] {
  let acc = b
  let j   = offset
  for (let i = length - 1; 0 <= i; --i, j--) {
    acc = f(j, array[i], acc)
  }
  return [acc, j]
}

function mapArray<A, B>(f: (i: number, a: A) => B, array: A[], offset: number): [B[], number] {
  const result = new Array(array.length)
  for (let i = 0; i < array.length; ++i) {
    result[i] = f(offset + i, array[i])
  }
  return [result, offset + array.length]
}

function mapNode<A, B>(
  f: (i: number, a: A) => B,
  node: Node,
  depth: number,
  offset: number,
  adjust: number
): [Node, number] {
  if (depth !== 0) {
    const { array } = node
    var innerOffset = offset
    const result    = new Array(array.length)
    for (let i = 0; i < array.length; ++i) {
      let [res, newOffset] = mapNode(f, array[i], depth - 1, innerOffset, adjust * 32)
      innerOffset          = newOffset
      result[i]            = res
    }
    return [new Node(node.sizes, result), innerOffset]
  } else {
    let [res, newOffset] = mapArray(f, node.array, offset)
    return [new Node(undefined, res), newOffset]
  }
}

function mapPrefix<A, B>(f: (i: number, a: A) => B, prefix: A[], length: number): B[] {
  const newPrefix = new Array(length)
  for (let i = length - 1; 0 <= i; --i) {
    newPrefix[i] = f(length - 1 - i, prefix[i])
  }
  return newPrefix
}

function mapAffix<A, B>(f: (i: number, a: A) => B, suffix: A[], length: number, totalLength: number): B[] {
  const priorLength = totalLength - length
  const newSuffix   = new Array(length)
  for (let i = 0; i < length; ++i) {
    newSuffix[i] = f(priorLength + i, suffix[i])
  }
  return newSuffix
}

// functions based on foldlCb

type FoldWhileState<A, B> = {
  predicate: Predicate<B>
  result: B
  f: (b: B, a: A, i: number) => B
}

/**
 * Similar to `foldl`. But, for each element it calls the predicate function
 * _before_ the folding function and stops folding if it returns `false`.
 *
 * @category Folds
 * @example
 * const isOdd = (_acc:, x) => x % 2 === 1;
 *
 * const xs = V.vector(1, 3, 5, 60, 777, 800);
 * foldlWhile(isOdd, (n, m) => n + m, 0, xs) //=> 9
 *
 * const ys = V.vector(2, 4, 6);
 * foldlWhile(isOdd, (n, m) => n + m, 111, ys) //=> 111
 */
function foldWhileCb<A, B>(a: A, state: FoldWhileState<A, B>, i: number): boolean {
  if (state.predicate(state.result) === false) {
    return false
  }
  state.result = state.f(state.result, a, i)
  return true
}

type PredState = {
  predicate: (a: any) => boolean
  result: any
}

function everyCb<A>(value: A, state: any): boolean {
  return (state.result = state.predicate(value))
}

function someCb<A>(value: A, state: any): boolean {
  return !(state.result = state.predicate(value))
}

function findCb<A>(value: A, state: PredState): boolean {
  if (state.predicate(value)) {
    state.result = value
    return false
  } else {
    return true
  }
}

type IndexOfState = {
  element: any
  found: boolean
  index: number
}

function indexOfCb(value: any, state: IndexOfState): boolean {
  ++state.index
  return !(state.found = elementEquals(value, state.element))
}

type FindIndexState = {
  predicate: (a: any) => boolean
  found: boolean
  index: number
}

function findIndexCb<A>(value: A, state: FindIndexState): boolean {
  ++state.index
  return !(state.found = state.predicate(value))
}

type ContainsState = {
  element: any
  result: boolean
}

const containsState: ContainsState = {
  element: undefined,
  result: false
}

function containsCb(value: any, state: ContainsState): boolean {
  return !(state.result = value === state.element)
}

type ElemState = {
  element: any
  equals: (x: any, y: any) => boolean
  result: boolean
}

function elemCb(value: any, state: ElemState): boolean {
  return !(state.result = state.equals(value, state.element))
}

type EqualsState<A, B> = {
  iterator: Iterator<B>
  f: (a: A, b: B) => boolean
  equals: boolean
}

function equalsCb<A, B>(a: A, state: EqualsState<A, B>): boolean {
  const { value } = state.iterator.next()
  return (state.equals = state.f(a, value))
}

type FindNotIndexState = {
  predicate: (a: any) => boolean
  index: number
}

function findNotIndexCb(value: any, state: FindNotIndexState): boolean {
  if (state.predicate(value)) {
    ++state.index
    return true
  } else {
    return false
  }
}

function arrayPush<A>(array: A[], a: A): A[] {
  array.push(a)
  return array
}
