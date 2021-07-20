import type { Applicative } from '@principia/base/Applicative'
import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Monoid } from '@principia/base/Monoid'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { Predicate, PredicateWithIndex } from '@principia/base/Predicate'
import type { Eq } from '@principia/base/prelude'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

import * as I from '@principia/base/IO'

declare global {
  export interface Array<T> {
    /**
     * @rewrite align_ from "@principia/base/Array"
     */
    align<B>(fb: ReadonlyArray<B>): ReadonlyArray<These<T, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/Array"
     */
    alignWith<B, C>(fb: ReadonlyArray<B>, f: (_: These<T, B>) => C): ReadonlyArray<C>

    /**
     * @rewrite _ap from "@principia/base/Array"
     */
    ap<B>(fab: ReadonlyArray<(a: T) => B>): ReadonlyArray<B>

    /**
     * @rewrite append_ from "@principia/base/Array"
     */
    append(a: T): NonEmptyArray<T>

    /**
     * @rewrite chain_ from "@principia/base/Array"
     */
    chain<B>(f: (a: T, i: number) => ReadonlyArray<B>): ReadonlyArray<B>

    /**
     * @rewrite chop_ from "@principia/base/Array"
     */
    chop<B>(f: (as: ReadonlyArray<T>) => readonly [B, ReadonlyArray<T>]): ReadonlyArray<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/Array"
     */
    chunksOf(n: number): ReadonlyArray<ReadonlyArray<T>>

    /**
     * @rewrite collectWhile_ from "@principia/base/Array"
     */
    collectWhile<B>(f: (a: T) => Option<B>): ReadonlyArray<B>
    /**
     * @rewrite compact from "@principia/base/Array"
     */
    compact<A>(this: ReadonlyArray<Option<A>>): ReadonlyArray<A>

    /**
     * @rewrite concat_ from "@principia/base/Array"
     */
    concat<B>(bs: NonEmptyArray<B>): NonEmptyArray<T | B>

    /**
     * @rewrite concat_ from "@principia/base/Array"
     */
    concat<B>(bs: ReadonlyArray<B>): ReadonlyArray<T | B>

    /**
     * @rewrite cross_ from "@principia/base/Array"
     */
    cross<B>(fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Array"
     */
    crossWith<B, C>(fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>

    /**
     * @rewrite deleteAt_ from "@principia/base/Array"
     */
    deleteAt(i: number): Option<ReadonlyArray<T>>

    /**
     * @rewrite drop_ from "@principia/base/Array"
     */
    drop(n: number): ReadonlyArray<T>

    /**
     * @rewrite dropLast_ from "@principia/base/Array"
     */
    dropLast(n: number): ReadonlyArray<T>

    /**
     * @rewrite dropLastWhile_ from "@principia/base/Array"
     */
    dropLastWhile(predicate: Predicate<T>): ReadonlyArray<T>

    /**
     * @rewriteGetter duplicate from "@principia/base/Array"
     */
    duplicate: ReadonlyArray<ReadonlyArray<T>>

    /**
     * @rewrite _elem from "@principia/base/Array"
     */
    elem(E: Eq<T>, a: T): boolean

    /**
     * @rewrite extend_ from "@principia/base/Array"
     */
    extend<B>(f: (as: ReadonlyArray<T>) => B): ReadonlyArray<B>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter(refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<B extends T>(refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Array"
     */
    filterMap<B>(f: (a: T, i: number) => Option<B>): ReadonlyArray<B>

    /**
     * @rewrite _filterMapA from "@principia/base/Array"
     */
    filterMapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<B extends T>(refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find(predicate: Predicate<T>): Option<T>

    /**
     * @rewrite findIndex_ from "@principia/base/Array"
     */
    findIndex(predicate: Predicate<T>): Option<number>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast<B extends T>(refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast(predicate: Predicate<T>): Option<T>

    /**
     * @rewrite findLastIndex_ from "@principia/base/Array"
     */
    findLastIndex(predicate: Predicate<T>): Option<number>

    /**
     * @rewrite findLastMap_ from "@principia/base/Array"
     */
    findLastMap<B>(f: (a: T) => Option<B>): Option<B>

    /**
     * @rewrite findMap_ from "@principia/base/Array"
     */
    findMap<B>(f: (a: T) => Option<B>): Option<B>

    /**
     * @rewrite flatten from "@principia/base/Array"
     */
    flatten<A>(this: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A>

    /**
     * @rewrite _fold from "@principia/base/Array"
     */
    fold<M>(this: ReadonlyArray<M>, M: Monoid<M>): M
    /**
     * @rewrite _foldMap from "@principia/base/Array"
     */
    foldMap<M>(M: Monoid<M>, f: (a: T, i: number) => M): M

    /**
     * @rewrite foldl_ from "@principia/base/Array"
     */
    foldl<B>(b: B, f: (b: B, a: T, i: number) => B): B

    /**
     * @rewrite foldlWhile_ from "@principia/base/Array"
     */
    foldlWhile<B>(b: B, predicate: PredicateWithIndex<number, B>, f: (b: B, a: T) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Array"
     */
    foldr<B>(b: B, f: (a: T, b: B, i: number) => B): B

    /**
     * @rewrite foldrWhile_ from "@principia/base/Array"
     */
    foldrWhile<B>(b: B, f: (a: T, b: B, i: number) => B): B

    /**
     * @rewrite _group from "@principia/base/Array"
     */
    group(E: Eq<T>): ReadonlyArray<NonEmptyArray<T>>

    /**
     * @rewrite groupBy_ from "@principia/base/Array"
     */
    groupBy(f: (a: T) => string): ReadonlyRecord<string, NonEmptyArray<T>>

    /**
     * @rewriteGetter head from "@principia/base/Array"
     */
    head: Option<T>

    /**
     * @rewriteGetter init from "@principia/base/Array"
     */
    init: Option<ReadonlyArray<T>>

    /**
     * @rewrite insertAt_ from "@principia/base/Array"
     */
    insertAt(i: number, a: T): Option<NonEmptyArray<T>>

    /**
     * @rewrite _intersection from "@principia/base/Array"
     */
    intersection(E: Eq<T>, ys: ReadonlyArray<T>): ReadonlyArray<T>

    /**
     * @rewrite intersperse_ from "@principia/base/Array"
     */
    intersperse(a: T): ReadonlyArray<T>

    /**
     * @rewriteGetter last from "@principia/base/Array"
     */
    last: Option<T>

    /**
     * @rewrite lefts from "@principia/base/Array"
     */
    lefts<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<E>

    /**
     * @rewrite lookup_ from "@principia/base/Array"
     */
    lookup(i: number): Option<T>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<B>(f: (a: T, i: number) => B): ReadonlyArray<B>

    /**
     * @rewrite _mapA from "@principia/base/Array"
     */
    mapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

    /**
     * @rewrite mapAccum_ from "@principia/base/Array"
     */
    mapAccum<S, B>(s: S, f: (s: S, a: T) => readonly [B, S]): readonly [ReadonlyArray<B>, S]

    /**
     * @rewrite modifyAt_ from "@principia/base/Array"
     */
    modifyAt(i: number, f: (a: T) => T): Option<ReadonlyArray<T>>

    /**
     * @rewrite mutate_ from "@principia/base/Array"
     */
    mutate(f: (as: Array<T>) => void): ReadonlyArray<T>

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition(predicate: PredicateWithIndex<number, T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition<B extends T>(refinement: RefinementWithIndex<number, T, B>): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Array"
     */
    partitionMap<B, C>(f: (a: T, i: number) => Either<B, C>): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

    /**
     * @rewrite _partitionMapA from "@principia/base/Array"
     */
    partitionMapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, B, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>

    /**
     * @rewrite prepend_ from "@principia/base/Array"
     */
    prepend(head: T): NonEmptyArray<T>

    /**
     * @rewrite prependAll_ from "@principia/base/Array"
     */
    prependAll(a: T): ReadonlyArray<T>

    /**
     * @rewriteGetter reverse from "@principia/base/Array"
     */
    reverse(): ReadonlyArray<T>

    /**
     * @rewrite rights from "@principia/base/Array"
     */
    rights<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<A>

    /**
     * @rewrite rotate_ from "@principia/base/Array"
     */
    rotate(n: number): ReadonlyArray<T>

    /**
     * @rewrite scanl_ from "@principia/base/Array"
     */
    scanl<B>(b: B, f: (b: B, a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite scanr_ from "@principia/base/Array"
     */
    scanr<B>(b: B, f: (a: T, b: B) => B): ReadonlyArray<B>

    /**
     * @rewrite separate from "@principia/base/Array"
     */
    separate<E, A>(this: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>]

    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl<B extends T>(refinement: Refinement<T, B>): readonly [ReadonlyArray<B>, ReadonlyArray<T>]

    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr<B extends T>(refinement: Refinement<T, B>): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

    /**
     * @rewrite splitAt_ from "@principia/base/Array"
     */
    splitAt(n: number): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite splitWhere_ from "@principia/base/Array"
     */
    splitWhere(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewriteGetter tail from "@principia/base/Array"
     */
    tail: Option<ReadonlyArray<T>>

    /**
     * @rewrite take_ from "@principia/base/Array"
     */
    take(n: number): ReadonlyArray<T>

    /**
     * @rewrite takeLast_ from "@principia/base/Array"
     */
    takeLast(n: number): ReadonlyArray<T>

    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile<B extends T>(refinement: Refinement<T, B>): ReadonlyArray<B>

    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile(predicate: Predicate<T>): ReadonlyArray<T>

    /**
     * @rewrite _union from "@principia/base/Array"
     */
    union(E: Eq<T>, ys: ReadonlyArray<T>): ReadonlyArray<T>

    /**
     * @rewrite _uniq from "@principia/base/Array"
     */
    uniq(E: Eq<T>): ReadonlyArray<T>

    /**
     * @rewrite updateAt_ from "@principia/base/Array"
     */
    updateAt(i: number, a: T): Option<ReadonlyArray<T>>

    /**
     * @rewrite zip_ from "@principia/base/Array"
     */
    zip<B>(fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Array"
     */
    zipWith<B, C>(fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>
  }

  export interface ReadonlyArray<T> {
    /**
     * @rewrite align_ from "@principia/base/Array"
     */
    align<B>(fb: ReadonlyArray<B>): ReadonlyArray<These<T, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/Array"
     */
    alignWith<B, C>(fb: ReadonlyArray<B>, f: (_: These<T, B>) => C): ReadonlyArray<C>

    /**
     * @rewrite _ap from "@principia/base/Array"
     */
    ap<B>(fab: ReadonlyArray<(a: T) => B>): ReadonlyArray<B>

    /**
     * @rewrite append_ from "@principia/base/Array"
     */
    append(a: T): NonEmptyArray<T>

    /**
     * @rewrite chain_ from "@principia/base/Array"
     */
    chain<B>(f: (a: T, i: number) => ReadonlyArray<B>): ReadonlyArray<B>

    /**
     * @rewrite chop_ from "@principia/base/Array"
     */
    chop<B>(f: (as: ReadonlyArray<T>) => readonly [B, ReadonlyArray<T>]): ReadonlyArray<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/Array"
     */
    chunksOf(n: number): ReadonlyArray<ReadonlyArray<T>>

    /**
     * @rewrite collectWhile_ from "@principia/base/Array"
     */
    collectWhile<B>(f: (a: T) => Option<B>): ReadonlyArray<B>
    /**
     * @rewrite compact from "@principia/base/Array"
     */
    compact<A>(this: ReadonlyArray<Option<A>>): ReadonlyArray<A>

    /**
     * @rewrite concat_ from "@principia/base/Array"
     */
    concat<B>(bs: NonEmptyArray<B>): NonEmptyArray<T | B>

    /**
     * @rewrite concat_ from "@principia/base/Array"
     */
    concat<B>(bs: ReadonlyArray<B>): ReadonlyArray<T | B>

    /**
     * @rewrite cross_ from "@principia/base/Array"
     */
    cross<B>(fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Array"
     */
    crossWith<B, C>(fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>

    /**
     * @rewrite deleteAt_ from "@principia/base/Array"
     */
    deleteAt(i: number): Option<ReadonlyArray<T>>

    /**
     * @rewrite drop_ from "@principia/base/Array"
     */
    drop(n: number): ReadonlyArray<T>

    /**
     * @rewrite dropLast_ from "@principia/base/Array"
     */
    dropLast(n: number): ReadonlyArray<T>

    /**
     * @rewrite dropLastWhile_ from "@principia/base/Array"
     */
    dropLastWhile(predicate: Predicate<T>): ReadonlyArray<T>

    /**
     * @rewriteGetter duplicate from "@principia/base/Array"
     */
    duplicate: ReadonlyArray<ReadonlyArray<T>>

    /**
     * @rewrite _elem from "@principia/base/Array"
     */
    elem(E: Eq<T>, a: T): boolean

    /**
     * @rewrite extend_ from "@principia/base/Array"
     */
    extend<B>(f: (as: ReadonlyArray<T>) => B): ReadonlyArray<B>
    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter(refinement: PredicateWithIndex<number, T>): ReadonlyArray<T>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<B extends T>(refinement: RefinementWithIndex<number, T, B>): ReadonlyArray<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Array"
     */
    filterMap<B>(f: (a: T, i: number) => Option<B>): ReadonlyArray<B>

    /**
     * @rewriteConstraint filterMapA_ from "@principia/base/Array"
     */
    filterMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>
    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<B extends T>(refinement: RefinementWithIndex<number, T, B>): Option<B>

    find(predicate: PredicateWithIndex<number, T>): Option<T>

    /**
     * @rewrite findIndex_ from "@principia/base/Array"
     */
    findIndex(predicate: Predicate<T>): Option<number>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast(predicate: Predicate<T>): Option<T>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast<B extends T>(refinement: Refinement<T, B>): Option<B>

    /**
     * @rewrite findLastIndex_ from "@principia/base/Array"
     */
    findLastIndex(predicate: Predicate<T>): Option<number>

    /**
     * @rewrite findLastMap_ from "@principia/base/Array"
     */
    findLastMap<B>(f: (a: T) => Option<B>): Option<B>

    /**
     * @rewrite findMap_ from "@principia/base/Array"
     */
    findMap<B>(f: (a: T) => Option<B>): Option<B>

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
    foldMap<M>(M: Monoid<M>): (f: (a: T, i: number) => M) => M

    /**
     * @rewrite foldl_ from "@principia/base/Array"
     */
    foldl<B>(b: B, f: (b: B, a: T, i: number) => B): B

    /**
     * @rewrite foldlWhile_ from "@principia/base/Array"
     */
    foldlWhile<B>(b: B, predicate: Predicate<B>, f: (b: B, a: T, i: number) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/Array"
     */
    foldr<B>(b: B, f: (a: T, b: B, i: number) => B): B

    /**
     * @rewrite foldrWhile_ from "@principia/base/Array"
     */
    foldrWhile<B>(b: B, predicate: Predicate<B>, f: (a: T, b: B, i: number) => B): B

    /**
     * @rewrite _group from "@principia/base/Array"
     */
    group(E: Eq<T>): ReadonlyArray<NonEmptyArray<T>>

    /**
     * @rewrite groupBy_ from "@principia/base/Array"
     */
    groupBy(f: (a: T) => string): ReadonlyRecord<string, NonEmptyArray<T>>
    /**
     * @rewriteGetter head from "@principia/base/Array"
     */
    head: Option<T>

    /**
     * @rewriteGetter init from "@principia/base/Array"
     */
    init: Option<ReadonlyArray<T>>

    /**
     * @rewrite insertAt_ from "@principia/base/Array"
     */
    insertAt(i: number, a: T): Option<NonEmptyArray<T>>

    /**
     * @rewrite _intersection from "@principia/base/Array"
     */
    intersection(E: Eq<T>, ys: ReadonlyArray<T>): ReadonlyArray<T>

    /**
     * @rewrite intersperse_ from "@principia/base/Array"
     */
    intersperse(a: T): ReadonlyArray<T>

    /**
     * @rewriteGetter last from "@principia/base/Array"
     */
    last: Option<T>

    /**
     * @rewrite lefts from "@principia/base/Array"
     */
    lefts<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<E>

    /**
     * @rewrite lookup_ from "@principia/base/Array"
     */
    lookup(i: number): Option<T>

    /**
     * @rewrite map_ from "@principia/base/Array"
     */
    map<B>(f: (a: T, i: number) => B): ReadonlyArray<B>

    /**
     * @rewriteConstraint mapA_ from "@principia/base/Array"
     */
    mapA<F extends HKT.URIS, C>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

    /**
     * @rewrite mapAccum_ from "@principia/base/Array"
     */
    mapAccum<S, B>(s: S, f: (s: S, a: T) => readonly [B, S]): readonly [ReadonlyArray<B>, S]

    /**
     * @rewrite modifyAt_ from "@principia/base/Array"
     */
    modifyAt(i: number, f: (a: T) => T): Option<ReadonlyArray<T>>

    /**
     * @rewrite mutate_ from "@principia/base/Array"
     */
    mutate(f: (as: Array<T>) => void): ReadonlyArray<T>

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition(predicate: PredicateWithIndex<number, T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition<B extends T>(refinement: RefinementWithIndex<number, T, B>): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Array"
     */
    partitionMap<B, C>(f: (a: T, i: number) => Either<B, C>): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

    /**
     * @rewriteConstraint partitionMapA_ from "@principia/base/Array"
     */
    partitionMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A, B>(
      f: (a: T, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>
    /**
     * @rewrite prepend_ from "@principia/base/Array"
     */
    prepend(head: T): NonEmptyArray<T>

    /**
     * @rewrite prependAll_ from "@principia/base/Array"
     */
    prependAll(a: T): ReadonlyArray<T>

    /**
     * @rewriteGetter reverse from "@principia/base/Array"
     */
    reverse: ReadonlyArray<T>

    /**
     * @rewrite rights from "@principia/base/Array"
     */
    rights<E, A>(this: ReadonlyArray<Either<E, A>>): ReadonlyArray<A>

    /**
     * @rewrite rotate_ from "@principia/base/Array"
     */
    rotate(n: number): ReadonlyArray<T>

    /**
     * @rewrite scanl_ from "@principia/base/Array"
     */
    scanl<B>(b: B, f: (b: B, a: T) => B): ReadonlyArray<B>

    /**
     * @rewrite scanr_ from "@principia/base/Array"
     */
    scanr<B>(b: B, f: (a: T, b: B) => B): ReadonlyArray<B>

    /**
     * @rewrite separate from "@principia/base/Array"
     */
    separate<E, A>(this: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>]

    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl<B extends T>(refinement: Refinement<T, B>): readonly [ReadonlyArray<B>, ReadonlyArray<T>]

    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr<B extends T>(refinement: Refinement<T, B>): readonly [ReadonlyArray<T>, ReadonlyArray<B>]

    /**
     * @rewrite splitAt_ from "@principia/base/Array"
     */
    splitAt(n: number): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewrite splitWhere_ from "@principia/base/Array"
     */
    splitWhere(predicate: Predicate<T>): readonly [ReadonlyArray<T>, ReadonlyArray<T>]

    /**
     * @rewriteGetter tail from "@principia/base/Array"
     */
    tail: Option<ReadonlyArray<T>>

    /**
     * @rewrite take_ from "@principia/base/Array"
     */
    take(n: number): ReadonlyArray<T>

    /**
     * @rewrite takeLast_ from "@principia/base/Array"
     */
    takeLast(n: number): ReadonlyArray<T>

    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile<B extends T>(refinement: Refinement<T, B>): ReadonlyArray<B>

    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile(predicate: Predicate<T>): ReadonlyArray<T>

    /**
     * @rewrite toBuffer from "@principia/base/Array"
     */
    toBuffer(this: ReadonlyArray<Byte>): Uint8Array

    /**
     * @rewrite _union from "@principia/base/Array"
     */
    union(E: Eq<T>, ys: ReadonlyArray<T>): ReadonlyArray<T>

    /**
     * @rewrite _uniq from "@principia/base/Array"
     */
    uniq(E: Eq<T>): ReadonlyArray<T>

    /**
     * @rewrite updateAt_ from "@principia/base/Array"
     */
    updateAt(i: number, a: T): Option<ReadonlyArray<T>>

    /**
     * @rewrite zip_ from "@principia/base/Array"
     */
    zip<B>(fb: ReadonlyArray<B>): ReadonlyArray<readonly [T, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Array"
     */
    zipWith<B, C>(fb: ReadonlyArray<B>, f: (a: T, b: B) => C): ReadonlyArray<C>
  }
}

export {}
