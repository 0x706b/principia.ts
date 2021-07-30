import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
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

declare module '@principia/base/Dictionary' {
  interface Dictionary<A> {
    /**
     * @rewrite collect_ from "@principia/base/Dictionary"
     */
    collect<A, B>(this: Dictionary<A>, f: (a: A, k: string) => B): ReadonlyArray<B>
    /**
     * @rewrite compact from "@principia/base/Dictionary"
     */
    compact<A>(this: Dictionary<Option<A>>): Dictionary<A>
    /**
     * @rewrite deleteAt_ from "@principia/base/Dictionary"
     */
    deleteAt<A>(this: Dictionary<A>, k: string): Dictionary<A>
    /**
     * @rewriteConstraint elem_ from "@principia/base/Dictionary"
     */
    elem<A>(this: Dictionary<A>, E: Eq<A>): (a: A) => boolean
    /**
     * @rewrite every_ from "@principia/base/Dictionary"
     */
    every<A, B extends A>(this: Dictionary<A>, refinement: Refinement<A, B>): this is Dictionary<B>
    /**
     * @rewrite every_ from "@principia/base/Dictionary"
     */
    every<A>(this: Dictionary<A>, predicate: Predicate<A>): boolean
    /**
     * @rewrite filter_ from "@principia/base/Dictionary"
     */
    filter<A>(this: Dictionary<A>, refinement: PredicateWithIndex<string, A>): Dictionary<A>
    /**
     * @rewrite filter_ from "@principia/base/Dictionary"
     */
    filter<A, B extends A>(this: Dictionary<A>, refinement: RefinementWithIndex<string, A, B>): Dictionary<B>
    /**
     * @rewrite filterMap_ from "@principia/base/Dictionary"
     */
    filterMap<A, B>(this: Dictionary<A>, f: (a: A, k: string) => Option<B>): Dictionary<B>
    /**
     * @rewriteConstraint filterMapA_ from "@principia/base/Dictionary"
     */
    filterMapA<A, F extends HKT.URIS, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A>(
      f: (a: A, k: string) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Option<A>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<A>>
    /**
     * @rewriteConstraint foldMap_ from "@principia/base/Dictionary"
     */
    foldMap<A, M>(this: Dictionary<A>, M: Monoid<M>): <A>(f: (a: A, k: string) => M) => M
    /**
     * @rewrite foldl_ from "@principia/base/Dictionary"
     */
    foldl<A, B>(this: Dictionary<A>, b: B, f: (b: B, a: A, k: string) => B): B
    /**
     * @rewrite foldr_ from "@principia/base/Dictionary"
     */
    foldr<A, B>(fa: Dictionary<A>, b: B, f: (a: A, b: B, k: string) => B): B
    /**
     * @rewrite has_ from "@principia/base/Dictionary"
     */
    has<A, K extends string>(this: Dictionary<A>, k: K): this is Dictionary<A> & { readonly [_ in K]: A }
    /**
     * @rewrite insertAt_ from "@principia/base/Dictionary"
     */
    insertAt<A>(this: Dictionary<A>, k: string, a: A): Option<Dictionary<A>>
    /**
     * @rewriteConstraint isSubrecord_ from "@principia/base/Dictionary"
     */
    isSubrecord<A>(this: Dictionary<A>, E: Eq<A>): (that: Dictionary<A>) => boolean
    /**
     * @rewrite keys from "@principia/base/Dictionary"
     */
    keys<A>(this: Dictionary<A>): ReadonlyArray<string>
    /**
     * @rewrite lookup_ from "@principia/base/Dictionary"
     */
    lookup<A>(this: Dictionary<A>, k: string): Option<A>
    /**
     * @rewrite map_ from "@principia/base/Dictionary"
     */
    map<A, B>(this: Dictionary<A>, f: (a: A, k: string) => B): Dictionary<B>
    /**
     * @rewriteConstraint mapA_ from "@principia/base/Dictionary"
     */
    mapA<A, F extends HKT.URIS, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, B>(
      f: (a: A, k: string) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Dictionary<B>>
    /**
     * @rewrite modifyAt_ from "@principia/base/Dictionary"
     */
    modifyAt<A>(this: Dictionary<A>, k: string, f: (a: A) => A): Option<Dictionary<A>>
    /**
     * @rewrite partition_ from "@principia/base/Dictionary"
     */
    partition<A, B extends A>(
      this: Dictionary<A>,
      refinement: RefinementWithIndex<string, A, B>
    ): readonly [Dictionary<A>, Dictionary<B>]
    /**
     * @rewrite partition_ from "@principia/base/Dictionary"
     */
    partition<A>(this: Dictionary<A>, predicate: PredicateWithIndex<string, A>): readonly [Dictionary<A>, Dictionary<A>]
    /**
     * @rewrite partitionMap_ from "@principia/base/Dictionary"
     */
    partitionMap<A, B, C>(
      this: Dictionary<A>,
      f: (a: A, k: string) => Either<B, C>
    ): readonly [Dictionary<B>, Dictionary<C>]
    /**
     * @rewriteConstraint partitionMapA_ from "@principia/base/Dictionary"
     */
    partitionMapA<A, F extends HKT.URIS, C = HKT.Auto>(
      this: Dictionary<A>,
      A: Applicative<F, C>
    ): <K, Q, W, X, I, S, R, E, A, B>(
      f: (a: A, k: string) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, readonly [Dictionary<A>, Dictionary<B>]>
    /**
     * @rewrite pop_ from "@principia/base/Dictionary"
     */
    pop<A>(this: Dictionary<A>, k: string): Option<readonly [A, Dictionary<A>]>
    /**
     * @rewrite separate from "@principia/base/Dictionary"
     */
    separate<A, B>(this: Dictionary<Either<A, B>>): readonly [Dictionary<A>, Dictionary<B>]
    /**
     * @rewrite some_ from "@principia/base/Dictionary"
     */
    some<A>(this: Dictionary<A>, predicate: Predicate<A>): boolean
    /**
     * @rewrite toArray from "@principia/base/Dictionary"
     */
    toArray<A>(this: Dictionary<A>): ReadonlyArray<readonly [string, A]>
    /**
     * @rewrite updateAt_ from "@principia/base/Dictionary"
     */
    updateAt<A>(this: Dictionary<A>, k: string, a: A): Option<Dictionary<A>>
    /**
     * @rewrite upsertAt_ from "@principia/base/Dictionary"
     */
    upsertAt<A>(this: Dictionary<A>, k: string, a: A): Dictionary<A>
  }
}
