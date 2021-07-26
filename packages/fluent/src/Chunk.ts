import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { IO } from '@principia/base/IO'
import type { Option } from '@principia/base/Option'
import type { Applicative, Eq, Monoid, Predicate, PredicateWithIndex } from '@principia/base/prelude'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

/* eslint typescript-sort-keys/interface: "error" */

declare module '@principia/base/Chunk/core' {
  export interface Chunk<A> {
    /**
     * @rewrite align_ from "@principia/base/Chunk"
     */
    align<A, B>(this: Chunk<A>, that: Chunk<B>): Chunk<These<A, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/Chunk"
     */
    alignWith<A, B, C>(this: Chunk<A>, that: Chunk<B>, f: (_: These<A, B>) => C): Chunk<C>

    /**
     * @rewrite append_ from "@principia/base/Chunk"
     */
    append<A, B>(this: Chunk<A>, b: B): Chunk<A | B>

    /**
     * @rewrite chain_ from "@principia/base/Chunk"
     */
    chain<A, B>(this: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B>

    /**
     * @rewrite chop_ from "@principia/base/Chunk"
     */
    chop<A, B>(this: Chunk<A>, f: (as: Chunk<A>) => readonly [B, Chunk<A>]): Chunk<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/Chunk"
     */
    chunksOf<A>(this: Chunk<A>, n: number): Chunk<Chunk<A>>

    /**
     * @rewrite collectWhile_ from "@principia/base/Chunk"
     */
    collectWhile<A, B>(this: Chunk<A>, f: (a: A) => Option<B>): Chunk<B>

    /**
     * @rewrite compact from "@principia/base/Chunk"
     */
    compact<A>(this: Chunk<Option<A>>): Chunk<A>
    /**
     * @rewrite concat_ from "@principia/base/Chunk"
     */
    concat<A, B>(this: Chunk<A>, that: Chunk<B>): Chunk<A | B>

    /**
     * @rewrite corresponds_ from "@principia/base/Chunk"
     */
    corresponds<A, B>(this: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => boolean): boolean

    /**
     * @rewrite cross_ from "@principia/base/Chunk"
     */
    cross<A, B>(this: Chunk<A>, that: Chunk<B>): Chunk<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Chunk"
     */
    crossWith<A, B, C>(this: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>

    /**
     * @rewrite drop_ from "@principia/base/Chunk"
     */
    drop<A>(this: Chunk<A>, n: number): Chunk<A>

    /**
     * @rewrite dropWhile_ from "@principia/base/Chunk"
     */
    dropWhile<A>(this: Chunk<A>, predicate: Predicate<A>): Chunk<A>

    /**
     * @rewrite dropWhileIO from "@principia/base/Chunk"
     */
    dropWhileIO<A, R, E>(this: Chunk<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>>

    /**
     * @rewriteConstraint elem_ from "@principia/base/Chunk"
     */
    elem<A>(this: Chunk<A>, E: Eq<A>): (a: A) => boolean

    /**
     * @rewrite every_ from "@principia/base/Chunk"
     */
    every<A>(this: Chunk<A>, predicate: Predicate<A>): boolean

    /**
     * @rewrite every_ from "@principia/base/Chunk"
     */
    every<A, B extends A>(this: Chunk<A>, refinement: Refinement<A, B>): this is Chunk<B>

    /**
     * @rewrite exists_ from "@principia/base/Chunk"
     */
    exists<A>(this: Chunk<A>, predicate: Predicate<A>): boolean

    /**
     * @rewrite filter_ from "@principia/base/Chunk"
     */
    filter<A, B extends A>(this: Chunk<A>, refinement: RefinementWithIndex<number, A, B>): Chunk<B>

    /**
     * @rewrite filter_ from "@principia/base/Chunk"
     */
    filter<A>(this: Chunk<A>, predicate: PredicateWithIndex<number, A>): Chunk<A>

    /**
     * @rewrite filterIO_ from "@principia/base/Chunk"
     */
    filterIO<A, R, E>(this: Chunk<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>>

    /**
     * @rewrite filterMap_ from "@principia/base/Chunk"
     */
    filterMap<A, B>(this: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B>

    /**
     * @rewriteConstraint filterMapA_ from "@principia/base/Chunk"
     */
    filterMapA<A, F extends HKT.URIS, C>(
      this: Chunk<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Chunk<B>>

    /**
     * @rewrite find_ from "@principia/base/Chunk"
     */
    find<A>(this: Chunk<A>, predicate: PredicateWithIndex<number, A>): Option<A>

    /**
     * @rewrite findIO_ from "@principia/base/Chunk"
     */
    findIO<A, R, E>(this: Chunk<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Option<A>>

    /**
     * @rewrite foldMap_ from "@principia/base/Chunk"
     */
    foldMap<A, M>(this: Chunk<A>, M: Monoid<M>, f: (a: A, i: number) => M): M

    /**
     * @rewrite foldl_ from "@principia/base/Chunk"
     */
    foldl<A, B>(this: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldlIO_ from "@principia/base/Chunk"
     */
    foldlIO<A, R, E, B>(this: Chunk<A>, b: B, f: (b: B, a: A) => IO<R, E, B>): IO<R, E, B>

    /**
     * @rewrite foldlWhile_ from "@principia/base/Chunk"
     */
    foldlWhile<A, B>(this: Chunk<A>, b: B, cont: Predicate<B>, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Chunk"
     */
    foldr<A, B>(this: Chunk<A>, b: B, f: (a: A, b: B, i: number) => B): B

    /**
     * @rewrite foreach_ from "@principia/base/Chunk"
     */
    forEach<A, B>(this: Chunk<A>, f: (a: A) => B): void

    /**
     * @rewrite get_ from "@principia/base/Chunk"
     */
    get<A>(this: Chunk<A>, n: number): Option<A>

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
    map<A, B>(this: Chunk<A>, F: (a: A, i: number) => B): Chunk<B>

    /**
     * @rewriteConstraint mapA_ from "@principia/base/Chunk"
     */
    mapA<A, F extends HKT.URIS, C>(
      this: Chunk<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Chunk<B>>

    /**
     * @rewrite mapAccum_ from "@principia/base/Chunk"
     */
    mapAccum<A, S, B>(this: Chunk<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Chunk<B>, S]

    /**
     * @rewrite mapIO_ from "@principia/base/Chunk"
     */
    mapIO<A, R, E, B>(this: Chunk<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Chunk<B>>

    /**
     * @rewrite mapIOPar_ from "@principia/base/Chunk"
     */
    mapIOPar<A, R, E, B>(this: Chunk<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Chunk<B>>

    /**
     * @rewrite partition_ from "@principia/base/Chunk"
     */
    partition<A>(this: Chunk<A>, predicate: PredicateWithIndex<number, A>): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewrite partition_ from "@principia/base/Chunk"
     */
    partition<A, B extends A>(
      this: Chunk<A>,
      refinement: RefinementWithIndex<number, A, B>
    ): readonly [Chunk<A>, Chunk<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Chunk"
     */
    partitionMap<A, B, C>(this: Chunk<A>, f: (a: A, i: number) => Either<B, C>): readonly [Chunk<C>, Chunk<C>]

    /**
     * @rewriteConstraint partitionMapA_ from "@principia/base/Chunk"
     */
    partitionMapA<A, F extends HKT.URIS, C>(
      this: Chunk<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B, D>(
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<B, D>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Chunk<B>, Chunk<D>]>

    /**
     * @rewrite prepend_ from "@principia/base/Chunk"
     */
    prepend<A, B>(this: Chunk<A>, b: B): Chunk<A | B>

    /**
     * @rewrite separate from "@principia/base/Chunk"
     */
    separate<E, A>(this: Chunk<Either<E, A>>): readonly [Chunk<E>, Chunk<A>]

    /**
     * @rewrite splitAt_ from "@principia/base/Chunk"
     */
    splitAt<A>(this: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewrite splitWhere_ from "@principia/base/Chunk"
     */
    splitWhere<A>(this: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>]

    /**
     * @rewriteGetter tail from "@principia/base/Chunk"
     */
    tail: Option<Chunk<A>>

    /**
     * @rewrite take_ from "@principia/base/Chunk"
     */
    take<A>(this: Chunk<A>, n: number): Chunk<A>

    /**
     * @rewrite takeWhile_ from "@principia/base/Chunk"
     */
    takeWhile<A>(this: Chunk<A>, predicate: Predicate<A>): Chunk<A>

    /**
     * @rewrite takeWhileIO_ from "@principia/base/Chunk"
     */
    takeWhileIO<A, R, E>(this: Chunk<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Chunk<A>>

    /**
     * @rewrite toArray from "@principia/base/Chunk"
     */
    toArray<A>(this: Chunk<A>): ReadonlyArray<A>

    /**
     * @rewrite toBuffer from "@principia/base/Chunk"
     */
    toBuffer(this: Chunk<Byte>): Uint8Array

    /**
     * @rewrite unsafeGet_ from "@principia/base/Chunk"
     */
    unsafeGet<A>(this: Chunk<A>, n: number): A

    /**
     * @rewrite unsafeHead from "@principia/base/Chunk"
     */
    unsafeHead<A>(this: Chunk<A>): A

    /**
     * @rewrite unsafeTail from "@principia/base/Chunk"
     */
    unsafeTail<A>(this: Chunk<A>): Chunk<A>

    /**
     * @rewrite zip_ from "@principia/base/Chunk"
     */
    zip<A, B>(this: Chunk<A>, that: Chunk<B>): Chunk<readonly [A, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Chunk"
     */
    zipWith<A, B, C>(this: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>

    /**
     * @rewrite zipWithIndexOffset_ from "@principia/base/Chunk"
     */
    zipWithIndexOffset<A>(this: Chunk<A>, offset: number): Chunk<readonly [A, number]>
  }
}
