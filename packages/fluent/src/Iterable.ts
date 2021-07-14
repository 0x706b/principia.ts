import type { Either } from '@principia/base/Either'
import type { Eval } from '@principia/base/Eval'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type {
  Applicative,
  Monoid,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

declare global {
  export interface Iterable<T> {
    /**
     * @rewrite append_ from "@principia/base/Iterable"
     */
    append(a: T): Iterable<T>

    /**
     * @rewrite chain_ from "@principia/base/Iterable"
     */
    chain<B>(f: (a: T) => Iterable<B>): Iterable<B>

    /**
     * @rewrite concat_ from "@principia/base/Iterable"
     */
    concat(that: Iterable<T>): Iterable<T>

    /**
     * @rewrite corresponds from "@principia/base/Iterable"
     */
    corresponds<B>(that: Iterable<B>, f: (a: T, b: B) => boolean): boolean

    /**
     * @rewrite cross_ from "@principia/base/Iterable"
     */
    cross<B>(that: Iterable<B>): Iterable<readonly [T, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Iterable"
     */
    crossWith<B, C>(that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>

    /**
     * @rewrite every_ from "@principia/base/Iterable"
     */
    every<B extends T>(refinement: Refinement<T, B>): this is Iterable<B>

    /**
     * @rewrite every_ from "@principia/base/Iterable"
     */
    every(predicate: Predicate<T>): boolean

    /**
     * @rewrite filter_ from "@principia/base/Iterable"
     */
    filter(predicate: Predicate<T>): Iterable<T>

    /**
     * @rewrite filter_ from "@principia/base/Iterable"
     */
    filter<B extends T>(refinement: Refinement<T, B>): Iterable<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Iterable"
     */
    filterMap<B>(f: (a: T) => Option<B>): Iterable<B>

    /**
     * @rewrite findFirst_ from "@principia/base/Iterable"
     */
    findFirst<B extends T>(refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite findFirst_ from "@principia/base/Iterable"
     */
    findFirst(predicte: Predicate<T>): Option<T>

    /**
     * @rewriteConstraint foldMap_ from "@principia/base/Iterable"
     */
    foldMap<M>(M: Monoid<M>): (f: (a: T) => M) => M

    /**
     * @rewrite foldl_ from "@principia/base/Iterable"
     */
    foldl<B>(b: B, f: (b: B, a: T) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Iterable"
     */
    foldr<B>(b: Eval<B>, f: (a: T, b: Eval<B>) => Eval<B>): Eval<B>

    /**
     * @rewrite ievery_ from "@principia/base/Iterable"
     */
    ievery<B extends T>(refinement: RefinementWithIndex<number, T, B>): this is Iterable<B>

    /**
     * @rewrite ievery_ from "@principia/base/Iterable"
     */
    ievery(predicate: PredicateWithIndex<number, T>): boolean

    /**
     * @rewrite ifilter_ from "@principia/base/Iterable"
     */
    ifilter(predicate: PredicateWithIndex<number, T>): Iterable<T>

    /**
     * @rewrite ifilter_ from "@principia/base/Iterable"
     */
    ifilter<B extends T>(refinement: RefinementWithIndex<number, T, B>): Iterable<B>

    /**
     * @rewrite ifilterMap_ from "@principia/base/Iterable"
     */
    ifilterMap<B>(f: (i: number, a: T) => Option<B>): Iterable<B>

    /**
     * @rewriteConstraint ifoldMap_ from "@principia/base/Iterable"
     */
    ifoldMap<M>(M: Monoid<M>): (f: (i: number, a: T) => M) => M

    /**
     * @rewrite ifoldl_ from "@principia/base/Iterable"
     */
    ifoldl<B>(b: B, f: (b: B, i: number, a: T) => B): B

    /**
     * @rewrite ifoldr_ from "@principia/base/Iterable"
     */
    ifoldr<B>(b: Eval<B>, f: (a: T, i: number, b: Eval<B>) => Eval<B>): Eval<B>

    /**
     * @rewrite imap_ from "@principia/base/Iterable"
     */
    imap<B>(f: (i: number, a: T) => B): Iterable<B>

    /**
     * @rewriteConstraint imapA_ from "@principia/base/Iterable"
     */
    imapA<F extends HKT.URIS, C>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

    /**
     * @rewrite ipartition_ from "@principia/base/Iterable"
     */
    ipartition(refinement: PredicateWithIndex<number, T>): readonly [Iterable<T>, Iterable<T>]

    /**
     * @rewrite ipartition_ from "@principia/base/Iterable"
     */
    ipartition<B extends T>(refinement: RefinementWithIndex<number, T, B>): readonly [Iterable<T>, Iterable<B>]

    /**
     * @rewrite ipartitionMap_ from "@principia/base/Iterable"
     */
    ipartitionMap<B, C>(f: (i: number, a: T) => Either<B, C>): readonly [Iterable<B>, Iterable<C>]

    /**
     * @rewrite map_ from "@principia/base/Iterable"
     */
    map<B>(f: (a: T) => B): Iterable<B>

    /**
     * @rewriteConstraint mapA_ from "@principia/base/Iterable"
     */
    mapA<F extends HKT.URIS, C>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

    /**
     * @rewrite partition_ from "@principia/base/Iterable"
     */
    partition<B extends T>(refinement: Refinement<T, B>): readonly [Iterable<T>, Iterable<B>]

    /**
     * @rewrite partition_ from "@principia/base/Iterable"
     */
    partition(refinement: Predicate<T>): readonly [Iterable<T>, Iterable<T>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Iterable"
     */
    partitionMap<B, C>(f: (a: T) => Either<B, C>): readonly [Iterable<B>, Iterable<C>]
    /**
     * @rewrite prepend_ from "@principia/base/Iterable"
     */
    prepend(a: T): Iterable<T>

    /**
     * @rewrite take_ from "@principia/base/Iterable"
     */
    take(n: number): Iterable<T>

    /**
     * @rewrite toArray from "@principia/base/Iterable"
     */
    toArray(): ReadonlyArray<T>

    /**
     * @rewrite zip_ from "@principia/base/Iterable"
     */
    zip<B>(that: Iterable<B>): Iterable<readonly [T, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Iterable"
     */
    zipWith<B, C>(that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>
  }

  export interface IterableIterator<T> {
    /**
     * @rewrite append_ from "@principia/base/Iterable"
     */
    append(a: T): Iterable<T>

    /**
     * @rewrite chain_ from "@principia/base/Iterable"
     */
    chain<B>(f: (a: T) => Iterable<B>): Iterable<B>

    /**
     * @rewrite concat_ from "@principia/base/Iterable"
     */
    concat(that: Iterable<T>): Iterable<T>

    /**
     * @rewrite corresponds from "@principia/base/Iterable"
     */
    corresponds<B>(that: Iterable<B>, f: (a: T, b: B) => boolean): boolean

    /**
     * @rewrite cross_ from "@principia/base/Iterable"
     */
    cross<B>(that: Iterable<B>): Iterable<readonly [T, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Iterable"
     */
    crossWith<B, C>(that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>

    /**
     * @rewrite every_ from "@principia/base/Iterable"
     */
    every<B extends T>(refinement: Refinement<T, B>): this is Iterable<B>

    /**
     * @rewrite every_ from "@principia/base/Iterable"
     */
    every(predicate: Predicate<T>): boolean

    /**
     * @rewrite filter_ from "@principia/base/Iterable"
     */
    filter(predicate: Predicate<T>): Iterable<T>

    /**
     * @rewrite filter_ from "@principia/base/Iterable"
     */
    filter<B extends T>(refinement: Refinement<T, B>): Iterable<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Iterable"
     */
    filterMap<B>(f: (a: T) => Option<B>): Iterable<B>

    /**
     * @rewrite findFirst_ from "@principia/base/Iterable"
     */
    findFirst<B extends T>(refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite findFirst_ from "@principia/base/Iterable"
     */
    findFirst(predicte: Predicate<T>): Option<T>

    /**
     * @rewriteConstraint foldMap_ from "@principia/base/Iterable"
     */
    foldMap<M>(M: Monoid<M>): (f: (a: T) => M) => M

    /**
     * @rewrite foldl_ from "@principia/base/Iterable"
     */
    foldl<B>(b: B, f: (b: B, a: T) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Iterable"
     */
    foldr<B>(b: Eval<B>, f: (a: T, b: Eval<B>) => Eval<B>): Eval<B>

    /**
     * @rewrite ievery_ from "@principia/base/Iterable"
     */
    ievery<B extends T>(refinement: RefinementWithIndex<number, T, B>): this is Iterable<B>

    /**
     * @rewrite ievery_ from "@principia/base/Iterable"
     */
    ievery(predicate: PredicateWithIndex<number, T>): boolean

    /**
     * @rewrite ifilter_ from "@principia/base/Iterable"
     */
    ifilter(predicate: PredicateWithIndex<number, T>): Iterable<T>

    /**
     * @rewrite ifilter_ from "@principia/base/Iterable"
     */
    ifilter<B extends T>(refinement: RefinementWithIndex<number, T, B>): Iterable<B>

    /**
     * @rewrite ifilterMap_ from "@principia/base/Iterable"
     */
    ifilterMap<B>(f: (i: number, a: T) => Option<B>): Iterable<B>

    /**
     * @rewriteConstraint ifoldMap_ from "@principia/base/Iterable"
     */
    ifoldMap<M>(M: Monoid<M>): (f: (i: number, a: T) => M) => M

    /**
     * @rewrite ifoldl_ from "@principia/base/Iterable"
     */
    ifoldl<B>(b: B, f: (b: B, i: number, a: T) => B): B

    /**
     * @rewrite ifoldr_ from "@principia/base/Iterable"
     */
    ifoldr<B>(b: Eval<B>, f: (a: T, i: number, b: Eval<B>) => Eval<B>): Eval<B>

    /**
     * @rewrite imap_ from "@principia/base/Iterable"
     */
    imap<B>(f: (i: number, a: T) => B): Iterable<B>

    /**
     * @rewriteConstraint imapA_ from "@principia/base/Iterable"
     */
    imapA<F extends HKT.URIS, C>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

    /**
     * @rewrite ipartition_ from "@principia/base/Iterable"
     */
    ipartition(refinement: PredicateWithIndex<number, T>): readonly [Iterable<T>, Iterable<T>]

    /**
     * @rewrite ipartition_ from "@principia/base/Iterable"
     */
    ipartition<B extends T>(refinement: RefinementWithIndex<number, T, B>): readonly [Iterable<T>, Iterable<B>]

    /**
     * @rewrite ipartitionMap_ from "@principia/base/Iterable"
     */
    ipartitionMap<B, C>(f: (i: number, a: T) => Either<B, C>): readonly [Iterable<B>, Iterable<C>]

    /**
     * @rewrite map_ from "@principia/base/Iterable"
     */
    map<B>(f: (a: T) => B): Iterable<B>

    /**
     * @rewriteConstraint mapA_ from "@principia/base/Iterable"
     */
    mapA<F extends HKT.URIS, C>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

    /**
     * @rewrite partition_ from "@principia/base/Iterable"
     */
    partition<B extends T>(refinement: Refinement<T, B>): readonly [Iterable<T>, Iterable<B>]

    /**
     * @rewrite partition_ from "@principia/base/Iterable"
     */
    partition(refinement: Predicate<T>): readonly [Iterable<T>, Iterable<T>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Iterable"
     */
    partitionMap<B, C>(f: (a: T) => Either<B, C>): readonly [Iterable<B>, Iterable<C>]
    /**
     * @rewrite prepend_ from "@principia/base/Iterable"
     */
    prepend(a: T): Iterable<T>

    /**
     * @rewrite take_ from "@principia/base/Iterable"
     */
    take(n: number): Iterable<T>

    /**
     * @rewrite toArray from "@principia/base/Iterable"
     */
    toArray(): ReadonlyArray<T>

    /**
     * @rewrite zip_ from "@principia/base/Iterable"
     */
    zip<B>(that: Iterable<B>): Iterable<readonly [T, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Iterable"
     */
    zipWith<B, C>(that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>
  }
}

export {}
