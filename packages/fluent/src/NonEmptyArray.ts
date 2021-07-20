import type { Applicative } from '@principia/base/Applicative'
import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type { Eq } from '@principia/base/Eq'
import type * as HKT from '@principia/base/HKT'
import type { Monoid } from '@principia/base/Monoid'
import type { MutableNonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { Predicate, PredicateWithIndex } from '@principia/base/Predicate'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement, RefinementWithIndex } from '@principia/base/Refinement'
import type { These } from '@principia/base/These'

declare module '@principia/base/NonEmptyArray' {
  export interface NonEmptyArray<A> {
    /**
     * @rewrite align_ from "@principia/base/NonEmptyArray"
     */
    align<B>(fb: NonEmptyArray<B>): NonEmptyArray<These<A, B>>

    /**
     * @rewrite alignWith_ from "@principia/base/NonEmptyArray"
     */
    alignWith<B, C>(fb: NonEmptyArray<B>, f: (_: These<A, B>) => C): ReadonlyArray<C>

    /**
     * @rewrite _ap from "@principia/base/NonEmptyArray"
     */
    ap<B>(fab: NonEmptyArray<(a: A) => B>): NonEmptyArray<B>

    /**
     * @rewrite append_ from "@principia/base/NonEmptyArray"
     */
    append(a: A): NonEmptyArray<A>

    /**
     * @rewrite chain_ from "@principia/base/NonEmptyArray"
     */
    chain<B>(f: (a: A) => NonEmptyArray<B>): NonEmptyArray<B>

    /**
     * @rewrite chop_ from "@principia/base/NonEmptyArray"
     */
    chop<B>(f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]): NonEmptyArray<B>

    /**
     * @rewrite chunksOf_ from "@principia/base/Array"
     */
    chunksOf(n: number): NonEmptyArray<NonEmptyArray<A>>

    /**
     * @rewrite collectWhile_ from "@principia/base/Array"
     */
    collectWhile<B>(f: (a: A) => Option<B>): ReadonlyArray<B>
    /**
     * @rewrite compact from "@principia/base/Array"
     */
    compact<A>(this: NonEmptyArray<Option<A>>): ReadonlyArray<A>

    concat<B>(bs: NonEmptyArray<B>): NonEmptyArray<A | B>

    /**
     * @rewrite concat_ from "@principia/base/NonEmptyArray"
     */
    concat<B>(bs: ReadonlyArray<B>): NonEmptyArray<A | B>

