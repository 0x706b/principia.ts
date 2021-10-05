import type { Either } from '@principia/base/Either'
import type * as HM from '@principia/base/HashMap'
import type { HashSet } from '@principia/base/HashSet'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type { Applicative, PredicateWithIndex, RefinementWithIndex } from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const HashMap: HashMapStaticOps
  export interface HashMap<K, V> extends HM.HashMap<K, V> {}
}

interface HashMapStaticOps {
  make: typeof HM.make
  makeDefault: typeof HM.makeDefault
}

declare module '@principia/base/HashMap' {
  export interface HashMap<K, V> {
    /**
     * @rewriteGetter beginMutation from "@principia/base/HashMap"
     */
    beginMutation: HashMap<K, V>

    /**
     * @rewrite chain_ from "@principia/base/HashMap"
     */
    chain<K, V, A>(this: HashMap<K, V>, f: (a: V) => HashMap<K, A>): HashMap<K, A>

    /**
     * @rewrite concat_ from "@principia/base/HashMap"
     */
    concat<K, V>(this: HashMap<K, V>, ys: Iterable<readonly [K, V]>): HashMap<K, V>

    /**
     * @rewrite concatWith_ from "@principia/base/HashMap"
     */
    concatWith<K, V>(this: HashMap<K, V>, ys: Iterable<readonly [K, V]>, f: (x: V, y: V) => V): HashMap<K, V>

    /**
     * @rewriteGetter endMutation from "@principia/base/HashMap"
     */
    endMutation: HashMap<K, V>

    /**
     * @rewrite filter_ from "@principia/base/HashMap"
     */
    filter<K, V>(this: HashMap<K, V>, predicate: PredicateWithIndex<K, V>): HashMap<K, V>

    /**
     * @rewrite filter_ from "@principia/base/HashMap"
     */
    filter<K, V, B extends V>(this: HashMap<K, V>, refinement: RefinementWithIndex<K, V, B>): HashMap<K, B>

    /**
     * @rewrite filterMap_ from "@principia/base/HashMap"
     */
    filterMap<K, V, B>(this: HashMap<K, V>, f: (a: V, k: K) => Maybe<B>): HashMap<K, B>

    /**
     * @rewriteConstraint filterMapA_ from "@principia/base/HashMap"
     */
    filterMapA<K, V, F extends HKT.URIS, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V, k: K) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Maybe<A>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>

    /**
     * @rewrite foldl_ from "@principia/base/HashMap"
     */
    foldl<K, V, B>(this: HashMap<K, V>, b: B, f: (b: B, a: V, k: K) => B): B

    /**
     * @rewrite forEach_ from "@principia/base/HashMap"
     */
    forEach<K, V>(this: HashMap<K, V>, f: (a: V, k: K, map: HashMap<K, V>) => void): void

    /**
     * @rewrite get_ from "@principia/base/HashMap"
     */
    get<K, V>(this: HashMap<K, V>, key: K): Maybe<V>

    /**
     * @rewrite has_ from "@principia/base/HashMap"
     */
    has<K, V>(this: HashMap<K, V>, key: K): boolean

    /**
     * @rewriteGetter isEmpty from "@principia/base/HashMap"
     */
    isEmpty: boolean

    /**
     * @rewriteGetter keySet from "@principia/base/HashMap"
     */
    keySet: HashSet<K>

    /**
     * @rewriteGetter keys from "@principia/base/HashMap"
     */
    keys: IterableIterator<K>

    /**
     * @rewrite map_ from "@principia/base/HashMap"
     */
    map<K, V, A>(this: HashMap<K, V>, f: (a: V, k: K) => A): HashMap<K, A>

    /**
     * @rewriteConstraint mapA_ from "@principia/base/HashMap"
     */
    mapA<K, V, F extends HKT.URIS, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V, k: K) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>

    /**
     * @rewrite modify_ from "@principia/base/HashMap"
     */
    modify<K, V>(this: HashMap<K, V>, key: K, f: (a: Maybe<V>) => Maybe<V>): HashMap<K, V>

    /**
     * @rewrite mutate_ from "@principia/base/HashMap"
     */
    mutate<K, V>(this: HashMap<K, V>, f: (map: HashMap<K, V>) => void): HashMap<K, V>

    /**
     * @rewrite partition_ from "@principia/base/hashmap"
     */
    partition<K, V, B extends V>(
      this: HashMap<K, V>,
      refinement: RefinementWithIndex<K, V, B>
    ): readonly [HashMap<K, V>, HashMap<K, B>]

    /**
     * @rewrite partition_ from "@principia/base/hashmap"
     */
    partition<K, V>(this: HashMap<K, V>, predicate: PredicateWithIndex<K, V>): readonly [HashMap<K, V>, HashMap<K, V>]

    /**
     * @rewrite partitionMap_ from "@principia/base/hashmap"
     */
    partitionMap<K, V, A, B>(
      this: HashMap<K, V>,
      f: (a: V, k: K) => Either<A, B>
    ): readonly [HashMap<K, A>, HashMap<K, B>]

    /**
     * @rewriteConstraint partitionMapA_ from "@principia/base/HashMap"
     */
    partitionMapA<K, V, F extends HKT.URIS, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A, B>(
      f: (i: K, a: V, k: K) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [HashMap<K, A>, HashMap<K, B>]>

    /**
     * @rewrite pop_ from "@principia/base/HashMap"
     */
    pop<K, V>(this: HashMap<K, V>, k: K): Maybe<readonly [V, HashMap<K, V>]>
    /**
     * @rewrite remove_ from "@principia/base/HashMap"
     */
    remove<K, V>(this: HashMap<K, V>, key: K): HashMap<K, V>

    /**
     * @rewrite removeMany_ from "@principia/base/hashmap"
     */
    removeMany<K, V>(this: HashMap<K, V>, keys: Iterable<K>): HashMap<K, V>

    /**
     * @rewrite set_ from "@principia/base/hashmap"
     */
    set<K, V>(this: HashMap<K, V>, key: K, value: V): HashMap<K, V>

    /**
     * @rewrite update_ from "@principia/base/hashmap"
     */
    update<K, V>(this: HashMap<K, V>, key: K, f: (a: V) => V): HashMap<K, V>

    /**
     * @rewriteGetter values from "@principia/base/HashMap"
     */
    values: IterableIterator<V>
  }
}
