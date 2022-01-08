import type { Dictionary } from '@principia/base/collection/immutable/Dictionary'
import type * as D from '@principia/base/collection/immutable/Dictionary'
import type { HashMap } from '@principia/base/collection/immutable/HashMap'
import type * as R from '@principia/base/collection/immutable/Record'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type {
  Applicative,
  Eq,
  Monoid,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Dictionary: DictionaryStaticOps
  export interface Dictionary<A> extends D.Dictionary<A> {}
}

interface DictionaryStaticOps {
  /**
   * @rewrite identity from smart:identity
   */
  from<A>(record: Record<string, A>): Dictionary<A>
  /**
   * @rewriteStatic fromFoldable from "@principia/base/collection/immutable/Record"
   */
  fromFoldable: typeof R.fromFoldable
  /**
   * @rewriteStatic fromFoldableMap from "@principia/base/collection/immutable/Record"
   */
  fromFoldableMap: typeof R.fromFoldableMap
  /**
   * @rewriteStatic getEq from "@principia/base/collection/immutable/Record"
   */
  getEq: typeof R.getEq
  /**
   * @rewriteStatic getMonoid from "@principia/base/collection/immutable/Record"
   */
  getMonoid: typeof R.getMonoid
  /**
   * @rewriteStatic getShow from "@principia/base/collection/immutable/Record"
   */
  getShow: typeof R.getShow
}