    /**
     * @rewrite cross_ from "@principia/base/NonEmptyArray"
     */
    cross<B>(fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/NonEmptyArray"
     */
    crossWith<B, C>(fb: NonEmptyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C>

    /**
     * @rewrite deleteAt_ from "@principia/base/Array"
     */
    deleteAt(i: number): Option<ReadonlyArray<A>>

    /**
     * @rewrite drop_ from "@principia/base/Array"
     */
    drop(n: number): ReadonlyArray<A>

    /**
     * @rewrite dropLast_ from "@principia/base/Array"
     */
    dropLast(n: number): ReadonlyArray<A>

    /**
     * @rewrite dropLastWhile_ from "@principia/base/Array"
     */
    dropLastWhile(predicate: Predicate<A>): ReadonlyArray<A>

    /**
     * @rewriteGetter duplicate from "@principia/base/Array"
     */
    duplicate: ReadonlyArray<ReadonlyArray<A>>

    /**
     * @rewrite _elem from "@principia/base/Array"
     */
    elem(E: Eq<A>, a: A): boolean

    /**
     * @rewrite extend_ from "@principia/base/NonEmptyArray"
     */
    extend<B>(f: (as: NonEmptyArray<A>) => B): NonEmptyArray<B>
    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter(refinement: PredicateWithIndex<number, A>): ReadonlyArray<A>

    /**
     * @rewrite filter_ from "@principia/base/Array"
     */
    filter<B extends A>(refinement: RefinementWithIndex<number, A, B>): ReadonlyArray<B>

    /**
     * @rewrite filterMap_ from "@principia/base/Array"
     */
    filterMap<B>(f: (a: A, i: number) => Option<B>): ReadonlyArray<B>

    /**
     * @rewrite _filterMapA from "@principia/base/Array"
     */
    filterMapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find<B extends A>(refinement: Refinement<A, B>): Option<B>

    /**
     * @rewrite find_ from "@principia/base/Array"
     */
    find(predicate: Predicate<A>): Option<A>

    /**
     * @rewrite findIndex_ from "@principia/base/Array"
     */
    findIndex(predicate: Predicate<A>): Option<number>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast(predicate: Predicate<A>): Option<A>

    /**
     * @rewrite findLast_ from "@principia/base/Array"
     */
    findLast<B extends A>(refinement: Refinement<A, B>): Option<B>

    /**
     * @rewrite findLastIndex_ from "@principia/base/Array"
     */
    findLastIndex(predicate: Predicate<A>): Option<number>

    /**
     * @rewrite findLastMap_ from "@principia/base/Array"
     */
    findLastMap<B>(f: (a: A) => Option<B>): Option<B>

    /**
     * @rewrite findMap_ from "@principia/base/Array"
     */
    findMap<B>(f: (a: A, i: number) => Option<B>): Option<B>

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
    foldMap<M>(M: Monoid<M>, f: (a: A, i: number) => M): M

    /**
     * @rewrite foldl_ from "@principia/base/NonEmptyArray"
     */
    foldl<B>(b: B, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldlWhile_ from "@principia/base/Array"
     */
    foldlWhile<B>(b: B, predicate: Predicate<B>, f: (b: B, a: A, i: number) => B): B

    /**
     * @rewrite foldr_ from "@principia/base/NonEmptyArray"
     */
    foldr<B>(b: B, f: (a: A, b: B, i: number) => B): B

    /**
     * @rewrite foldrWhile_ from "@principia/base/Array"
     */
    foldrWhile<B>(b: B, f: (a: A, b: B, i: number) => B): B

    /**
     * @rewrite _group from "@principia/base/Array"
     */
    group(E: Eq<A>): NonEmptyArray<NonEmptyArray<A>>

    /**
     * @rewrite groupBy_ from "@principia/base/Array"
     */
    groupBy(f: (a: A) => string): ReadonlyRecord<string, NonEmptyArray<A>>

    /**
     * @rewriteGetter head from "@principia/base/NonEmptyArray"
     */
    head: A

    /**
     * @rewriteGetter init from "@principia/base/NonEmptyArray"
     */
    init: ReadonlyArray<A>

    /**
     * @rewrite insertAt_ from "@principia/base/Array"
     */
    insertAt(i: number, a: A): Option<NonEmptyArray<A>>

    /**
     * @rewrite _intersection from "@principia/base/Array"
     */
    intersection(E: Eq<A>, ys: ReadonlyArray<A>): ReadonlyArray<A>

    /**
     * @rewrite intersperse_ from "@principia/base/NonEmptyArray"
     */
    intersperse(a: A): NonEmptyArray<A>

    /**
     * @rewriteGetter last from "@principia/base/NonEmptyArray"
     */
    last: A

    /**
     * @rewrite lefts from "@principia/base/Array"
     */
    lefts<E, A>(this: NonEmptyArray<Either<E, A>>): ReadonlyArray<E>

    /**
     * @rewrite lookup_ from "@principia/base/Array"
     */
    lookup(i: number): Option<A>

    /**
     * @rewrite map_ from "@principia/base/NonEmptyArray"
     */
    map<B>(f: (a: A, i: number) => B): NonEmptyArray<B>

    /**
     * @rewrite _mapA from "@principia/base/Array"
     */
    mapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>

    /**
     * @rewrite mapAccum_ from "@principia/base/Array"
     */
    mapAccum<S, B>(s: S, f: (s: S, a: A) => readonly [B, S]): readonly [NonEmptyArray<B>, S]

    /**
     * @rewrite modifyAt_ from "@principia/base/Array"
     */
    modifyAt(i: number, f: (a: A) => A): Option<NonEmptyArray<A>>

    /**
     * @rewrite mutate_ from "@principia/base/NonEmptyArray"
     */
    mutate(f: (as: MutableNonEmptyArray<A>) => void): ReadonlyArray<A>

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition(predicate: PredicateWithIndex<number, A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

    /**
     * @rewrite partition_ from "@principia/base/Array"
     */
    partition<B extends A>(refinement: RefinementWithIndex<number, A, B>): readonly [ReadonlyArray<A>, ReadonlyArray<B>]

    /**
     * @rewrite partitionMap_ from "@principia/base/Array"
     */
    partitionMap<B, C>(f: (a: A, i: number) => Either<B, C>): readonly [ReadonlyArray<B>, ReadonlyArray<C>]

    /**
     * @rewrite _partitionMapA from "@principia/base/Array"
     */
    partitionMapA<F extends HKT.URIS, K, Q, W, X, I, S, R, E, A, B, C = HKT.Auto>(
      A: Applicative<F, C>,
      f: (a: A, i: number) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ): HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [ReadonlyArray<A>, ReadonlyArray<B>]>

    /**
     * @rewrite prepend_ from "@principia/base/Array"
     */
    prepend(head: A): NonEmptyArray<A>

    /**
     * @rewrite prependAll_ from "@principia/base/Array"
     */
    prependAll(a: A): ReadonlyArray<A>

    /**
     * @rewriteGetter reverse from "@principia/base/Array"
     */
    reverse: NonEmptyArray<A>

    /**
     * @rewrite rights from "@principia/base/Array"
     */
    rights<E, A>(this: NonEmptyArray<Either<E, A>>): ReadonlyArray<A>

    /**
     * @rewrite rotate_ from "@principia/base/NonEmptyArray"
     */
    rotate(n: number): NonEmptyArray<A>

    /**
     * @rewrite scanl_ from "@principia/base/Array"
     */
    scanl<B>(b: B, f: (b: B, a: A) => B): ReadonlyArray<B>

    /**
     * @rewrite scanr_ from "@principia/base/Array"
     */
    scanr<B>(b: B, f: (a: A, b: B) => B): ReadonlyArray<B>

    /**
     * @rewrite separate from "@principia/base/Array"
     */
    separate<E, A>(this: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>]

    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl<B extends A>(refinement: Refinement<A, B>): readonly [ReadonlyArray<B>, ReadonlyArray<A>]
    /**
     * @rewrite spanl_ from "@principia/base/Array"
     */
    spanl(predicate: Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr<B extends A>(refinement: Refinement<A, B>): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
    /**
     * @rewrite spanr_ from "@principia/base/Array"
     */
    spanr(predicate: Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

    /**
     * @rewrite splitAt_ from "@principia/base/NonEmptyArray"
     */
    splitAt(n: number): readonly [NonEmptyArray<A>, ReadonlyArray<A>]

    /**
     * @rewrite splitWhere_ from "@principia/base/Array"
     */
    splitWhere(predicate: Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]

    /**
     * @rewriteGetter tail from "@principia/base/NonEmptyArray"
     */
    tail: ReadonlyArray<A>

    /**
     * @rewrite take_ from "@principia/base/Array"
     */
    take(n: number): ReadonlyArray<A>

    /**
     * @rewrite takeLast_ from "@principia/base/Array"
     */
    takeLast(n: number): ReadonlyArray<A>

    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile<B extends A>(refinement: Refinement<A, B>): ReadonlyArray<B>
    /**
     * @rewrite takeWhile_ from "@principia/base/Array"
     */
    takeWhile(predicate: Predicate<A>): ReadonlyArray<A>

    /**
     * @rewrite toBuffer from "@principia/base/Array"
     */
    toBuffer(this: ReadonlyArray<Byte>): Uint8Array

    /**
     * @rewrite _union from "@principia/base/Array"
     */
    union(E: Eq<A>, ys: ReadonlyArray<A>): ReadonlyArray<A>

    /**
     * @rewrite _uniq from "@principia/base/Array"
     */
    uniq(E: Eq<A>): ReadonlyArray<A>

    /**
     * @rewrite updateAt_ from "@principia/base/Array"
     */
    updateAt(i: number, a: A): Option<ReadonlyArray<A>>

    /**
     * @rewrite zip_ from "@principia/base/Array"
     */
    zip<B>(fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]>

    /**
     * @rewrite zipWith_ from "@principia/base/Array"
     */
    zipWith<B, C>(fb: ReadonlyArray<B>, f: (a: A, b: B) => C): ReadonlyArray<C>
  }
}
