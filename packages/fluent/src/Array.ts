import type { Applicative } from '@principia/base/Applicative'
import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Monoid } from '@principia/base/Monoid'
import type { MutableNonEmptyArray, NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { Predicate, PredicateWithIndex } from '@principia/base/Predicate'
import type { Eq } from '@principia/base/prelude'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

import * as I from '@principia/base/IO'

/* eslint typescript-sort-keys/interface: "error" */
export interface ArrayOps {
  /**
   * @rewrite align_ from "@principia/base/NonEmptyArray"
   */
  align<A, B>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<These<A, B>>

  /**
   * @rewrite align_ from "@principia/base/Array"
   */
  align<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<These<T, B>>

  /**
   * @rewrite alignWith_ from "@principia/base/NonEmptyArray"
   */
  alignWith<A, B, C>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (_: These<A, B>) => C): ReadonlyArray<C>

  /**
   * @rewrite alignWith_ from "@principia/base/Array"
   */
  alignWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (_: These<T, B>) => C): ReadonlyArray<C>

  /**
   * @rewrite _ap from "@principia/base/NonEmptyArray"
   */
  ap<A, B>(this: NonEmptyArray<A>, fab: NonEmptyArray<(a: A) => B>): NonEmptyArray<B>

  /**
   * @rewrite _ap from "@principia/base/Array"
   */
  ap<T, B>(this: ReadonlyArray<T>, fab: ReadonlyArray<(a: T) => B>): ReadonlyArray<B>

  /**
   * @rewrite append_ from "@principia/base/NonEmptyArray"
   */
  append<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite append_ from "@principia/base/Array"
   */
  append<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewrite chain_ from "@principia/base/NonEmptyArray"
   */
  chain<A, B>(this: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>): NonEmptyArray<B>

  /**
   * @rewrite chain_ from "@principia/base/Array"
   */
  chain<T, B>(this: ReadonlyArray<T>, f: (a: T, i: number) => ReadonlyArray<B>): ReadonlyArray<B>

  /**
   * @rewrite chop_ from "@principia/base/NonEmptyArray"
   */
  chop<A, B>(this: NonEmptyArray<A>, f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]): NonEmptyArray<B>

  /**
   * @rewrite chop_ from "@principia/base/Array"
   */
  chop<T, B>(this: ReadonlyArray<T>, f: (as: ReadonlyArray<T>) => readonly [B, ReadonlyArray<T>]): ReadonlyArray<B>

  /**
   * @rewrite chunksOf_ from "@principia/base/Array"
   */
  chunksOf<A>(this: NonEmptyArray<A>, n: number): NonEmptyArray<NonEmptyArray<A>>

  /**
   * @rewrite chunksOf_ from "@principia/base/Array"
   */
  chunksOf<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<ReadonlyArray<T>>

  /**
   * @rewrite collectWhile_ from "@principia/base/Array"
   */
  collectWhile<A, B>(this: NonEmptyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B>

  /**
   * @rewrite collectWhile_ from "@principia/base/Array"
   */
  collectWhile<T, B>(this: ReadonlyArray<T>, f: (a: T) => Option<B>): ReadonlyArray<B>

  /**
   * @rewrite compact from "@principia/base/Array"
   */
  compact<A>(this: NonEmptyArray<Option<A>>): ReadonlyArray<A>

  /**
   * @rewrite compact from "@principia/base/Array"
   */
  compact<T>(this: ReadonlyArray<Option<T>>): ReadonlyArray<T>

  /**
   * @rewrite concat_ from "@principia/base/Array"
   */
  concat<T, B>(this: NonEmptyArray<T>, bs: ReadonlyArray<B>): NonEmptyArray<T | B>

  /**
   * @rewrite concat_ from "@principia/base/Array"
   */
  concat<T, B>(this: ReadonlyArray<T>, bs: NonEmptyArray<B>): NonEmptyArray<T | B>

  /**
   * @rewrite concat_ from "@principia/base/Array"
   */
  concat<T, B>(this: ReadonlyArray<T>, bs: ReadonlyArray<B>): ReadonlyArray<T | B>

  /**
   * @rewrite cross_ from "@principia/base/NonEmptyArray"
   */
  cross<A, B>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]>

  /**
   * @rewrite cross_ from "@principia/base/Array"
   */
  cross<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

  /**
   * @rewrite crossWith_ from "@principia/base/NonEmptyArray"
   */
  crossWith<A, B, C>(this: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C>

  /**
   * @rewrite crossWith_ from "@principia/base/Array"
   */
  crossWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>

  /**
   * @rewrite deleteAt_ from "@principia/base/Array"
   */
  deleteAt<A>(this: NonEmptyArray<A>, i: number): Option<ReadonlyArray<A>>

  /**
   * @rewrite deleteAt_ from "@principia/base/Array"
   */
  deleteAt<T>(this: ReadonlyArray<T>, i: number): Option<ReadonlyArray<T>>

  /**
   * @rewrite drop_ from "@principia/base/Array"
   */
  drop<A>(this: NonEmptyArray<A>, n: number): ReadonlyArray<A>

  /**
   * @rewrite drop_ from "@principia/base/Array"
   */
  drop<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite dropLast_ from "@principia/base/Array"
   */
  dropLast<A>(this: NonEmptyArray<A>, n: number): ReadonlyArray<A>

  /**
   * @rewrite dropLast_ from "@principia/base/Array"
   */
  dropLast<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite dropLastWhile_ from "@principia/base/Array"
   */
  dropLastWhile<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): ReadonlyArray<A>

  /**
   * @rewrite dropLastWhile_ from "@principia/base/Array"
   */
  dropLastWhile<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): ReadonlyArray<T>

  /**
   * @rewrite duplicate from "@principia/base/Array"
   */
  duplicate<T>(this: ReadonlyArray<T>): ReadonlyArray<ReadonlyArray<T>>

  /**
   * @rewriteConstraint elem_ from "@principia/base/Array"
   */
  elem<A>(this: NonEmptyArray<A>, E: Eq<A>): (a: A) => boolean

  /**
   * @rewriteConstraint elem_ from "@principia/base/Array"
   */
  elem<T>(this: ReadonlyArray<T>, E: Eq<T>): (a: T) => boolean

  /**
   * @rewrite extend_ from "@principia/base/NonEmptyArray"
   */
  extend<A, B>(this: NonEmptyArray<A>, f: (as: NonEmptyArray<A>) => B): NonEmptyArray<B>

  /**
   * @rewrite extend_ from "@principia/base/Array"
   */
  extend<T, B>(this: ReadonlyArray<T>, f: (as: ReadonlyArray<T>) => B): ReadonlyArray<B>

  /**
   * @rewrite filterMap_ from "@principia/base/Array"
   */
  filterMap<T, B>(this: ReadonlyArray<T>, f: (a: T, i: number) => Option<B>): ReadonlyArray<B>

  /**
   * @rewriteConstraint filterMapA_ from "@principia/base/Array"
   */
  filterMapA<T, F extends HKT.URIS, C = HKT.Auto>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewrite findLast_ from "@principia/base/Array"
   */
  findLast<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): Option<A>

  /**
   * @rewrite findLast_ from "@principia/base/Array"
   */
  findLast<A, B extends A>(this: NonEmptyArray<A>, refinement: Refinement<A, B>): Option<B>

  /**
   * @rewrite findLast_ from "@principia/base/Array"
   */
  findLast<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): Option<B>

  /**
   * @rewrite findLast_ from "@principia/base/Array"
   */
  findLast<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Option<T>

  /**
   * @rewrite findLastIndex_ from "@principia/base/Array"
   */
  findLastIndex<A>(this: NonEmptyArray<A>, predicate: Predicate<A>): Option<number>

  /**
   * @rewrite findLastIndex_ from "@principia/base/Array"
   */
  findLastIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Option<number>

  /**
   * @rewrite findLastMap_ from "@principia/base/Array"
   */
  findLastMap<A, B>(this: NonEmptyArray<A>, f: (a: A) => Option<B>): Option<B>

  /**
   * @rewrite findLastMap_ from "@principia/base/Array"
   */
  findLastMap<T, B>(this: ReadonlyArray<T>, f: (a: T) => Option<B>): Option<B>

  /**
   * @rewrite findMap_ from "@principia/base/Array"
   */
  findMap<A, B>(this: NonEmptyArray<A>, f: (a: A, i: number) => Option<B>): Option<B>

  /**
   * @rewrite findMap_ from "@principia/base/Array"
   */
  findMap<T, B>(this: ReadonlyArray<T>, f: (a: T) => Option<B>): Option<B>

  /**
   * @rewrite flatten from "@principia/base/NonEmptyArray"
   */
  flatten<T>(this: NonEmptyArray<NonEmptyArray<T>>): NonEmptyArray<T>

  /**
   * @rewrite flatten from "@principia/base/Array"
   */
  flatten<A>(this: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A>

  /**
   * @rewrite _fold from "@principia/base/Array"
   */
  fold<M>(this: ReadonlyArray<M>, M: Monoid<M>): M

  /**
   * @rewriteConstraint foldMap_ from "@principia/base/Array"
   */
  foldMap<T, M>(this: ReadonlyArray<T>, M: Monoid<M>): (f: (a: T, i: number) => M) => M

  /**
   * @rewrite foldl_ from "@principia/base/Array"
   */
  foldl<T, B>(this: ReadonlyArray<T>, b: B, f: (b: B, a: T, i: number) => B): B

  /**
   * @rewrite foldlWhile_ from "@principia/base/Array"
   */
  foldlWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (b: B, a: T, i: number) => B): B

  /**
   * @rewrite foldr_ from "@principia/base/Array"
   */
  foldr<T, B>(this: ReadonlyArray<T>, b: B, f: (a: T, b: B, i: number) => B): B

  /**
   * @rewrite foldrWhile_ from "@principia/base/Array"
   */
  foldrWhile<T, B>(this: ReadonlyArray<T>, b: B, predicate: Predicate<B>, f: (a: T, b: B, i: number) => B): B

  /**
   * @rewrite _group from "@principia/base/Array"
   */
  group<T>(this: NonEmptyArray<T>, E: Eq<T>): NonEmptyArray<NonEmptyArray<T>>

  /**
   * @rewrite _group from "@principia/base/Array"
   */
  group<T>(this: ReadonlyArray<T>, E: Eq<T>): ReadonlyArray<NonEmptyArray<T>>

  /**
   * @rewrite groupBy_ from "@principia/base/Array"
   */
  groupBy<T>(this: ReadonlyArray<T>, f: (a: T) => string): ReadonlyRecord<string, NonEmptyArray<T>>

  /**
   * @rewriteGetter head from "@principia/base/NonEmptyArray"
   */
  head<T>(this: NonEmptyArray<T>): T

  /**
   * @rewriteGetter head from "@principia/base/Array"
   */
  head<T>(this: ReadonlyArray<T>): Option<T>

  /**
   * @rewriteGetter init from "@principia/base/NonEmptyArray"
   */
  init<T>(this: NonEmptyArray<T>): ReadonlyArray<T>

  /**
   * @rewriteGetter init from "@principia/base/Array"
   */
  init<T>(this: ReadonlyArray<T>): Option<ReadonlyArray<T>>

  /**
   * @rewrite insertAt_ from "@principia/base/Array"
   */
  insertAt<T>(this: NonEmptyArray<T>, i: number, a: T): Option<NonEmptyArray<T>>

  /**
   * @rewrite insertAt_ from "@principia/base/Array"
   */
  insertAt<T>(this: ReadonlyArray<T>, i: number, a: T): Option<NonEmptyArray<T>>

  /**
   * @rewrite intersection_ from "@principia/base/Array"
   */
  intersection<A>(this: NonEmptyArray<A>, E: Eq<A>): (ys: ReadonlyArray<A>) => NonEmptyArray<A>

  /**
   * @rewriteConstraint intersection_ from "@principia/base/Array"
   */
  intersection<T>(this: ReadonlyArray<T>, E: Eq<T>): (ys: ReadonlyArray<T>) => ReadonlyArray<T>

  /**
   * @rewrite intersperse_ from "@principia/base/NonEmptyArray"
   */
  intersperse<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite intersperse_ from "@principia/base/Array"
   */
  intersperse<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewriteGetter last from "@principia/base/NonEmptyArray"
   */
  last<T>(this: NonEmptyArray<T>): T

  /**
   * @rewriteGetter last from "@principia/base/Array"
   */
  last<T>(this: ReadonlyArray<T>): Option<T>

  /**
   * @rewrite lefts from "@principia/base/Array"
   */
  lefts<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<E>

  /**
   * @rewrite lookup_ from "@principia/base/Array"
   */
  lookup<T>(this: ReadonlyArray<T>, i: number): Option<T>

  /**
   * @rewrite _mapA from "@principia/base/Array"
   */
  mapA<A, F extends HKT.URIS, C = HKT.Auto>(
    this: NonEmptyArray<A>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, B>(
    f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, NonEmptyArray<B>>

  /**
   * @rewriteConstraint mapA_ from "@principia/base/Array"
   */
  mapA<T, F extends HKT.URIS, C>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

  /**
   * @rewrite mapAccum_ from "@principia/base/Array"
   */
  mapAccum<A, S, B>(this: NonEmptyArray<A>, s: S, f: (s: S, a: A) => readonly [B, S]): readonly [NonEmptyArray<B>, S]

  /**
   * @rewrite mapAccum_ from "@principia/base/Array"
   */
  mapAccum<T, S, B>(this: ReadonlyArray<T>, s: S, f: (s: S, a: T) => readonly [B, S]): readonly [ReadonlyArray<B>, S]

  /**
   * @rewrite modifyAt_ from "@principia/base/Array"
   */
  modifyAt<A>(this: NonEmptyArray<A>, i: number, f: (a: A) => A): Option<NonEmptyArray<A>>

  /**
   * @rewrite modifyAt_ from "@principia/base/Array"
   */
  modifyAt<T>(this: ReadonlyArray<T>, i: number, f: (a: T) => T): Option<ReadonlyArray<T>>

  /**
   * @rewrite mutate_ from "@principia/base/Array"
   */
  mutate<T>(this: ReadonlyArray<T>, f: (as: Array<T>) => void): ReadonlyArray<T>

  /**
   * @rewrite partition_ from "@principia/base/Array"
   */
  partition<A>(
    this: NonEmptyArray<A>,
    predicate: PredicateWithIndex<number, A>
  ): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

  /**
   * @rewrite partition_ from "@principia/base/Array"
   */
  partition<A, B extends A>(
    this: NonEmptyArray<A>,
    refinement: RefinementWithIndex<number, A, B>
  ): readonly [ReadonlyArray<A>, ReadonlyArray<B>]

  /**
   * @rewrite partition_ from "@principia/base/Array"
   */
  partition<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: RefinementWithIndex<number, T, B>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<B>]
  /**
   * @rewrite partition_ from "@principia/base/Array"
   */
  partition<T>(
    this: ReadonlyArray<T>,
    predicate: PredicateWithIndex<number, T>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite partitionMap_ from "@principia/base/Array"
   */
  partitionMap<A, B, C>(
    this: NonEmptyArray<A>,
    f: (a: A, i: number) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewrite partitionMap_ from "@principia/base/Array"
   */
  partitionMap<T, B, C>(
    this: ReadonlyArray<T>,
    f: (a: T, i: number) => Either<B, C>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

  /**
   * @rewriteConstraint partitionMapA_ from "@principia/base/Array"
   */
  partitionMapA<T, F extends HKT.URIS, C = HKT.Auto>(
    this: ReadonlyArray<T>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E, A, B>(
    f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>

  /**
   * @rewrite prepend_ from "@principia/base/Array"
   */
  prepend<A>(this: NonEmptyArray<A>, head: A): NonEmptyArray<A>

  /**
   * @rewrite prepend_ from "@principia/base/Array"
   */
  prepend<T>(this: ReadonlyArray<T>, head: T): NonEmptyArray<T>

  /**
   * @rewrite prependAll_ from "@principia/base/Array"
   */
  prependAll<A>(this: NonEmptyArray<A>, a: A): NonEmptyArray<A>

  /**
   * @rewrite prependAll_ from "@principia/base/Array"
   */
  prependAll<T>(this: ReadonlyArray<T>, a: T): ReadonlyArray<T>

  /**
   * @rewrite rights from "@principia/base/Array"
   */
  rights<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<A>

  /**
   * @rewrite rotate_ from "@principia/base/NonEmptyArray"
   */
  rotate<A>(this: NonEmptyArray<A>, n: number): NonEmptyArray<A>

  /**
   * @rewrite rotate_ from "@principia/base/Array"
   */
  rotate<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite scanl_ from "@principia/base/Array"
   */
  scanl<A, B>(this: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B): ReadonlyArray<B>

  /**
   * @rewrite scanl_ from "@principia/base/Array"
   */
  scanl<T, B>(this: ReadonlyArray<T>, b: B, f: (b: B, a: T) => B): ReadonlyArray<B>

  /**
   * @rewrite scanr_ from "@principia/base/Array"
   */
  scanr<A, B>(this: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B): ReadonlyArray<B>

  /**
   * @rewrite scanr_ from "@principia/base/Array"
   */
  scanr<T, B>(this: ReadonlyArray<T>, b: B, f: (a: T, b: B) => B): ReadonlyArray<B>

  /**
   * @rewrite separate from "@principia/base/Array"
   */
  separate<E, A>(this: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>]

  /**
   * @rewrite spanl_ from "@principia/base/Array"
   */
  spanl<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite spanl_ from "@principia/base/Array"
   */
  spanl<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: Refinement<T, B>
  ): readonly [ReadonlyArray<B>, ReadonlyArray<T>]

  /**
   * @rewrite spanr_ from "@principia/base/Array"
   */
  spanr<T, B extends T>(
    this: ReadonlyArray<T>,
    refinement: Refinement<T, B>
  ): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

  /**
   * @rewrite spanr_ from "@principia/base/Array"
   */
  spanr<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite splitAt_ from "@principia/base/Array"
   */
  splitAt<T>(this: ReadonlyArray<T>, n: number): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewrite splitWhere_ from "@principia/base/Array"
   */
  splitWhere<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

  /**
   * @rewriteGetter tail from "@principia/base/NonEmptyArray"
   */
  tail<T>(this: NonEmptyArray<T>): ReadonlyArray<T>

  /**
   * @rewriteGetter tail from "@principia/base/Array"
   */
  tail<T>(this: ReadonlyArray<T>): Option<ReadonlyArray<T>>

  /**
   * @rewrite take_ from "@principia/base/Array"
   */
  take<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite takeLast_ from "@principia/base/Array"
   */
  takeLast<T>(this: ReadonlyArray<T>, n: number): ReadonlyArray<T>

  /**
   * @rewrite takeWhile_ from "@principia/base/Array"
   */
  takeWhile<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): ReadonlyArray<T>

  /**
   * @rewrite takeWhile_ from "@principia/base/Array"
   */
  takeWhile<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): ReadonlyArray<B>

  /**
   * @rewrite identity from "smart:identity"
   */
  toArray<T>(this: Iterable<T>): ReadonlyArray<T>

  /**
   * @rewrite toBuffer from "@principia/base/Array"
   */
  toBuffer(this: ReadonlyArray<Byte>): Uint8Array

  /**
   * @rewrite toBuffer from "@principia/base/Array"
   */
  toBuffer(this: ReadonlyArray<Byte>): Uint8Array

  /**
   * @rewriteConstraint union_ from "@principia/base/Array"
   */
  union<A>(this: NonEmptyArray<A>, E: Eq<A>): (ys: ReadonlyArray<A>) => NonEmptyArray<A>

  /**
   * @rewriteConstraint union_ from "@principia/base/Array"
   */
  union<T>(this: ReadonlyArray<T>, E: Eq<T>): (ys: ReadonlyArray<T>) => ReadonlyArray<T>

  /**
   * @rewrite _uniq from "@principia/base/Array"
   */
  uniq<A>(this: NonEmptyArray<A>, E: Eq<A>): NonEmptyArray<A>

  /**
   * @rewrite _uniq from "@principia/base/Array"
   */
  uniq<T>(this: ReadonlyArray<T>, E: Eq<T>): ReadonlyArray<T>

  /**
   * @rewrite updateAt_ from "@principia/base/Array"
   */
  updateAt<A>(this: NonEmptyArray<A>, i: number, a: A): Option<NonEmptyArray<A>>

  /**
   * @rewrite updateAt_ from "@principia/base/Array"
   */
  updateAt<T>(this: ReadonlyArray<T>, i: number, a: T): Option<ReadonlyArray<T>>

  /**
   * @rewrite zip_ from "@principia/base/Array"
   */
  zip<T, B>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

  /**
   * @rewrite zipWith_ from "@principia/base/Array"
   */
  zipWith<T, B, C>(this: ReadonlyArray<T>, fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>
}

declare global {
  interface Array<T> extends ArrayOps {
    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<T>(this: ReadonlyArray<T>, refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<T, B extends T>(this: ReadonlyArray<T>, refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Option<T>

    /**
     * @rewrite findIndex_ from "@principia/base/Array"
     */
    findIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Option<number>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<T, B>(this: MutableNonEmptyArray<T>, f: (a: T, i: number) => B): NonEmptyArray<B>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<T, B>(this: ReadonlyArray<T>, f: (a: T, i: number) => B): ReadonlyArray<B>

    /**
     * @rewrite reverse from "@principia/base/Array"
     */
    reverse<T>(this: MutableNonEmptyArray<T>): NonEmptyArray<T>

    /**
     * @rewrite reverse from "@principia/base/Array"
     */
    reverse<T>(this: ReadonlyArray<T>): ReadonlyArray<T>
  }
  interface ReadonlyArray<T> extends ArrayOps {
    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<T>(this: ReadonlyArray<T>, refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<T, B extends T>(this: ReadonlyArray<T>, refinement: RefinementWithIndex<number, T, B>): Option<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<T>(this: ReadonlyArray<T>, predicate: PredicateWithIndex<number, T>): Option<T>

    /**
     * @rewrite findIndex_ from "@principia/base/Array"
     */
    findIndex<T>(this: ReadonlyArray<T>, predicate: Predicate<T>): Option<number>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<T, B>(this: NonEmptyArray<T>, f: (a: T, i: number) => B): NonEmptyArray<B>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<T, B>(this: ReadonlyArray<T>, f: (a: T, i: number) => B): ReadonlyArray<B>

    /**
     * @rewrite reverse from "@principia/base/Array"
     */
    reverse<T>(this: NonEmptyArray<T>): NonEmptyArray<T>

    /**
     * @rewrite reverse from "@principia/base/Array"
     */
    reverse<T>(this: ReadonlyArray<T>): ReadonlyArray<T>
  }
}

export {}
