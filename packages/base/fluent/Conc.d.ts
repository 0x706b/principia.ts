import type { Byte } from '@principia/base/Byte'
import type * as C from '@principia/base/collection/immutable/Conc'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { IO } from '@principia/base/IO'
import type { Maybe } from '@principia/base/Maybe'
import type { Applicative, Eq, Monoid, Predicate, PredicateWithIndex } from '@principia/base/prelude'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Conc: ConcStaticOps
  export interface Conc<A> extends C.Conc<A> {}
}

interface ConcStaticOps {
  /**
   * @rewriteStatic Align from "@principia/base/collection/immutable/Conc"
   */
  Align: typeof C.Align
  /**
   * @rewriteStatic Alt from "@principia/base/collection/immutable/Conc"
   */
  Alt: typeof C.Alt
  /**
   * @rewriteStatic Alternative from "@principia/base/collection/immutable/Conc"
   */
  Alternative: typeof C.Alternative
  /**
   * @rewriteStatic Applicative from "@principia/base/collection/immutable/Conc"
   */
  Applicative: typeof C.Applicative
  /**
   * @rewriteStatic Apply from "@principia/base/collection/immutable/Conc"
   */
  Apply: typeof C.Apply
  /**
   * @rewriteStatic Compactable from "@principia/base/collection/immutable/Conc"
   */
  Compactable: typeof C.Compactable
  /**
   * @rewriteStatic Filterable from "@principia/base/collection/immutable/Conc"
   */
  Filterable: typeof C.Filterable
  /**
   * @rewriteStatic FilterableWithIndex from "@principia/base/collection/immutable/Conc"
   */
  FilterableWithIndex: typeof C.FilterableWithIndex
  /**
   * @rewriteStatic Foldable from "@principia/base/collection/immutable/Conc"
   */
  Foldable: typeof C.Foldable
  /**
   * @rewriteStatic FoldableWithIndex from "@principia/base/collection/immutable/Conc"
   */
  FoldableWithIndex: typeof C.FoldableWithIndex
  /**
   * @rewriteStatic Functor from "@principia/base/collection/immutable/Conc"
   */
  Functor: typeof C.Functor
  /**
   * @rewriteStatic FunctorWithIndex from "@principia/base/collection/immutable/Conc"
   */
  FunctorWithIndex: typeof C.FunctorWithIndex
  /**
   * @rewriteStatic Monad from "@principia/base/collection/immutable/Conc"
   */
  Monad: typeof C.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/collection/immutable/Conc"
   */
  MonoidalFunctor: typeof C.MonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/collection/immutable/Conc"
   */
  SemimonoidalFunctor: typeof C.SemimonoidalFunctor
  /**
   * @rewriteStatic Traversable from "@principia/base/collection/immutable/Conc"
   */
  Traversable: typeof C.Traversable
  /**
   * @rewriteStatic TraversableWithIndex from "@principia/base/collection/immutable/Conc"
   */
  TraversableWithIndex: typeof C.TraversableWithIndex
  /**
   * @rewriteStatic Unfoldable from "@principia/base/collection/immutable/Conc"
   */
  Unfoldable: typeof C.Unfoldable
  /**
   * @rewriteStatic Witherable from "@principia/base/collection/immutable/Conc"
   */
  Witherable: typeof C.Witherable
  /**
   * @rewriteStatic WitherableWithIndex from "@principia/base/collection/immutable/Conc"
   */
  WitherableWithIndex: typeof C.WitherableWithIndex
  /**
   * @rewriteStatic Zip from "@principia/base/collection/immutable/Conc"
   */
  Zip: typeof C.Zip
  /**
   * @rewriteStatic builder from "@principia/base/collection/immutable/Conc"
   */
  builder: typeof C.builder
  /**
   * @rewriteStatic empty from "@principia/base/collection/immutable/Conc"
   */
  empty: typeof C.empty
  /**
   * @rewriteStatic fromBuffer from "@principia/base/collection/immutable/Conc"
   */
  from(bytes: Uint8Array): C.Conc<Byte>
  /**
   * @rewriteStatic from from "@principia/base/collection/immutable/Conc"
   */
  from<A>(as: Iterable<A>): C.Conc<A>
  /**
   * @rewriteStatic make from "@principia/base/collection/immutable/Conc"
   */
  of: typeof C.make
  /**
   * @rewriteStatic range from "@principia/base/collection/immutable/Conc"
   */
  range: typeof C.range
  /**
   * @rewriteStatic replicate from "@principia/base/collection/immutable/Conc"
   */
  replicate: typeof C.replicate
  /**
   * @rewriteStatic single from "@principia/base/collection/immutable/Conc"
   */
  single: typeof C.single
  /**
   * @rewriteStatic unfold from "@principia/base/collection/immutable/Conc"
   */
  unfold: typeof C.unfold
}

