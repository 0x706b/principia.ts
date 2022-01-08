import type * as Iter from '@principia/base/collection/Iterable'
import type { IterableCollection } from '@principia/base/collection/IterableCollection'
import type { Either } from '@principia/base/Either'
import type { Eval } from '@principia/base/Eval'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type {
  Applicative,
  Monoid,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Iterable: IterableCollectionStaticOps
}

interface IterableCollectionStaticOps {
  /**
   * @rewriteStatic Applicative from "@principia/base/collection/Iterable"
   */
  Applicative: typeof Iter.Applicative
  /**
   * @rewriteStatic Apply from "@principia/base/collection/Iterable"
   */
  Apply: typeof Iter.Apply
  /**
   * @rewriteStatic Filterable from "@principia/base/collection/Iterable"
   */
  Filterable: typeof Iter.Filterable
  /**
   * @rewriteStatic FilterableWithIndex from "@principia/base/collection/Iterable"
   */
  FilterableWithIndex: typeof Iter.FilterableWithIndex
  /**
   * @rewriteStatic Foldable from "@principia/base/collection/Iterable"
   */
  Foldable: typeof Iter.Foldable
  /**
   * @rewriteStatic FoldableWithIndex from "@principia/base/collection/Iterable"
   */
  FoldableWithIndex: typeof Iter.FoldableWithIndex
  /**
   * @rewriteStatic Functor from "@principia/base/collection/Iterable"
   */
  Functor: typeof Iter.Functor
  /**
   * @rewriteStatic FunctorWithIndex from "@principia/base/collection/Iterable"
   */
  FunctorWithIndex: typeof Iter.FunctorWithIndex
  /**
   * @rewriteStatic Monad from "@principia/base/collection/Iterable"
   */
  Monad: typeof Iter.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/collection/Iterable"
   */
  MonoidalFunctor: typeof Iter.MonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/collection/Iterable"
   */
  SemimonoidalFunctor: typeof Iter.SemimonoidalFunctor
  /**
   * @rewriteStatic empty from "@principia/base/collection/Iterable"
   */
  empty: typeof Iter.empty
  /**
   * @rewriteStatic iterable from "@principia/base/collection/Iterable"
   */
  from<A>(iterator: () => Iterator<A>): IterableCollection<A>
  /**
   * @rewrite identity from "smart:identity"
   */
  from<A>(as: Iterable<A>): IterableCollection<A>
  /**
   * @rewriteStatic makeBy from "@principia/base/collection/Iterable"
   */
  makeBy: typeof Iter.makeBy
  /**
   * @rewriteStatic never from "@principia/base/collection/Iterable"
   */
  never: typeof Iter.never
  /**
   * @rewriteStatic range from "@principia/base/collection/Iterable"
   */
  range: typeof Iter.range
  /**
   * @rewriteStatic unit from "@principia/base/collection/Iterable"
   */
  unit: typeof Iter.unit
}

export interface IterableCollectionOps {
  /**
   * @rewrite append_ from "@principia/base/collection/Iterable"
   */
  append<T>(this: IterableCollection<T>, a: T): IterableCollection<T>

  /**
   * @rewrite chain_ from "@principia/base/collection/Iterable"
   */
  chain<T, B>(this: IterableCollection<T>, f: (a: T) => IterableCollection<B>): IterableCollection<B>

  /**
   * @rewrite concat_ from "@principia/base/collection/Iterable"
   */
  concat<T>(this: IterableCollection<T>, that: IterableCollection<T>): IterableCollection<T>

  /**
   * @rewrite corresponds from "@principia/base/collection/Iterable"
   */
  corresponds<T, B>(this: IterableCollection<T>, that: IterableCollection<B>, f: (a: T, b: B) => boolean): boolean

  /**
   * @rewrite cross_ from "@principia/base/collection/Iterable"
   */
  cross<T, B>(this: IterableCollection<T>, that: IterableCollection<B>): IterableCollection<readonly [T, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/collection/Iterable"
   */
  crossWith<T, B, C>(
    this: IterableCollection<T>,
    that: IterableCollection<B>,
    f: (a: T, b: B) => C
  ): IterableCollection<C>

  /**
   * @rewrite every_ from "@principia/base/collection/Iterable"
   */
  every<T, B extends T>(this: IterableCollection<T>, refinement: Refinement<T, B>): this is IterableCollection<B>

  /**
   * @rewrite every_ from "@principia/base/collection/Iterable"
   */
  every<T>(this: IterableCollection<T>, predicate: Predicate<T>): boolean

  /**
   * @rewrite filter_ from "@principia/base/collection/Iterable"
   */
  filter<T>(this: IterableCollection<T>, predicate: Predicate<T>): IterableCollection<T>

  /**
   * @rewrite filter_ from "@principia/base/collection/Iterable"
   */
  filter<T, B extends T>(this: IterableCollection<T>, refinement: Refinement<T, B>): IterableCollection<B>

  /**
   * @rewrite filterMap_ from "@principia/base/collection/Iterable"
   */
  filterMap<T, B>(this: IterableCollection<T>, f: (a: T) => Maybe<B>): IterableCollection<B>

  /**
   * @rewrite find_ from "@principia/base/collection/Iterable"
   */
  find<T>(this: IterableCollection<T>, predicate: Predicate<T>): Maybe<T>

  /**
   * @rewrite find_ from "@principia/base/collection/Iterable"
   */
  find<T, B extends T>(this: IterableCollection<T>, refinement: Refinement<T, B>): Maybe<B>

  /**
   * @rewriteConstraint foldMap_ from "@principia/base/collection/Iterable"
   */
  foldMap<T, M>(this: IterableCollection<T>, M: Monoid<M>): (f: (a: T) => M) => M

  /**
   * @rewrite foldl_ from "@principia/base/collection/Iterable"
   */
  foldl<T, B>(this: IterableCollection<T>, b: B, f: (b: B, a: T) => B): B

  /**
   * @rewrite foldr_ from "@principia/base/collection/Iterable"
   */
  foldr<T, B>(this: IterableCollection<T>, b: Eval<B>, f: (a: T, b: Eval<B>) => Eval<B>): Eval<B>

  /**
   * @rewrite ievery_ from "@principia/base/collection/Iterable"
   */
  ievery<T>(this: IterableCollection<T>, predicate: PredicateWithIndex<number, T>): boolean

  /**
   * @rewrite ievery_ from "@principia/base/collection/Iterable"
   */
  ievery<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): this is IterableCollection<B>

