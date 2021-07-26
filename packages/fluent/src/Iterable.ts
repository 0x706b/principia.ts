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

/* eslint typescript-sort-keys/interface: "error" */

export interface IterableOps {
  /**
   * @rewrite append_ from "@principia/base/Iterable"
   */
  append<T>(this: Iterable<T>, a: T): Iterable<T>

  /**
   * @rewrite append_ from "@principia/base/Iterable"
   */
  append<T>(this: IterableIterator<T>, a: T): Iterable<T>

  /**
   * @rewrite chain_ from "@principia/base/Iterable"
   */
  chain<T, B>(this: Iterable<T>, f: (a: T) => Iterable<B>): Iterable<B>

  /**
   * @rewrite chain_ from "@principia/base/Iterable"
   */
  chain<T, B>(this: IterableIterator<T>, f: (a: T) => Iterable<B>): Iterable<B>

  /**
   * @rewrite concat_ from "@principia/base/Iterable"
   */
  concat<T>(this: Iterable<T>, that: Iterable<T>): Iterable<T>

  /**
   * @rewrite concat_ from "@principia/base/Iterable"
   */
  concat<T>(this: IterableIterator<T>, that: Iterable<T>): Iterable<T>

  /**
   * @rewrite corresponds from "@principia/base/Iterable"
   */
  corresponds<T, B>(this: Iterable<T>, that: Iterable<B>, f: (a: T, b: B) => boolean): boolean

  /**
   * @rewrite corresponds from "@principia/base/Iterable"
   */
  corresponds<T, B>(this: IterableIterator<T>, that: Iterable<B>, f: (a: T, b: B) => boolean): boolean

  /**
   * @rewrite cross_ from "@principia/base/Iterable"
   */
  cross<T, B>(this: Iterable<T>, that: Iterable<B>): Iterable<readonly [T, B]>