declare module '@principia/base/collection/immutable/Conc/core' {
  export interface Conc<A> {
    /**
     * @rewrite align_ from "@principia/base/collection/immutable/Conc"
     */
    align<A, B>(this: Conc<A>, that: Conc<B>): Conc<These<A, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/collection/immutable/Conc"
     */
    alignWith<A, B, C>(this: Conc<A>, that: Conc<B>, f: (_: These<A, B>) => C): Conc<C>

    /**
     * @rewrite append_ from "@principia/base/collection/immutable/Conc"
     */
    append<A, B>(this: Conc<A>, b: B): Conc<A | B>

    /**
     * @rewrite chain_ from "@principia/base/collection/immutable/Conc"
     */
    chain<A, B>(this: Conc<A>, f: (a: A) => Conc<B>): Conc<B>

    /**
     * @rewrite chop_ from "@principia/base/collection/immutable/Conc"
     */
    chop<A, B>(this: Conc<A>, f: (as: Conc<A>) => readonly [B, Conc<A>]): Conc<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/collection/immutable/Conc"
     */
    chunksOf<A>(this: Conc<A>, n: number): Conc<Conc<A>>

    /**
     * @rewrite collectWhile_ from "@principia/base/collection/immutable/Conc"
     */
    collectWhile<A, B>(this: Conc<A>, f: (a: A) => Maybe<B>): Conc<B>

    /**
     * @rewrite compact from "@principia/base/collection/immutable/Conc"
     */
    compact<A>(this: Conc<Maybe<A>>): Conc<A>
    /**
     * @rewrite concat_ from "@principia/base/collection/immutable/Conc"
     */
    concat<A, B>(this: Conc<A>, that: Conc<B>): Conc<A | B>

    /**
     * @rewrite corresponds_ from "@principia/base/collection/immutable/Conc"
     */
    corresponds<A, B>(this: Conc<A>, that: Conc<B>, f: (a: A, b: B) => boolean): boolean

    /**
     * @rewrite cross_ from "@principia/base/collection/immutable/Conc"
     */
    cross<A, B>(this: Conc<A>, that: Conc<B>): Conc<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/collection/immutable/Conc"
     */
    crossWith<A, B, C>(this: Conc<A>, that: Conc<B>, f: (a: A, b: B) => C): Conc<C>

    /**
     * @rewrite drop_ from "@principia/base/collection/immutable/Conc"
     */
    drop<A>(this: Conc<A>, n: number): Conc<A>

    /**
     * @rewrite dropWhile_ from "@principia/base/collection/immutable/Conc"
     */
    dropWhile<A>(this: Conc<A>, predicate: Predicate<A>): Conc<A>

