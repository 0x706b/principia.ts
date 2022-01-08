import type { Applicative } from '@principia/base/Applicative'
import type { Byte } from '@principia/base/Byte'
import type * as A from '@principia/base/collection/immutable/Array'
import type { MutableNonEmptyArray, NonEmptyArray } from '@principia/base/collection/immutable/NonEmptyArray'
import type { ReadonlyRecord } from '@principia/base/collection/immutable/Record'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type { Monoid } from '@principia/base/Monoid'
import type { Predicate, PredicateWithIndex } from '@principia/base/Predicate'
import type { Eq } from '@principia/base/prelude'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

import * as I from '@principia/base/IO'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  interface ArrayConstructor extends ArrayStaticOps {}
}

interface ArrayStaticOps {
  /**
   * @rewriteStatic Align from "@principia/base/collection/immutable/Array"
   */
  Align: typeof A.Align
  /**
   * @rewriteStatic Alt from "@principia/base/collection/immutable/Array"
   */
  Alt: typeof A.Alt
  /**
   * @rewriteStatic Alternative from "@principia/base/collection/immutable/Array"
   */
  Alternative: typeof A.Alternative
  /**
   * @rewriteStatic Applicative from "@principia/base/collection/immutable/Array"
   */
  Applicative: typeof A.Applicative
  /**
   * @rewriteStatic Apply from "@principia/base/collection/immutable/Array"
   */
  Apply: typeof A.Apply
  /**
   * @rewriteStatic Compactable from "@principia/base/collection/immutable/Array"
   */
  Compactable: typeof A.Compactable
  /**
   * @rewriteStatic Filterable from "@principia/base/collection/immutable/Array"
   */
  Filterable: typeof A.Filterable
  /**
   * @rewriteStatic FilterableWithIndex from "@principia/base/collection/immutable/Array"
   */
  FilterableWithIndex: typeof A.FilterableWithIndex
  /**
   * @rewriteStatic Foldable from "@principia/base/collection/immutable/Array"
   */
  Foldable: typeof A.Foldable
  /**
   * @rewriteStatic FoldableWithIndex from "@principia/base/collection/immutable/Array"
   */
  FoldableWithIndex: typeof A.FoldableWithIndex
  /**
   * @rewriteStatic Functor from "@principia/base/collection/immutable/Array"
   */
  Functor: typeof A.Functor
  /**
   * @rewriteStatic FunctorWithIndex from "@principia/base/collection/immutable/Array"
   */
  FunctorWithIndex: typeof A.FunctorWithIndex
  /**
   * @rewriteStatic Monad from "@principia/base/collection/immutable/Array"
   */
  Monad: typeof A.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/collection/immutable/Array"
   */
  MonoidalFunctor: typeof A.MonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/collection/immutable/Array"
   */
  SemimonoidalFunctor: typeof A.SemimonoidalFunctor
  /**
   * @rewriteStatic Traversable from "@principia/base/collection/immutable/Array"
   */
  Traversable: typeof A.Traversable
  /**
   * @rewriteStatic TraversableWithIndex from "@principia/base/collection/immutable/Array"
   */
  TraversableWithIndex: typeof A.TraversableWithIndex
  /**
   * @rewriteStatic Unfoldable from "@principia/base/collection/immutable/Array"
   */
  Unfoldable: typeof A.Unfoldable
  /**
   * @rewriteStatic Witherable from "@principia/base/collection/immutable/Array"
   */
  Witherable: typeof A.Witherable
  /**
   * @rewriteStatic WitherableWithIndex from "@principia/base/collection/immutable/Array"
   */
  WitherableWithIndex: typeof A.WitherableWithIndex
  /**
   * @rewriteStatic Zip from "@principia/base/collection/immutable/Array"
   */
  Zip: typeof A.Zip
  /**
   * @rewriteStatic empty from "@principia/base/collection/immutable/Array"
   */
  empty: typeof A.empty
  /**
   * @rewriteStatic fromBuffer from "@principia/base/collection/immutable/Array"
   */
  fromBuffer: typeof A.fromBuffer
  /**
   * @rewriteStatic getEq from "@principia/base/collection/immutable/Array"
   */
  getEq: typeof A.getEq
  /**
   * @rewriteStatic getGuard from "@principia/base/collection/immutable/Array"
   */
  getGuard: typeof A.getGuard
  /**
   * @rewriteStatic getMonoid from "@principia/base/collection/immutable/Array"
   */
  getMonoid: typeof A.getMonoid
  /**
   * @rewriteStatic getOrd from "@principia/base/collection/immutable/Array"
   */
  getOrd: typeof A.getOrd
  /**
   * @rewriteStatic getShow from "@principia/base/collection/immutable/Array"
   */
  getShow: typeof A.getShow
  /**
   * @rewriteStatic makeBy from "@principia/base/collection/immutable/Array"
   */
  makeBy: typeof A.makeBy
  /**
   * @rewriteStatic range from "@principia/base/collection/immutable/Array"
   */
  range: typeof A.range
  /**
   * @rewriteStatic replicate from "@principia/base/collection/immutable/Array"
   */
  replicate: typeof A.replicate
  /**
   * @rewriteStatic unfold from "@principia/base/collection/immutable/Array"
   */
  unfold: typeof A.unfold
  /**
   * @rewriteStatic unit from "@principia/base/collection/immutable/Array"
   */
  unit: typeof A.unit
}