declare module '@principia/base/collection/immutable/Dictionary' {
  interface Dictionary<A> {
    /**
     * @rewrite collect_ from "@principia/base/collection/immutable/Record"
     */
    collect<A, B>(this: Dictionary<A>, f: (a: A) => B): ReadonlyArray<B>
    /**
     * @rewrite compact from "@principia/base/collection/immutable/Record"
     */
    compact<A>(this: Dictionary<Maybe<A>>): Dictionary<A>
    /**
     * @rewrite deleteAt_ from "@principia/base/collection/immutable/Record"
     */
    deleteAt<A>(this: Dictionary<A>, k: string): Dictionary<A>
    /**
     * @rewriteConstraint elem_ from "@principia/base/collection/immutable/Record"
     */
    elem<A>(this: Dictionary<A>, E: Eq<A>): (a: A) => boolean
    /**
     * @rewrite every_ from "@principia/base/collection/immutable/Record"
     */
    every<A>(this: Dictionary<A>, predicate: Predicate<A>): boolean
    /**
     * @rewrite every_ from "@principia/base/collection/immutable/Record"
     */
    every<A, B extends A>(this: Dictionary<A>, refinement: Refinement<A, B>): this is Dictionary<B>
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Record"
     */
    filter<A>(this: Dictionary<A>, refinement: Predicate<A>): Dictionary<A>
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/Record"
     */
    filter<A, B extends A>(this: Dictionary<A>, refinement: Refinement<A, B>): Dictionary<B>
    /**
     * @rewrite filterMap_ from "@principia/base/collection/immutable/Record"
     */
    filterMap<A, B>(this: Dictionary<A>, f: (a: A) => Maybe<B>): Dictionary<B>
    /**
     * @rewriteConstraint foldMap_ from "@principia/base/collection/immutable/Record"
     */
    foldMap<A, M>(this: Dictionary<A>, M: Monoid<M>): <A>(f: (a: A) => M) => M
    /**
     * @rewrite foldl_ from "@principia/base/collection/immutable/Record"
     */
    foldl<A, B>(this: Dictionary<A>, b: B, f: (b: B, a: A) => B): B
    /**
     * @rewrite foldr_ from "@principia/base/collection/immutable/Record"
     */
    foldr<A, B>(fa: Dictionary<A>, b: B, f: (a: A, b: B) => B): B
    /**
     * @rewrite has_ from "@principia/base/collection/immutable/Record"
     */
    has<A, K extends string>(this: Dictionary<A>, k: K): this is Dictionary<A> & { readonly [_ in K]: A }
    /**
     * @rewrite icollect_ from "@principia/base/collection/immutable/Record"
     */
    icollect<A, B>(this: Dictionary<A>, f: (k: string, a: A) => B): ReadonlyArray<B>
    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Record"
     */
    ifilter<A>(this: Dictionary<A>, refinement: PredicateWithIndex<string, A>): Dictionary<A>
    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/Record"
     */
    ifilter<A, B extends A>(this: Dictionary<A>, refinement: RefinementWithIndex<string, A, B>): Dictionary<B>
    /**
     * @rewrite ifilterMap_ from "@principia/base/collection/immutable/Record"
     */
    ifilterMap<A, B>(this: Dictionary<A>, f: (k: string, a: A) => Maybe<B>): Dictionary<B>
    /**
     * @rewriteConstraint ifoldMap_ from "@principia/base/collection/immutable/Record"
     */
    ifoldMap<A, M>(this: Dictionary<A>, M: Monoid<M>): <A>(f: (k: string, a: A) => M) => M
    /**
     * @rewrite ifoldl_ from "@principia/base/collection/immutable/Record"
     */
    ifoldl<A, B>(this: Dictionary<A>, b: B, f: (k: string, b: B, a: A) => B): B
    /**
     * @rewrite ifoldr_ from "@principia/base/collection/immutable/Record"
     */
    ifoldr<A, B>(fa: Dictionary<A>, b: B, f: (k: string, a: A, b: B) => B): B
    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/Record"
     */
    imap<A, B>(this: Dictionary<A>, f: (k: string, a: A) => B): Dictionary<B>
    /**
     * @rewrite insertAt_ from "@principia/base/collection/immutable/Record"
     */
    insertAt<A>(this: Dictionary<A>, k: string, a: A): Maybe<Dictionary<A>>
    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/Record"
     */
    ipartition<A>(
      this: Dictionary<A>,
      predicate: PredicateWithIndex<string, A>
    ): readonly [Dictionary<A>, Dictionary<A>]
    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/Record"
     */
    ipartition<A, B extends A>(
      this: Dictionary<A>,
      refinement: RefinementWithIndex<string, A, B>
    ): readonly [Dictionary<A>, Dictionary<B>]
    /**
     * @rewrite ipartitionMap_ from "@principia/base/collection/immutable/Record"
     */
    ipartitionMap<A, B, C>(
      this: Dictionary<A>,
      f: (k: string, a: A) => Either<B, C>
    ): readonly [Dictionary<B>, Dictionary<C>]
    /**
     * @rewriteConstraint isSubrecord_ from "@principia/base/collection/immutable/Record"
     */
    isSubrecord<A>(this: Dictionary<A>, E: Eq<A>): (that: Dictionary<A>) => boolean
    /**
     * @rewriteConstraint itraverse_ from "@principia/base/collection/immutable/Record"
     */
    itraverse<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (k: string, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<B>>
    /**
     * @rewriteConstraint iwilt_ from "@principia/base/collection/immutable/Record"
     */
    iwilt<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A, B>(
      f: (k: string, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Dictionary<A>, Dictionary<B>]>
    /**
     * @rewriteConstraint iwither_ from "@principia/base/collection/immutable/Record"
     */
    iwither<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (k: string, a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<A>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<A>>
    /**
     * @rewrite keys from "@principia/base/collection/immutable/Record"
     */
    keys<A>(this: Dictionary<A>): ReadonlyArray<string>
    /**
     * @rewrite lookup_ from "@principia/base/collection/immutable/Record"
     */
    lookup<A>(this: Dictionary<A>, k: string): Maybe<A>
    /**
     * @rewrite map_ from "@principia/base/collection/immutable/Record"
     */
    map<A, B>(this: Dictionary<A>, f: (a: A) => B): Dictionary<B>
    /**
     * @rewrite modifyAt_ from "@principia/base/collection/immutable/Record"
     */
    modifyAt<A>(this: Dictionary<A>, k: string, f: (a: A) => A): Maybe<Dictionary<A>>
    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/Record"
     */
    partition<A, B extends A>(
      this: Dictionary<A>,
      refinement: Refinement<A, B>
    ): readonly [Dictionary<A>, Dictionary<B>]
    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/Record"
     */
    partition<A>(this: Dictionary<A>, predicate: Predicate<A>): readonly [Dictionary<A>, Dictionary<A>]
    /**
     * @rewrite partitionMap_ from "@principia/base/collection/immutable/Record"
     */
    partitionMap<A, B, C>(this: Dictionary<A>, f: (a: A) => Either<B, C>): readonly [Dictionary<B>, Dictionary<C>]
    /**
     * @rewrite pop_ from "@principia/base/collection/immutable/Record"
     */
    pop<A>(this: Dictionary<A>, k: string): Maybe<readonly [A, Dictionary<A>]>
    /**
     * @rewrite separate from "@principia/base/collection/immutable/Record"
     */
    separate<A, B>(this: Dictionary<Either<A, B>>): readonly [Dictionary<A>, Dictionary<B>]
    /**
     * @rewrite some_ from "@principia/base/collection/immutable/Record"
     */
    some<A>(this: Dictionary<A>, predicate: Predicate<A>): boolean
    /**
     * @rewrite toArray from "@principia/base/collection/immutable/Record"
     */
    toArray<A>(this: Dictionary<A>): ReadonlyArray<readonly [string, A]>
    /**
     * @rewrite identity from smart:identity
     */
    toRecord(this: Dictionary<A>): Record<string, A>
    /**
     * @rewriteConstraint traverse_ from "@principia/base/collection/immutable/Record"
     */
    traverse<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<B>>
    /**
     * @rewrite updateAt_ from "@principia/base/collection/immutable/Record"
     */
    updateAt<A>(this: Dictionary<A>, k: string, a: A): Maybe<Dictionary<A>>
    /**
     * @rewrite upsertAt_ from "@principia/base/collection/immutable/Record"
     */
    upsertAt<A>(this: Dictionary<A>, k: string, a: A): Dictionary<A>
    /**
     * @rewriteConstraint wilt_ from "@principia/base/collection/immutable/Record"
     */
    wilt<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A, B>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Dictionary<A>, Dictionary<B>]>
    /**
     * @rewriteConstraint wither_ from "@principia/base/collection/immutable/Record"
     */
    wither<A, F extends HKT.HKT, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Maybe<A>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<A>>
  }
}