    /**
     * @rewrite dropWhileIO from "@principia/base/collection/immutable/Conc"
     */
    dropWhileIO<A, R, E>(this: Conc<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>>

    /**
     * @rewriteConstraint elem_ from "@principia/base/collection/immutable/Conc"
     */
    elem<A>(this: Conc<A>, E: Eq<A>): (a: A) => boolean

    /**
     * @rewrite every_ from "@principia/base/collection/immutable/Conc"
     */
    every<A>(this: Conc<A>, predicate: Predicate<A>): boolean

    /**
     * @rewrite every_ from "@principia/base/collection/immutable/Conc"
     */
    every<A, B extends A>(this: Conc<A>, refinement: Refinement<A, B>): this is Conc<B>

    /**
     * @rewrite exists_ from "@principia/base/collection/immutable/Conc"
     */
    exists<A>(this: Conc<A>, predicate: Predicate<A>): boolean

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Conc"
     */
    filter<A, B extends A>(this: Conc<A>, refinement: Refinement<A, B>): Conc<B>

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Conc"
     */
    filter<A>(this: Conc<A>, predicate: Predicate<A>): Conc<A>

    /**
     * @rewrite filterIO_ from "@principia/base/collection/immutable/Conc"
     */
    filterIO<A, R, E>(this: Conc<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>>

    /**
     * @rewrite filterMap_ from "@principia/base/collection/immutable/Conc"
     */
    filterMap<A, B>(this: Conc<A>, f: (a: A) => Maybe<B>): Conc<B>

    /**
     * @rewrite find_ from "@principia/base/collection/immutable/Conc"
     */
    find<A>(this: Conc<A>, predicate: Predicate<A>): Maybe<A>

    /**
     * @rewrite findIO_ from "@principia/base/collection/immutable/Conc"
     */
    findIO<A, R, E>(this: Conc<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Maybe<A>>

    /**
     * @rewrite foldMap_ from "@principia/base/collection/immutable/Conc"
     */
    foldMap<A, M>(this: Conc<A>, M: Monoid<M>, f: (a: A, i: number) => M): M

    /**
     * @rewrite foldl_ from "@principia/base/collection/immutable/Conc"
     */
    foldl<A, B>(this: Conc<A>, b: B, f: (b: B, a: A) => B): B

    /**
     * @rewrite foldlIO_ from "@principia/base/collection/immutable/Conc"
     */
    foldlIO<A, R, E, B>(this: Conc<A>, b: B, f: (b: B, a: A) => IO<R, E, B>): IO<R, E, B>

    /**
     * @rewrite foldlWhile_ from "@principia/base/collection/immutable/Conc"
     */
    foldlWhile<A, B>(this: Conc<A>, b: B, cont: Predicate<B>, f: (b: B, a: A) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/collection/immutable/Conc"
     */
    foldr<A, B>(this: Conc<A>, b: B, f: (a: A, b: B) => B): B

    /**
     * @rewrite foreach_ from "@principia/base/collection/immutable/Conc"
     */
    forEach<A, B>(this: Conc<A>, f: (a: A) => B): void

    /**
     * @rewrite get_ from "@principia/base/collection/immutable/Conc"
     */
    get<A>(this: Conc<A>, n: number): Maybe<A>

    /**
     * @rewriteGetter head from "@principia/base/collection/immutable/Conc"
     */
    head: Maybe<A>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Conc"
     */
    ifilter<A, B extends A>(this: Conc<A>, refinement: RefinementWithIndex<number, A, B>): Conc<B>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Conc"
     */
    ifilter<A>(this: Conc<A>, predicate: PredicateWithIndex<number, A>): Conc<A>

    /**
     * @rewrite ifilterMap_ from "@principia/base/collection/immutable/Conc"
     */
    ifilterMap<A, B>(this: Conc<A>, f: (i: number, a: A) => Maybe<B>): Conc<B>

    /**
     * @rewrite ifind_ from "@principia/base/collection/immutable/Conc"
     */
    ifind<A>(this: Conc<A>, predicate: PredicateWithIndex<number, A>): Maybe<A>

    /**
     * @rewriteConstraint ifoldMap_ from "@principia/base/collection/immutable/Conc"
     */
    ifoldMap<A, M>(this: Conc<A>, M: Monoid<M>): (f: (i: number, a: A) => M) => M

    /**
     * @rewrite ifoldl_ from "@principia/base/collection/immutable/Conc"
     */
    ifoldl<A, B>(this: Conc<A>, b: B, f: (i: number, b: B, a: A) => B): B

    /**
     * @rewrite ifoldlWhile_ from "@principia/base/collection/immutable/Conc"
     */
    ifoldlWhile<A, B>(this: Conc<A>, b: B, cont: Predicate<B>, f: (i: number, b: B, a: A) => B): B

    /**
     * @rewrite ifoldr_ from "@principia/base/collection/immutable/Conc"
     */
    ifoldr<A, B>(this: Conc<A>, b: B, f: (i: number, a: A, b: B) => B): B

    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/Conc"
     */
    ipartition<A>(this: Conc<A>, predicate: PredicateWithIndex<number, A>): readonly [Conc<A>, Conc<A>]

    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/Conc"
     */
    ipartition<A, B extends A>(
      this: Conc<A>,
      refinement: RefinementWithIndex<number, A, B>
    ): readonly [Conc<A>, Conc<B>]

    /**
     * @rewrite ipartitionMap_ from "@principia/base/collection/immutable/Conc"
     */
    ipartitionMap<A, B, C>(this: Conc<A>, f: (i: number, a: A) => Either<B, C>): readonly [Conc<C>, Conc<C>]

    /**
     * @rewriteGetter isEmpty from "@principia/base/collection/immutable/Conc"
     */
    isEmpty: boolean

    /**
     * @rewriteGetter isNonEmpty from "@principia/base/collection/immutable/Conc"
     */
    isNonEmpty: boolean

    /**
     * @rewriteConstraint itraverse_ from "@principia/base/collection/immutable/Conc"
     */
    itraverse<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (i: number, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Conc<B>>

    /**
     * @rewriteConstraint iwilt_ from "@principia/base/collection/immutable/Conc"
     */
    iwilt<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B, D>(
      f: (i: number, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<B, D>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Conc<B>, Conc<D>]>

    /**
     * @rewriteConstraint iwither_ from "@principia/base/collection/immutable/Conc"
     */
    iwither<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (i: number, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Conc<B>>

    /**
     * @rewriteGetter last from "@principia/base/collection/immutable/Conc"
     */
    last: Maybe<A>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Conc"
     */
    map<A, B>(this: Conc<A>, F: (a: A, i: number) => B): Conc<B>

    /**
     * @rewrite mapAccum_ from "@principia/base/collection/immutable/Conc"
     */
    mapAccum<A, S, B>(this: Conc<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [Conc<B>, S]

    /**
     * @rewrite mapIO_ from "@principia/base/collection/immutable/Conc"
     */
    mapIO<A, R, E, B>(this: Conc<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Conc<B>>

    /**
     * @rewrite mapIOPar_ from "@principia/base/collection/immutable/Conc"
     */
    mapIOPar<A, R, E, B>(this: Conc<A>, f: (a: A) => IO<R, E, B>): IO<R, E, Conc<B>>

    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/Conc"
     */
    partition<A>(this: Conc<A>, predicate: Predicate<A>): readonly [Conc<A>, Conc<A>]

    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/Conc"
     */
    partition<A, B extends A>(this: Conc<A>, refinement: Refinement<A, B>): readonly [Conc<A>, Conc<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/collection/immutable/Conc"
     */
    partitionMap<A, B, C>(this: Conc<A>, f: (a: A) => Either<B, C>): readonly [Conc<C>, Conc<C>]

    /**
     * @rewrite prepend_ from "@principia/base/collection/immutable/Conc"
     */
    prepend<A, B>(this: Conc<A>, b: B): Conc<A | B>

    /**
     * @rewrite separate from "@principia/base/collection/immutable/Conc"
     */
    separate<E, A>(this: Conc<Either<E, A>>): readonly [Conc<E>, Conc<A>]

    /**
     * @rewrite splitAt_ from "@principia/base/collection/immutable/Conc"
     */
    splitAt<A>(this: Conc<A>, n: number): readonly [Conc<A>, Conc<A>]

    /**
     * @rewrite splitWhere_ from "@principia/base/collection/immutable/Conc"
     */
    splitWhere<A>(this: Conc<A>, predicate: Predicate<A>): readonly [Conc<A>, Conc<A>]

    /**
     * @rewriteGetter tail from "@principia/base/collection/immutable/Conc"
     */
    tail: Maybe<Conc<A>>

    /**
     * @rewrite take_ from "@principia/base/collection/immutable/Conc"
     */
    take<A>(this: Conc<A>, n: number): Conc<A>

    /**
     * @rewrite takeWhile_ from "@principia/base/collection/immutable/Conc"
     */
    takeWhile<A>(this: Conc<A>, predicate: Predicate<A>): Conc<A>

    /**
     * @rewrite takeWhileIO_ from "@principia/base/collection/immutable/Conc"
     */
    takeWhileIO<A, R, E>(this: Conc<A>, p: (a: A) => IO<R, E, boolean>): IO<R, E, Conc<A>>

    /**
     * @rewrite toArray from "@principia/base/collection/immutable/Conc"
     */
    toArray<A>(this: Conc<A>): ReadonlyArray<A>

    /**
     * @rewrite toBuffer from "@principia/base/collection/immutable/Conc"
     */
    toBuffer(this: Conc<Byte>): Uint8Array

    /**
     * @rewriteConstraint traverse_ from "@principia/base/collection/immutable/Conc"
     */
    traverse<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Conc<B>>

    /**
     * @rewrite unsafeGet_ from "@principia/base/collection/immutable/Conc"
     */
    unsafeGet<A>(this: Conc<A>, n: number): A

    /**
     * @rewrite unsafeHead from "@principia/base/collection/immutable/Conc"
     */
    unsafeHead<A>(this: Conc<A>): A

    /**
     * @rewrite unsafeTail from "@principia/base/collection/immutable/Conc"
     */
    unsafeTail<A>(this: Conc<A>): Conc<A>

    /**
     * @rewriteConstraint wilt_ from "@principia/base/collection/immutable/Conc"
     */
    wilt<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B, D>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<B, D>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Conc<B>, Conc<D>]>

    /**
     * @rewriteConstraint wither_ from "@principia/base/collection/immutable/Conc"
     */
    wither<A, F extends HKT.HKT, C>(
      this: Conc<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Conc<B>>

    /**
     * @rewrite zip_ from "@principia/base/collection/immutable/Conc"
     */
    zip<A, B>(this: Conc<A>, that: Conc<B>): Conc<readonly [A, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/collection/immutable/Conc"
     */
    zipWith<A, B, C>(this: Conc<A>, that: Conc<B>, f: (a: A, b: B) => C): Conc<C>

    /**
     * @rewrite zipWithIndexOffset_ from "@principia/base/collection/immutable/Conc"
     */
    zipWithIndexOffset<A>(this: Conc<A>, offset: number): Conc<readonly [A, number]>
  }
}