export interface ArrayOps {
  /**
   * @rewrite align_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  align<A, B>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<These<A, B>>

  /**
   * @rewrite align_ from "@principia/base/collection/immutable/Array"
   */
  align<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<These<T, B>>

  /**
   * @rewrite alignWith_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  alignWith<A, B, C>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (_: These<A, B>) => C): ReadonlyArray<C>

  /**
   * @rewrite alignWith_ from "@principia/base/collection/immutable/Array"
   */
  alignWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (_: These<T, B>) => C): ReadonlyArray<C>

  /**
   * @rewrite ap_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  ap<A, B>(this: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>): NonEmptyArray<B>

  /**
   * @rewrite ap_ from "@principia/base/collection/immutable/Array"
   */
  ap<A, B>(this: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B>

  /**
   * @rewrite append_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  append<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite append_ from "@principia/base/collection/immutable/Array"
   */
  append<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewrite chain_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  chain<A, B>(this: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>): NonEmptyArray<B>

  /**
   * @rewrite chain_ from "@principia/base/collection/immutable/Array"
   */
  chain<T, B>(this: ReadonlyArray<T>, f: (a: T) => ReadonlyArray<B>): ReadonlyArray<B>

  /**
   * @rewrite chop_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  chop<A, B>(this: NonEmptyArray<A>, f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]): NonEmptyArray<B>

  /**
   * @rewrite chop_ from "@principia/base/collection/immutable/Array"
   */
  chop<T, B>(this: ReadonlyArray<T>, f: (as: ReadonlyArray<T>) => readonly [B, ReadonlyArray<T>]): ReadonlyArray<B>

  /**
   * @rewrite chunksOf_ from "@principia/base/collection/immutable/Array"
   */
  chunksOf<A>(this: NonEmptyArray<A>, n: number): NonEmptyArray<NonEmptyArray<A>>

  /**
   * @rewrite chunksOf_ from "@principia/base/collection/immutable/Array"
   */
  chunksOf<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<ReadonlyArray<T>>

  /**
   * @rewrite collectWhile_ from "@principia/base/collection/immutable/Array"
   */
  collectWhile<A, B>(this: NonEmptyArray<A>, f: (a: A) => Maybe<B>): ReadonlyArray<B>

  /**
   * @rewrite collectWhile_ from "@principia/base/collection/immutable/Array"
   */
  collectWhile<T, B>(this: ReadonlyArray<T>, f: (a: T) => Maybe<B>): ReadonlyArray<B>

  /**
   * @rewrite compact from "@principia/base/collection/immutable/Array"
   */
  compact<A>(this: NonEmptyArray<Maybe<A>>): ReadonlyArray<A>

  /**
   * @rewrite compact from "@principia/base/collection/immutable/Array"
   */
  compact<T>(this: ReadonlyArray<Maybe<T>>): ReadonlyArray<T>

  /**
   * @rewrite concat_ from "@principia/base/collection/immutable/Array"
   */
  concat<T, B>(this: NonEmptyArray<T>, bs: ReadonlyArray<B>): NonEmptyArray<T | B>

  /**
   * @rewrite concat_ from "@principia/base/collection/immutable/Array"
   */
  concat<T, B>(this: ReadonlyArray<T>, bs: NonEmptyArray<B>): NonEmptyArray<T | B>

  /**
   * @rewrite concat_ from "@principia/base/collection/immutable/Array"
   */
  concat<T, B>(this: ReadonlyArray<T>, bs: ReadonlyArray<B>): ReadonlyArray<T | B>

  /**
   * @rewrite cross_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  cross<A, B>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]>

  /**
   * @rewrite cross_ from "@principia/base/collection/immutable/Array"
   */
  cross<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  crossWith<A, B, C>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C>

  /**
   * @rewrite crossWith_ from "@principia/base/collection/immutable/Array"
   */
  crossWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>

  /**
   * @rewrite deleteAt_ from "@principia/base/collection/immutable/Array"
   */
  deleteAt<A>(this: NonEmptyArray<A>, i: number): Maybe<ReadonlyArray<A>>

  /**
   * @rewrite deleteAt_ from "@principia/base/collection/immutable/Array"
   */
  deleteAt<T>(this: ReadonlyArray<T>, i: number): Maybe<ReadonlyArray<T>>

  /**
   * @rewrite drop_ from "@principia/base/collection/immutable/Array"
   */
  drop<A>(this: NonEmptyArray<A>, n: number): ReadonlyArray<A>

  /**
   * @rewrite drop_ from "@principia/base/collection/immutable/Array"
   */
  drop<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite dropLast_ from "@principia/base/collection/immutable/Array"
   */
  dropLast<A>(this: NonEmptyArray<A>, n: number): ReadonlyArray<A>

  /**
   * @rewrite dropLast_ from "@principia/base/collection/immutable/Array"
   */
  dropLast<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite dropLastWhile_ from "@principia/base/collection/immutable/Array"
   */
  dropLastWhile<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): ReadonlyArray<A>

  /**
   * @rewrite dropLastWhile_ from "@principia/base/collection/immutable/Array"
   */
  dropLastWhile<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): ReadonlyArray<T>

  /**
   * @rewrite duplicate from "@principia/base/collection/immutable/Array"
   */
  duplicate<T>(this: ReadonlyArray<T>): ReadonlyArray<ReadonlyArray<T>>

  /**
   * @rewriteConstraint elem_ from "@principia/base/collection/immutable/Array"
   */
  elem<A>(this: NonEmptyArray<A>, E: Eq<A>): (a: A) => boolean

  /**
   * @rewriteConstraint elem_ from "@principia/base/collection/immutable/Array"
   */
  elem<T>(this: ReadonlyArray<T>, E: Eq<T>): (a: T) => boolean

  /**
   * @rewrite extend_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  extend<A, B>(this: NonEmptyArray<A>, f: (as: NonEmptyArray<A>) => B): NonEmptyArray<B>

  /**
   * @rewrite extend_ from "@principia/base/collection/immutable/Array"
   */
  extend<T, B>(this: ReadonlyArray<T>, f: (as: ReadonlyArray<T>) => B): ReadonlyArray<B>

  /**
   * @rewrite filterMap_ from "@principia/base/collection/immutable/Array"
   */
  filterMap<T, B>(this: ReadonlyArray<T>, f: (a: T) => Maybe<B>): ReadonlyArray<B>

  /**
   * @rewrite findLast_ from "@principia/base/collection/immutable/Array"
   */
  findLast<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): Maybe<A>

  /**
   * @rewrite findLast_ from "@principia/base/collection/immutable/Array"
   */
  findLast<A, B extends A>(this: NonEmptyArray<A>, refinement: Refinement<A, B>): Maybe<B>

  /**
   * @rewrite findLast_ from "@principia/base/collection/immutable/Array"
   */
  findLast<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): Maybe<B>

  /**
   * @rewrite findLast_ from "@principia/base/collection/immutable/Array"
   */
  findLast<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<T>

  /**
   * @rewrite findLastIndex_ from "@principia/base/collection/immutable/Array"
   */
  findLastIndex<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): Maybe<number>

  /**
   * @rewrite findLastIndex_ from "@principia/base/collection/immutable/Array"
   */
  findLastIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<number>

  /**
   * @rewrite findLastMap_ from "@principia/base/collection/immutable/Array"
   */
  findLastMap<A, B>(this: NonEmptyArray<A>, f: (a: A) => Maybe<B>): Maybe<B>

  /**
   * @rewrite findLastMap_ from "@principia/base/collection/immutable/Array"
   */
  findLastMap<T, B>(this: ReadonlyArray<T>, f: (a: T) => Maybe<B>): Maybe<B>

  /**
   * @rewrite findMap_ from "@principia/base/collection/immutable/Array"
   */
  findMap<A, B>(this: NonEmptyArray<A>, f: (a: A) => Maybe<B>): Maybe<B>
  /**
   * @rewrite findMap_ from "@principia/base/collection/immutable/Array"
   */
  findMap<T, B>(this: ReadonlyArray<T>, f: (a: T) => Maybe<B>): Maybe<B>

  /**
   * @rewrite flatten from "@principia/base/collection/immutable/NonEmptyArray"
   */
  flatten<T>(this: NonEmptyArray<NonEmptyArray<T>>): NonEmptyArray<T>

  /**
   * @rewrite flatten from "@principia/base/collection/immutable/Array"
   */
  flatten<A>(this: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A>

  /**
   * @rewrite _fold from "@principia/base/collection/immutable/Array"
   */
  fold<M>(this: ReadonlyArray<M>, M: Monoid<M>): M

  /**
   * @rewriteConstraint foldMap_ from "@principia/base/collection/immutable/Array"
   */
  foldMap<T, M>(this: ReadonlyArray<T>, M: Monoid<M>): (f: (a: T) => M) => M

  /**
   * @rewrite foldl_ from "@principia/base/collection/immutable/Array"
   */
  foldl<T, B>(this: ReadonlyArray<T>, b: B, f: (b: B, a: T) => B): B

  /**
   * @rewrite foldlWhile_ from "@principia/base/collection/immutable/Array"
   */
  foldlWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (b: B, a: T) => B): B

  /**
   * @rewrite foldr_ from "@principia/base/collection/immutable/Array"
   */
  foldr<T, B>(this: ReadonlyArray<T>, b: B, f: (a: T, b: B) => B): B

  /**
   * @rewrite foldrWhile_ from "@principia/base/collection/immutable/Array"
   */
  foldrWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (a: T, b: B) => B): B

  /**
   * @rewrite _group from "@principia/base/collection/immutable/Array"
   */
  group<T>(this: ReadonlyArray<T>, E: Eq<T>): ReadonlyArray<NonEmptyArray<T>>

  /**
   * @rewrite _group from "@principia/base/collection/immutable/Array"
   */
  group<T>(this: NonEmptyArray<T>, E: Eq<T>): NonEmptyArray<NonEmptyArray<T>>

  /**
   * @rewrite groupBy_ from "@principia/base/collection/immutable/Array"
   */
  groupBy<T>(this: ReadonlyArray<T>, f: (a: T) => string): ReadonlyRecord<string, NonEmptyArray<T>>

  /**
   * @rewriteGetter head from "@principia/base/collection/immutable/NonEmptyArray"
   */
  head<T>(this: NonEmptyArray<T>): T

  /**
   * @rewriteGetter head from "@principia/base/collection/immutable/Array"
   */
  head<T>(this: ReadonlyArray<T>): Maybe<T>

  /**
   * @rewrite ichain_ from "@principia/base/collection/immutable/Array"
   */
  ichain<T, B>(this: ReadonlyArray<T>, f: (i: number, a: T) => ReadonlyArray<B>): ReadonlyArray<B>

  /**
   * @rewrite ifilterMap_ from "@principia/base/collection/immutable/Array"
   */
  ifilterMap<T, B>(this: ReadonlyArray<T>, f: (i: number, a: T) => Maybe<B>): ReadonlyArray<B>

  /**
   * @rewrite ifindMap_ from "@principia/base/collection/immutable/Array"
   */
  ifindMap<A, B>(this: NonEmptyArray<A>, f: (i: number, a: A) => Maybe<B>): Maybe<B>

  /**
   * @rewrite ifindMap_ from "@principia/base/collection/immutable/Array"
   */
  ifindMap<T, B>(this: ReadonlyArray<T>, f: (i: number, a: T) => Maybe<B>): Maybe<B>

  /**
   * @rewriteConstraint ifoldMap_ from "@principia/base/collection/immutable/Array"
   */
  ifoldMap<T, M>(this: ReadonlyArray<T>, M: Monoid<M>): (f: (i: number, a: T) => M) => M

  /**
   * @rewrite ifoldl_ from "@principia/base/collection/immutable/Array"
   */
  ifoldl<T, B>(this: ReadonlyArray<T>, b: B, f: (i: number, b: B, a: T) => B): B

  /**
   * @rewrite ifoldlWhile_ from "@principia/base/collection/immutable/Array"
   */
  ifoldlWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (i: number, b: B, a: T) => B): B

  /**
   * @rewrite ifoldr_ from "@principia/base/collection/immutable/Array"
   */
  ifoldr<T, B>(this: ReadonlyArray<T>, b: B, f: (i: number, a: T, b: B) => B): B

  /**
   * @rewrite ifoldrWhile_ from "@principia/base/collection/immutable/Array"
   */
  ifoldrWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (i: number, a: T, b: B) => B): B

  /**
   * @rewriteGetter init from "@principia/base/collection/immutable/NonEmptyArray"
   */
  init<T>(this: NonEmptyArray<T>): ReadonlyArray<T>

  /**
   * @rewriteGetter init from "@principia/base/collection/immutable/Array"
   */
  init<T>(this: ReadonlyArray<T>): Maybe<ReadonlyArray<T>>

  /**
   * @rewrite insertAt_ from "@principia/base/collection/immutable/Array"
   */
  insertAt<T>(this: NonEmptyArray<T>, i: number, a: T): Maybe<NonEmptyArray<T>>

  /**
   * @rewrite insertAt_ from "@principia/base/collection/immutable/Array"
   */
  insertAt<T>(this: ReadonlyArray<T>, i: number, a: T): Maybe<NonEmptyArray<T>>

  /**
   * @rewrite intersection_ from "@principia/base/collection/immutable/Array"
   */
  intersection<A>(this: NonEmptyArray<A>, E: Eq<A>): (ys: ReadonlyArray<A>) => NonEmptyArray<A>

  /**
   * @rewriteConstraint intersection_ from "@principia/base/collection/immutable/Array"
   */
  intersection<T>(this: ReadonlyArray<T>, E: Eq<T>): (ys: ReadonlyArray<T>) => ReadonlyArray<T>

  /**
   * @rewrite intersperse_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  intersperse<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite intersperse_ from "@principia/base/collection/immutable/Array"
   */
  intersperse<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewrite ipartition_ from "@principia/base/collection/immutable/Array"
   */
  ipartition<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

  /**
   * @rewrite ipartition_ from "@principia/base/collection/immutable/Array"
   */
  ipartition<T>(
    this: ReadonlyArray<T>,
    predicate: PredicateWithIndex<number, T>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite ipartition_ from "@principia/base/collection/immutable/Array"
   */
  ipartition<A, B extends A>(
    this: NonEmptyArray<A>,
    refinement: RefinementWithIndex<number, A, B>
  ): readonly [ReadonlyArray<A>, ReadonlyArray<B>]

  /**
   * @rewrite ipartition_ from "@principia/base/collection/immutable/Array"
   */
  ipartition<A>(
    this: NonEmptyArray<A>,
    predicate: PredicateWithIndex<number, A>
  ): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

  /**
   * @rewrite ipartitionMap_ from "@principia/base/collection/immutable/Array"
   */
  ipartitionMap<T, B, C>(
    this: ReadonlyArray<T>,
    f: (i: number, a: T) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewrite ipartitionMap_ from "@principia/base/collection/immutable/Array"
   */
  ipartitionMap<A, B, C>(
    this: NonEmptyArray<A>,
    f: (i: number, a: A) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewriteConstraint itraverse_ from "@principia/base/collection/immutable/Array"
   */
  itraverse<A, F extends HKT.HKT, C = HKT.None>(
    this: NonEmptyArray<A>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, B>(
    f: (i: number, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, NonEmptyArray<B>>

  /**
   * @rewriteConstraint itraverse_ from "@principia/base/collection/immutable/Array"
   */
  itraverse<T, F extends HKT.HKT, C = HKT.None>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewriteConstraint iwilt_ from "@principia/base/collection/immutable/Array"
   */
  iwilt<T, F extends HKT.HKT, C = HKT.None>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A, B>(
    f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>

  /**
   * @rewriteConstraint iwither_ from "@principia/base/collection/immutable/Array"
   */
  iwither<T, F extends HKT.HKT, C = HKT.Auto>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (i: number, a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<A>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewrite last from "@principia/base/collection/immutable/NonEmptyArray"
   */
  last<T>(this: NonEmptyArray<T>): T

  /**
   * @rewrite last from "@principia/base/collection/immutable/Array"
   */
  last<T>(this: ReadonlyArray<T>): Maybe<T>

  /**
   * @rewrite lefts from "@principia/base/collection/immutable/Array"
   */
  lefts<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<E>

  /**
   * @rewrite lookup_ from "@principia/base/collection/immutable/Array"
   */
  lookup<T>(this: ReadonlyArray<T>, i: number): Maybe<T>

  /**
   * @rewrite mapAccum_ from "@principia/base/collection/immutable/Array"
   */
  mapAccum<A, S, B>(this: NonEmptyArray<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [NonEmptyArray<B>, S]

  /**
   * @rewrite mapAccum_ from "@principia/base/collection/immutable/Array"
   */
  mapAccum<T, S, B>(this: ReadonlyArray<T>, s: S, f: (s: S, a: T) => readonly [B, S]): readonly [ReadonlyArray<B>, S]

  /**
   * @rewrite modifyAt_ from "@principia/base/collection/immutable/Array"
   */
  modifyAt<T>(this: ReadonlyArray<T>, i: number, f: (a: T) => T): Maybe<ReadonlyArray<T>>

  /**
   * @rewrite modifyAt_ from "@principia/base/collection/immutable/Array"
   */
  modifyAt<A>(this: NonEmptyArray<A>, i: number, f: (a: A) => A): Maybe<NonEmptyArray<A>>

  /**
   * @rewrite mutate_ from "@principia/base/collection/immutable/Array"
   */
  mutate<T>(this: ReadonlyArray<T>, f: (as: Array<T>) => void): ReadonlyArray<T>
  /**
   * @rewrite partition_ from "@principia/base/collection/immutable/Array"
   */
  partition<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: Refinement<T, B>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

  /**
   * @rewrite partition_ from "@principia/base/collection/immutable/Array"
   */
  partition<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]
  /**
   * @rewrite partition_ from "@principia/base/collection/immutable/Array"
   */
  partition<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

  /**
   * @rewrite partition_ from "@principia/base/collection/immutable/Array"
   */
  partition<A, B extends A>(
    this: NonEmptyArray<A>,
    refinement: Refinement<A, B>
  ): readonly [ReadonlyArray<A>, ReadonlyArray<B>]

  /**
   * @rewrite partitionMap_ from "@principia/base/collection/immutable/Array"
   */
  partitionMap<T, B, C>(
    this: ReadonlyArray<T>,
    f: (a: T) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewrite partitionMap_ from "@principia/base/collection/immutable/Array"
   */
  partitionMap<A, B, C>(
    this: NonEmptyArray<A>,
    f: (a: A) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewrite prepend_ from "@principia/base/collection/immutable/Array"
   */
  prepend<A>(this: NonEmptyArray<A>, head: A): NonEmptyArray<A>

  /**
   * @rewrite prepend_ from "@principia/base/collection/immutable/Array"
   */
  prepend<T>(this: ReadonlyArray<T>, head: T): NonEmptyArray<T>

  /**
   * @rewrite prependAll_ from "@principia/base/collection/immutable/Array"
   */
  prependAll<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite prependAll_ from "@principia/base/collection/immutable/Array"
   */
  prependAll<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewrite rights from "@principia/base/collection/immutable/Array"
   */
  rights<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<A>

  /**
   * @rewrite rotate_ from "@principia/base/collection/immutable/Array"
   */
  rotate<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite rotate_ from "@principia/base/collection/immutable/NonEmptyArray"
   */
  rotate<A>(this: NonEmptyArray<A>, n: number): NonEmptyArray<A>

  /**
   * @rewrite scanl_ from "@principia/base/collection/immutable/Array"
   */
  scanl<A, B>(this: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B): ReadonlyArray<B>

  /**
   * @rewrite scanl_ from "@principia/base/collection/immutable/Array"
   */
  scanl<T, B>(this: ReadonlyArray<T>, b: B, f: (b: B, a: T) => B): ReadonlyArray<B>

  /**
   * @rewrite scanr_ from "@principia/base/collection/immutable/Array"
   */
  scanr<A, B>(this: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B): ReadonlyArray<B>

  /**
   * @rewrite scanr_ from "@principia/base/collection/immutable/Array"
   */
  scanr<T, B>(this: ReadonlyArray<T>, b: B, f: (a: T, b: B) => B): ReadonlyArray<B>

  /**
   * @rewrite separate from "@principia/base/collection/immutable/Array"
   */
  separate<E, A>(this: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>]

  /**
   * @rewrite spanl_ from "@principia/base/collection/immutable/Array"
   */
  spanl<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: Refinement<T, B>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<T>]

  /**
   * @rewrite spanl_ from "@principia/base/collection/immutable/Array"
   */
  spanl<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite spanr_ from "@principia/base/collection/immutable/Array"
   */
  spanr<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: Refinement<T, B>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

  /**
   * @rewrite spanr_ from "@principia/base/collection/immutable/Array"
   */
  spanr<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite splitAt_ from "@principia/base/collection/immutable/Array"
   */
  splitAt<T>(this: ReadonlyArray<T>, n: number): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite splitWhere_ from "@principia/base/collection/immutable/Array"
   */
  splitWhere<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewriteGetter tail from "@principia/base/collection/immutable/NonEmptyArray"
   */
  tail<T>(this: NonEmptyArray<T>): ReadonlyArray<T>

  /**
   * @rewriteGetter tail from "@principia/base/collection/immutable/Array"
   */
  tail<T>(this: ReadonlyArray<T>): Maybe<ReadonlyArray<T>>

  /**
   * @rewrite take_ from "@principia/base/collection/immutable/Array"
   */
  take<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite takeLast_ from "@principia/base/collection/immutable/Array"
   */
  takeLast<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite takeWhile_ from "@principia/base/collection/immutable/Array"
   */
  takeWhile<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): ReadonlyArray<T>

  /**
   * @rewrite takeWhile_ from "@principia/base/collection/immutable/Array"
   */
  takeWhile<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): ReadonlyArray<B>

  /**
   * @rewrite identity from "smart:identity"
   */
  toArray<T>(this: Iterable<T>): ReadonlyArray<T>

  /**
   * @rewrite toBuffer from "@principia/base/collection/immutable/Array"
   */
  toBuffer(this: ReadonlyArray<Byte>): Uint8Array

  /**
   * @rewrite toBuffer from "@principia/base/collection/immutable/Array"
   */
  toBuffer(this: ReadonlyArray<Byte>): Uint8Array

  /**
   * @rewriteConstraint traverse_ from "@principia/base/collection/immutable/Array"
   */
  traverse<T, F extends HKT.HKT, C = HKT.None>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewriteConstraint traverse_ from "@principia/base/collection/immutable/Array"
   */
  traverse<A, F extends HKT.HKT, C = HKT.None>(
    this: NonEmptyArray<A>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, NonEmptyArray<B>>

  /**
   * @rewriteConstraint union_ from "@principia/base/collection/immutable/Array"
   */
  union<A>(this: NonEmptyArray<A>, E: Eq<A>): (ys: ReadonlyArray<A>) => NonEmptyArray<A>

  /**
   * @rewriteConstraint union_ from "@principia/base/collection/immutable/Array"
   */
  union<T>(this: ReadonlyArray<T>, E: Eq<T>): (ys: ReadonlyArray<T>) => ReadonlyArray<T>

  /**
   * @rewrite _uniq from "@principia/base/collection/immutable/Array"
   */
  uniq<A>(this: NonEmptyArray<A>, E: Eq<A>): NonEmptyArray<A>

  /**
   * @rewrite _uniq from "@principia/base/collection/immutable/Array"
   */
  uniq<T>(this: ReadonlyArray<T>, E: Eq<T>): ReadonlyArray<T>

  /**
   * @rewrite updateAt_ from "@principia/base/collection/immutable/Array"
   */
  updateAt<A>(this: NonEmptyArray<A>, i: number, a: A): Maybe<NonEmptyArray<A>>

  /**
   * @rewrite updateAt_ from "@principia/base/collection/immutable/Array"
   */
  updateAt<T>(this: ReadonlyArray<T>, i: number, a: T): Maybe<ReadonlyArray<T>>

  /**
   * @rewriteConstraint wilt_ from "@principia/base/collection/immutable/Array"
   */
  wilt<T, F extends HKT.HKT, C = HKT.None>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A, B>(
    f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>

  /**
   * @rewriteConstraint wither_ from "@principia/base/collection/immutable/Array"
   */
  wither<T, F extends HKT.HKT, C = HKT.Auto>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<A>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewrite zip_ from "@principia/base/collection/immutable/Array"
   */
  zip<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

  /**
   * @rewrite zipWith_ from "@principia/base/collection/immutable/Array"
   */
  zipWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>
}

declare global {
  interface Array<T> extends ArrayOps {
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Array"
     */
    filter<T>(this: ReadonlyArray<T>, refinement: Predicate<T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Array"
     */
    filter<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): ReadonlyArray<B>

    /**
     * @rewrite find_ from "@principia/base/collection/immutable/Array"
     */
    find<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): Maybe<B>

    /**
     * @rewrite find_ from "@principia/base/collection/immutable/Array"
     */
    find<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<T>

    /**
     * @rewrite findIndex_ from "@principia/base/collection/immutable/Array"
     */
    findIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<number>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Array"
     */
    ifilter<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Array"
     */
    ifilter<T>(this: ReadonlyArray<T>, refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/Array"
     */
    imap<T, B>(this: MutableNonEmptyArray<T>, f: (i: number, a: T) => B): NonEmptyArray<B>

    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/Array"
     */
    imap<T, B>(this: ReadonlyArray<T>, f: (i: number, a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Array"
     */
    map<T, B>(this: MutableNonEmptyArray<T>, f: (a: T) => B): NonEmptyArray<B>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Array"
     */
    map<T, B>(this: ReadonlyArray<T>, f: (a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite reverse from "@principia/base/collection/immutable/Array"
     */
    reverse<T>(this: MutableNonEmptyArray<T>): NonEmptyArray<T>

    /**
     * @rewrite reverse from "@principia/base/collection/immutable/Array"
     */
    reverse<T>(this: ReadonlyArray<T>): ReadonlyArray<T>
  }
  interface ReadonlyArray<T> extends ArrayOps {
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Array"
     */
    filter<T>(this: ReadonlyArray<T>, predicate: Predicate<number, T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Array"
     */
    filter<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): ReadonlyArray<B>

    /**
     * @rewrite find_ from "@principia/base/collection/immutable/Array"
     */
    find<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<T>

    /**
     * @rewrite find_ from "@principia/base/collection/immutable/Array"
     */
    find<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): Maybe<B>

    /**
     * @rewrite findIndex_ from "@principia/base/collection/immutable/Array"
     */
    findIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Maybe<number>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Array"
     */
    ifilter<T>(this: ReadonlyArray<T>, refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Array"
     */
    ifilter<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite ifind_ from "@principia/base/collection/immutable/Array"
     */
    ifind<T>(this: ReadonlyArray<T>, predicate: PredicateWithIndex<number, T>): Maybe<T>

    /**
     * @rewrite ifind_ from "@principia/base/collection/immutable/Array"
     */
    ifind<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): Maybe<B>

    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/Array"
     */
    imap<T, B>(this: NonEmptyArray<T>, f: (i: number, a: T) => B): NonEmptyArray<B>

    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/Array"
     */
    imap<T, B>(this: ReadonlyArray<T>, f: (i: number, a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Array"
     */
    map<T, B>(this: NonEmptyArray<T>, f: (a: T) => B): NonEmptyArray<B>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Array"
     */
    map<T, B>(this: ReadonlyArray<T>, f: (a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite reverse from "@principia/base/collection/immutable/Array"
     */
    reverse<T>(this: NonEmptyArray<T>): NonEmptyArray<T>

    /**
     * @rewrite reverse from "@principia/base/collection/immutable/Array"
     */
    reverse<T>(this: ReadonlyArray<T>): ReadonlyArray<T>
  }
}

export {}
