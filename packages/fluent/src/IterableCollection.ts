import type { Either } from '@principia/base/Either'
import type { Eval } from '@principia/base/Eval'
import type * as HKT from '@principia/base/HKT'
import type { IterableCollection } from '@principia/base/IterableCollection'
import type { Option } from '@principia/base/Option'
import type {
  Applicative,
  Monoid,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

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
  filterMap<T, B>(this: IterableCollection<T>, f: (a: T, i: number) => Option<B>): IterableCollection<B>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T>(this: IterableCollection<T>, predicate: Predicate<T>): Option<T>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T, B extends T>(this: IterableCollection<T>, refinement: Refinement<T, B>): Option<B>
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