  /**
   * @rewrite cross_ from "@principia/base/Iterable"
   */
  cross<T, B>(this: IterableIterator<T>, that: Iterable<B>): Iterable<readonly [T, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/Iterable"
   */
  crossWith<T, B, C>(this: Iterable<T>, that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>

  /**
   * @rewrite crossWith_ from "@principia/base/Iterable"
   */
  crossWith<T, B, C>(this: IterableIterator<T>, that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T, B extends T>(this: Iterable<T>, refinement: RefinementWithIndex<number, T, B>): this is Iterable<B>

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T>(this: Iterable<T>, predicate: PredicateWithIndex<number, T>): boolean

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T, B extends T>(this: IterableIterator<T>, refinement: RefinementWithIndex<number, T, B>): this is Iterable<B>

  /**
   * @rewrite every_ from "@principia/base/Iterable"
   */
  every<T>(this: IterableIterator<T>, predicate: PredicateWithIndex<number, T>): boolean

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T>(this: Iterable<T>, predicate: PredicateWithIndex<number, T>): Iterable<T>

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T, B extends T>(this: Iterable<T>, refinement: RefinementWithIndex<number, T, B>): Iterable<B>

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T>(this: IterableIterator<T>, predicate: PredicateWithIndex<number, T>): Iterable<T>

  /**
   * @rewrite filter_ from "@principia/base/Iterable"
   */
  filter<T, B extends T>(this: IterableIterator<T>, refinement: RefinementWithIndex<number, T, B>): Iterable<B>

  /**
   * @rewrite filterMap_ from "@principia/base/Iterable"
   */
  filterMap<T, B>(this: Iterable<T>, f: (a: T, i: number) => Option<B>): Iterable<B>
  /**
   * @rewrite filterMap_ from "@principia/base/Iterable"
   */
  filterMap<T, B>(this: IterableIterator<T>, f: (a: T, i: number) => Option<B>): Iterable<B>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T>(this: Iterable<T>, predicate: Predicate<T>): Option<T>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T, B extends T>(this: Iterable<T>, refinement: Refinement<T, B>): Option<B>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T, B extends T>(this: IterableIterator<T>, refinement: RefinementWithIndex<number, T, B>): Option<B>

  /**
   * @rewrite find_ from "@principia/base/Iterable"
   */
  find<T>(this: IterableIterator<T>, predicte: PredicateWithIndex<number, T>): Option<T>
  /**
   * @rewriteConstraint foldMap_ from "@principia/base/Iterable"
   */
  foldMap<T, M>(this: Iterable<T>, M: Monoid<M>): (f: (a: T, i: number) => M) => M

  /**
   * @rewriteConstraint foldMap_ from "@principia/base/Iterable"
   */
  foldMap<T, M>(this: IterableIterator<T>, M: Monoid<M>): (f: (a: T, i: number) => M) => M

  /**
   * @rewrite foldl_ from "@principia/base/Iterable"
   */
  foldl<T, B>(this: Iterable<T>, b: B, f: (b: B, a: T, i: number) => B): B

  /**
   * @rewrite foldl_ from "@principia/base/Iterable"
   */
  foldl<T, B>(this: IterableIterator<T>, b: B, f: (b: B, a: T, i: number) => B): B

  /**
   * @rewrite foldr_ from "@principia/base/Iterable"
   */
  foldr<T, B>(this: Iterable<T>, b: Eval<B>, f: (a: T, b: Eval<B>, i: number) => Eval<B>): Eval<B>

  /**
   * @rewrite foldr_ from "@principia/base/Iterable"
   */
  foldr<T, B>(this: IterableIterator<T>, b: Eval<B>, f: (a: T, b: Eval<B>, i: number) => Eval<B>): Eval<B>

  /**
   * @rewrite map_ from "@principia/base/Iterable"
   */
  map<T, B>(this: Iterable<T>, f: (a: T, i: number) => B): Iterable<B>

  /**
   * @rewrite map_ from "@principia/base/Iterable"
   */
  map<T, B>(this: IterableIterator<T>, f: (a: T, i: number) => B): Iterable<B>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Iterable"
   */
  mapA<T, F extends HKT.URIS, C>(
    this: Iterable<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Iterable"
   */
  mapA<T, F extends HKT.URIS, C>(
    this: IterableIterator<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Iterable<A>>

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T, B extends T>(
    this: IterableIterator<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [Iterable<T>, Iterable<B>]

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T>(
    this: IterableIterator<T>,
    refinement: PredicateWithIndex<number, T>
  ): readonly [Iterable<T>, Iterable<T>]

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T, B extends T>(
    this: Iterable<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [Iterable<T>, Iterable<B>]

  /**
   * @rewrite partition_ from "@principia/base/Iterable"
   */
  partition<T>(this: Iterable<T>, refinement: PredicateWithIndex<number, T>): readonly [Iterable<T>, Iterable<T>]

  /**
   * @rewrite partitionMap_ from "@principia/base/Iterable"
   */
  partitionMap<T, B, C>(this: Iterable<T>, f: (a: T, i: number) => Either<B, C>): readonly [Iterable<B>, Iterable<C>]

  /**
   * @rewrite partitionMap_ from "@principia/base/Iterable"
   */
  partitionMap<T, B, C>(
    this: IterableIterator<T>,
    f: (a: T, i: number) => Either<B, C>
  ): readonly [Iterable<B>, Iterable<C>]

  /**
   * @rewrite prepend_ from "@principia/base/Iterable"
   */
  prepend<T>(this: Iterable<T>, a: T): Iterable<T>

  /**
   * @rewrite prepend_ from "@principia/base/Iterable"
   */
  prepend<T>(this: IterableIterator<T>, a: T): Iterable<T>

  /**
   * @rewrite take_ from "@principia/base/Iterable"
   */
  take<T>(this: Iterable<T>, n: number): Iterable<T>

  /**
   * @rewrite take_ from "@principia/base/Iterable"
   */
  take<T>(this: IterableIterator<T>, n: number): Iterable<T>

  /**
   * @rewrite toArray from "@principia/base/Iterable"
   */
  toArray<T>(this: Iterable<T>): ReadonlyArray<T>
  /**
   * @rewrite toArray from "@principia/base/Iterable"
   */
  toArray<T>(this: IterableIterator<T>): ReadonlyArray<T>

  /**
   * @rewrite zip_ from "@principia/base/Iterable"
   */
  zip<T, B>(this: Iterable<T>, that: Iterable<B>): Iterable<readonly [T, B]>

  /**
   * @rewrite zip_ from "@principia/base/Iterable"
   */
  zip<T, B>(this: IterableIterator<T>, that: Iterable<B>): Iterable<readonly [T, B]>

  /**
   * @rewrite zipWith_ from "@principia/base/Iterable"
   */
  zipWith<T, B, C>(this: Iterable<T>, that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>

  /**
   * @rewrite zipWith_ from "@principia/base/Iterable"
   */
  zipWith<T, B, C>(this: IterableIterator<T>, that: Iterable<B>, f: (a: T, b: B) => C): Iterable<C>
}

export {}
