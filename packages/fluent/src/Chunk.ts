import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type { Applicative, Eq, Monoid, Predicate, PredicateWithIndex } from '@principia/base/prelude'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

declare module '@principia/base/Chunk/core' {
  export interface Chunk<A> {
    /**
     * @rewrite align_ from "@principia/base/Chunk"
     */
    align<B>(that: Chunk<B>): Chunk<These<A, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/Chunk"
     */
    alignWith<B, C>(that: Chunk<B>, f: (_: These<A, B>) => C): Chunk<C>

    /**
     * @rewrite append_ from "@principia/base/Chunk"
     */
    append<B>(b: B): Chunk<A | B>

    /**
     * @rewrite chain_ from "@principia/base/Chunk"
     */
    chain<B>(f: (a: A) => Chunk<B>): Chunk<B>

    /**
     * @rewrite chop_ from "@principia/base/Chunk"
     */
    chop<B>(f: (as: Chunk<A>) => readonly [B, Chunk<A>]): Chunk<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/Chunk"
     */
    chunksOf(n: number): Chunk<Chunk<A>>

    /**
     * @rewrite collectWhile_ from "@principia/base/Chunk"
     */
    collectWhile<B>(f: (a: A) => Option<B>): Chunk<B>

    /**
     * @rewrite compact from "@principia/base/Chunk"
     */
    compact<A>(this: Chunk<Option<A>>): Chunk<A>
    /**
     * @rewrite concat_ from "@principia/base/Chunk"
     */
    concat<B>(that: Chunk<B>): Chunk<A | B>

    /**
     * @rewrite corresponds_ from "@principia/base/Chunk"
     */
    corresponds<B>(that: Chunk<B>, f: (a: A, b: B) => boolean): boolean

