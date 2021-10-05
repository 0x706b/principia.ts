import type { Either } from '@principia/base/Either'
import type { Eval } from '@principia/base/Eval'
import type * as HKT from '@principia/base/HKT'
import type * as Iter from '@principia/base/Iterable'
import type { IterableCollection } from '@principia/base/IterableCollection'
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
   * @rewriteStatic Applicative from "@principia/base/Iterable"
   */
  Applicative: typeof Iter.Applicative
  /**
   * @rewriteStatic Apply from "@principia/base/Iterable"
   */
  Apply: typeof Iter.Apply
  /**
   * @rewriteStatic Filterable from "@principia/base/Iterable"
   */
  Filterable: typeof Iter.Filterable
  /**
   * @rewriteStatic FilterableWithIndex from "@principia/base/Iterable"
   */
  FilterableWithIndex: typeof Iter.FilterableWithIndex
  /**
   * @rewriteStatic Foldable from "@principia/base/Iterable"
   */
  Foldable: typeof Iter.Foldable
  /**
   * @rewriteStatic FoldableWithIndex from "@principia/base/Iterable"
   */
  FoldableWithIndex: typeof Iter.FoldableWithIndex
  /**
   * @rewriteStatic Functor from "@principia/base/Iterable"
   */
  Functor: typeof Iter.Functor
  /**
   * @rewriteStatic FunctorWithIndex from "@principia/base/Iterable"
   */
  FunctorWithIndex: typeof Iter.FunctorWithIndex
  /**
   * @rewriteStatic Monad from "@principia/base/Iterable"
   */
  Monad: typeof Iter.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Iterable"
   */
  MonoidalFunctor: typeof Iter.MonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Iterable"
   */
  SemimonoidalFunctor: typeof Iter.SemimonoidalFunctor
  /**
   * @rewriteStatic empty from "@principia/base/Iterable"
   */
  empty: typeof Iter.empty
  /**
   * @rewriteStatic iterable from "@principia/base/Iterable"
   */
  from<A>(iterator: () => Iterator<A>): IterableCollection<A>
  /**
   * @rewrite identity from "smart:identity"
   */
  from<A>(as: Iterable<A>): IterableCollection<A>
  /**
   * @rewriteStatic makeBy from "@principia/base/Iterable"
   */
  makeBy: typeof Iter.makeBy
  /**
   * @rewriteStatic never from "@principia/base/Iterable"
   */
  never: typeof Iter.never
  /**
   * @rewriteStatic range from "@principia/base/Iterable"
   */
  range: typeof Iter.range
  /**
   * @rewriteStatic unit from "@principia/base/Iterable"
   */
  unit: typeof Iter.unit
}

export interface IterableCollectionOps {
  /**
   * @rewrite append_ from "@principia/base/Iterable"
   */
  append<T>(this: IterableCollection<T>, a: T): IterableCollection<T>

  /**
   * @rewrite chain_ from "@principia/base/Iterable"
   */
  chain<T, B>(this: IterableCollection<T>, f: (a: T) => IterableCollection<B>): IterableCollection<B>

  /**
   * @rewrite concat_ from "@principia/base/Iterable"
   */
  concat<T>(this: IterableCollection<T>, that: IterableCollection<T>): IterableCollection<T>

  /**
   * @rewrite corresponds from "@principia/base/Iterable"
   */
  corresponds<T, B>(this: IterableCollection<T>, that: IterableCollection<B>, f: (a: T, b: B) => boolean): boolean

  /**
   * @rewrite cross_ from "@principia/base/Iterable"
   */
  cross<T, B>(this: IterableCollection<T>, that: IterableCollection<B>): IterableCollection<readonly [T, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Iterable"
   */
  crossWith<T, B, C>(
    this: IterableCollection<T>,
    that: IterableCollection<B>,
    f: (a: T, b: B) => C
  ): IterableCollection<C>

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): this is IterableCollection<B>

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T>(this: IterableCollection<T>, predicate: PredicateWithIndex<number, T>): boolean

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T>(this: IterableCollection<T>, predicate: PredicateWithIndex<number, T>): IterableCollection<T>

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): IterableCollection<B>

  /**
   * @rewrite filterMap_ from "@principia/base/Iterable"
   */
  filterMap<T, B>(this: IterableCollection<T>, f: (a: T, i: number) => Maybe<B>): IterableCollection<B>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T>(this: IterableCollection<T>, predicate: Predicate<T>): Maybe<T>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T, B extends T>(this: IterableCollection<T>, refinement: Refinement<T, B>): Maybe<B>
  /**
   * @rewriteConstraint foldMap_ from "@principia/base/Iterable"
   */
  foldMap<T, M>(this: IterableCollection<T>, M: Monoid<M>): (f: (a: T, i: number) => M) => M

  /**
   * @rewrite foldl_ from "@principia/base/Iterable"
   */
  foldl<T, B>(this: IterableCollection<T>, b: B, f: (b: B, a: T, i: number) => B): B

  /**
   * @rewrite foldr_ from "@principia/base/Iterable"
   */
  foldr<T, B>(this: IterableCollection<T>, b: Eval<B>, f: (a: T, b: Eval<B>, i: number) => Eval<B>): Eval<B>

  /**
   * @rewrite map_ from "@principia/base/Iterable"
   */
  map<T, B>(this: IterableCollection<T>, f: (a: T, i: number) => B): IterableCollection<B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Iterable"
   */
  mapA<T, F extends HKT.URIS, C>(
    this: IterableCollection<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, IterableCollection<A>>

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T, B extends T>(
    this: IterableCollection<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [IterableCollection<T>, IterableCollection<B>]

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T>(
    this: IterableCollection<T>,
    refinement: PredicateWithIndex<number, T>
  ): readonly [IterableCollection<T>, IterableCollection<T>]

  /**
   * @rewrite partitionMap_ from "@principia/base/Iterable"
   */
  partitionMap<T, B, C>(
    this: IterableCollection<T>,
    f: (a: T, i: number) => Either<B, C>
  ): readonly [IterableCollection<B>, IterableCollection<C>]

  /**
   * @rewrite prepend_ from "@principia/base/Iterable"
   */
  prepend<T>(this: IterableCollection<T>, a: T): IterableCollection<T>

  /**
   * @rewrite take_ from "@principia/base/Iterable"
   */
  take<T>(this: IterableCollection<T>, n: number): IterableCollection<T>

  /**
   * @rewrite toArray from "@principia/base/Iterable"
   */
  toArray<T>(this: IterableCollection<T>): ReadonlyArray<T>

  /**
   * @rewrite zip_ from "@principia/base/Iterable"
   */
  zip<T, B>(this: IterableCollection<T>, that: IterableCollection<B>): IterableCollection<readonly [T, B]>

  /**
   * @rewrite zipWith_ from "@principia/base/Iterable"
   */
  zipWith<T, B, C>(
    this: IterableCollection<T>,
    that: IterableCollection<B>,
    f: (a: T, b: B) => C
  ): IterableCollection<C>
}

declare module '@principia/base/IterableCollection' {
  interface IterableCollection<A> extends IterableCollectionOps {}
}

export {}