  /**
   * @rewrite ifilter_ from "@principia/base/collection/Iterable"
   */
  ifilter<T>(this: IterableCollection<T>, predicate: PredicateWithIndex<number, T>): IterableCollection<T>

  /**
   * @rewrite ifilter_ from "@principia/base/collection/Iterable"
   */
  ifilter<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): IterableCollection<B>

  /**
   * @rewrite ifilterMap_ from "@principia/base/collection/Iterable"
   */
  ifilterMap<T, B>(this: IterableCollection<T>, f: (i: number, a: T) => Maybe<B>): IterableCollection<B>

  /**
   * @rewriteConstraint ifoldMap_ from "@principia/base/collection/Iterable"
   */
  ifoldMap<T, M>(this: IterableCollection<T>, M: Monoid<M>): (f: (i: number, a: T) => M) => M

  /**
   * @rewrite ifoldl_ from "@principia/base/collection/Iterable"
   */
  ifoldl<T, B>(this: IterableCollection<T>, b: B, f: (i: number, b: B, a: T) => B): B

  /**
   * @rewrite ifoldr_ from "@principia/base/collection/Iterable"
   */
  ifoldr<T, B>(this: IterableCollection<T>, b: Eval<B>, f: (i: number, a: T, b: Eval<B>) => Eval<B>): Eval<B>

  /**
   * @rewrite imap_ from "@principia/base/collection/Iterable"
   */
  imap<T, B>(this: IterableCollection<T>, f: (a: T) => B): IterableCollection<B>

  /**
   * @rewrite ipartition_ from "@principia/base/collection/Iterable"
   */
  ipartition<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [IterableCollection<T>, IterableCollection<B>]

  /**
   * @rewrite ipartition_ from "@principia/base/collection/Iterable"
   */
  ipartition<T>(
    this: IterableCollection<T>,
    refinement: PredicateWithIndex<number, T>
  ): readonly [IterableCollection<T>, IterableCollection<T>]

  /**
   * @rewrite ipartitionMap_ from "@principia/base/collection/Iterable"
   */
  ipartitionMap<T, B, C>(
    this: IterableCollection<T>,
    f: (i: number, a: T) => Either<B, C>
  ): readonly [IterableCollection<B>, IterableCollection<C>]

  /**
   * @rewriteConstraint itraverse_ from "@principia/base/collection/Iterable"
   */
  itraverse<T, F extends HKT.HKT, C>(
    this: IterableCollection<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, IterableCollection<A>>

  /**
   * @rewrite map_ from "@principia/base/collection/Iterable"
   */
  map<T, B>(this: IterableCollection<T>, f: (i: number, a: T) => B): IterableCollection<B>

  /**
   * @rewrite partition_ from "@principia/base/collection/Iterable"
   */
  partition<T, B extends T>(
    this: IterableCollection<T>,
    refinement: Refinement<T, B>
  ): readonly [IterableCollection<T>, IterableCollection<B>]

  /**
   * @rewrite partition_ from "@principia/base/collection/Iterable"
   */
  partition<T>(
    this: IterableCollection<T>,
    predicate: Predicate<T>
  ): readonly [IterableCollection<T>, IterableCollection<T>]

  /**
   * @rewrite partitionMap_ from "@principia/base/collection/Iterable"
   */
  partitionMap<T, B, C>(
    this: IterableCollection<T>,
    f: (a: T) => Either<B, C>
  ): readonly [IterableCollection<B>, IterableCollection<C>]

  /**
   * @rewrite prepend_ from "@principia/base/collection/Iterable"
   */
  prepend<T>(this: IterableCollection<T>, a: T): IterableCollection<T>

  /**
   * @rewrite take_ from "@principia/base/collection/Iterable"
   */
  take<T>(this: IterableCollection<T>, n: number): IterableCollection<T>

  /**
   * @rewrite toArray from "@principia/base/collection/Iterable"
   */
  toArray<T>(this: IterableCollection<T>): ReadonlyArray<T>

  /**
   * @rewriteConstraint traverse_ from "@principia/base/collection/Iterable"
   */
  traverse<T, F extends HKT.HKT, C>(
    this: IterableCollection<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, IterableCollection<A>>

  /**
   * @rewrite zip_ from "@principia/base/collection/Iterable"
   */
  zip<T, B>(this: IterableCollection<T>, that: IterableCollection<B>): IterableCollection<readonly [T, B]>

  /**
   * @rewrite zipWith_ from "@principia/base/collection/Iterable"
   */
  zipWith<T, B, C>(
    this: IterableCollection<T>,
    that: IterableCollection<B>,
    f: (a: T, b: B) => C
  ): IterableCollection<C>
}

declare module '@principia/base/collection/IterableCollection' {
  interface IterableCollection<A> extends IterableCollectionOps {}
}

export {}