    /**
     * @rewrite cross_ from "@principia/base/Chunk"
     */
    cross<B>(that: Chunk<B>): Chunk<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Chunk"
     */
    crossWith<B, C>(that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>

    /**
     * @rewrite drop_ from "@principia/base/Chunk"
     */
    drop(n: number): Chunk<A>

    /**
     * @rewrite dropWhile_ from "@principia/base/Chunk"
     */
    dropWhile(predicate: Predicate<A>): Chunk<A>

    /**
     * @rewrite _elem from "@principia/base/Chunk"
     */
    elem(E: Eq<A>, a: A): boolean

    /**
     * @rewrite every_ from "@principia/base/Chunk"
     */
    every<B extends A>(refinement: Refinement<A, B>): this is Chunk<B>

    /**
     * @rewrite every_ from "@principia/base/Chunk"
     */
    every(predicate: Predicate<A>): boolean

    /**
     * @rewrite exists_ from "@principia/base/Chunk"
     */
    exists(predicate: Predicate<A>): boolean

    /**
     * @rewrite filter_ from "@principia/base/Chunk"
     */
    filter(predicate: PredicateWithIndex<number, A>): Chunk<A>

    /**
     * @rewrite filter_ from "@principia/base/Chunk"
     */
    filter<B extends A>(refinement: RefinementWithIndex<number, A, B>): Chunk<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Chunk"
     */
    filterMap<B>(f: (a: A, i: number) => Option<B>): Chunk<B>

    /**
     * @rewrite _filterMapA from "@principia/base/Chunk"
     */
    filterMapA<F extends HKT.URIS, C, K, Q, W, X, I, S, R, E, B>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<B>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Chunk<B>>

    /**
     * @rewrite find_ from "@principia/base/Chunk"
     */
    find(predicate: PredicateWithIndex<number, A>): Option<A>

    /**
     * @rewrite foldMap_ from "@principia/base/Chunk"
     */
    foldMap<M>(M: Monoid<M>, f: (a: A, i: number) => M): M

    /**
     * @rewrite foldl_ from "@principia/base/Chunk"
     */
    foldl<B>(b: B, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldlWhile_ from "@principia/base/Chunk"
     */
    foldlWhile<B>(b: B, cont: Predicate<B>, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Chunk"
     */
    foldr<B>(b: B, f: (a: A, b: B, i: number) => B): B

    /**
     * @rewrite foreach_ from "@principia/base/Chunk"
     */
    forEach<B>(f: (a: A) => B): void

    /**
     * @rewrite get_ from "@principia/base/Chunk"
     */
    get(n: number): Option<A>

    /**
     * @rewriteGetter head from "@principia/base/Chunk"
     */
    head: Option<A>

    /**
     * @rewriteGetter isEmpty from "@principia/base/Chunk"
     */
    isEmpty: boolean

    /**
     * @rewriteGetter isNonEmpty from "@principia/base/Chunk"
     */
    isNonEmpty: boolean

    /**
     * @rewriteGetter last from "@principia/base/Chunk"
     */
    last: Option<A>

    /**
     * @rewrite map_ from "@principia/base/Chunk"
     */
    map<B>(F: (a: A, i: number) => B): Chunk<B>

    /**
     * @rewrite _mapA from "@principia/base/Chunk"
     */
    mapA<F extends HKT.URIS, C, K, Q, W, X, I, S, R, E, B>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Chunk<B>>

    /**
     * @rewrite mapAccum_ from "@principia/base/Chunk"
     */
    mapAccum<S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Chunk<B>, S]

    /**
     * @rewrite partition_ from "@principia/base/Chunk"
     */
    partition(predicate: PredicateWithIndex<number, A>): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewrite partition_ from "@principia/base/Chunk"
     */
    partition<B extends A>(refinement: RefinementWithIndex<number, A, B>): readonly [Chunk<A>, Chunk<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Chunk"
     */
    partitionMap<B, C>(f: (a: A, i: number) => Either<B, C>): readonly [Chunk<C>, Chunk<C>]

    /**
     * @rewrite _partitionMapA from "@principia/base/Chunk"
     */
    partitionMapA<F extends HKT.URIS, C, K, Q, W, X, I, S, R, E, B, D>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<B, D>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Chunk<B>, Chunk<D>]>

    /**
     * @rewrite prepend_ from "@principia/base/Chunk"
     */
    prepend<B>(b: B): Chunk<A | B>

    /**
     * @rewrite separate from "@principia/base/Chunk"
     */
    separate<E, A>(this: Chunk<Either<E, A>>): readonly [Chunk<E>, Chunk<A>]

    /**
     * @rewrite splitAt_ from "@principia/base/Chunk"
     */
    splitAt(n: number): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewrite splitWhere_ from "@principia/base/Chunk"
     */
    splitWhere(predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewriteGetter tail from "@principia/base/Chunk"
     */
    tail: Option<Chunk<A>>

    /**
     * @rewrite take_ from "@principia/base/Chunk"
     */
    take(n: number): Chunk<A>

    /**
     * @rewrite takeWhile_ from "@principia/base/Chunk"
     */
    takeWhile(predicate: Predicate<A>): Chunk<A>

    /**
     * @rewrite toArray from "@principia/base/Chunk"
     */
    toArray(): ReadonlyArray<A>

    /**
     * @rewrite toBuffer from "@principia/base/Chunk"
     */
    toBuffer(this: Chunk<Byte>): Uint8Array

    /**
     * @rewrite unsafeGet_ from "@principia/base/Chunk"
     */
    unsafeGet(n: number): A

    /**
     * @rewrite unsafeHead from "@principia/base/Chunk"
     */
    unsafeHeaf(): A

    /**
     * @rewrite unsafeTail from "@principia/base/Chunk"
     */
    unsafeTail(): Chunk<A>

    /**
     * @rewrite zip_ from "@principia/base/Chunk"
     */
    zip<B>(that: Chunk<B>): Chunk<readonly [A, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Chunk"
     */
    zipWith<B, C>(that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>

    /**
     * @rewrite zipWithIndexOffset_ from "@principia/base/Chunk"
     */
    zipWithIndexOffset(offset: number): Chunk<readonly [A, number]>
  }
}
