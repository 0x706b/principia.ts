import type { Either } from '@principia/base/Either'
import type { HashSet } from '@principia/base/HashSet'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type {
  Applicative,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

declare module '@principia/base/HashMap' {
  export interface HashMap<K, V> {
    /**
     * @rewriteGetter beginMutation from "@principia/base/HashMap"
     */
    beginMutation: HashMap<K, V>
    /**
     * @rewrite chain_ from "@principia/base/HashMap"
     */
    chain<A>(f: (a: V) => HashMap<K, A>): HashMap<K, A>
    /**
     * @rewrite concat_ from "@principia/base/HashMap"
     */
    concat(ys: Iterable<readonly [K, V]>): HashMap<K, V>
    /**
     * @rewrite concatWith_ from "@principia/base/HashMap"
     */
    concatWith(ys: Iterable<readonly [K, V]>, f: (x: V, y: V) => V): HashMap<K, V>
    /**
     * @rewriteGetter endMutation from "@principia/base/HashMap"
     */
    endMutation: HashMap<K, V>
    /**
     * @rewrite filter_ from "@principia/base/HashMap"
     */
    filter(predictae: Predicate<V>): HashMap<K, V>
    /**
     * @rewrite filter_ from "@principia/base/HashMap"
     */
    filter<B extends V>(refinement: Refinement<V, B>): HashMap<K, B>
    /**
     * @rewrite filterMap_ from "@principia/base/HashMap"
     */
    filterMap<B>(f: (a: V) => Option<B>): HashMap<K, B>
    /**
     * @rewriteConstraint filterMapA_ from "@principia/base/HashMap"
     */
    filterMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Option<A>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>
    /**
     * @rewrite foldl_ from "@principia/base/HashMap"
     */
    foldl<B>(b: B, f: (b: B, a: V) => B): B
    /**
     * @rewrite forEach_ from "@principia/base/HashMap"
     */
    forEach(f: (a: V, map: HashMap<K, V>) => void): void
    /**
     * @rewrite get_ from "@principia/base/HashMap"
     */
    get(key: K): Option<V>
    /**
     * @rewrite has_ from "@principia/base/HashMap"
     */
    has(key: K): boolean
    /**
     * @rewrite ichain_ from "@principia/base/HashMap"
     */
    ichain<A>(f: (i: K, a: V) => HashMap<K, A>): HashMap<K, A>
    /**
     * @rewrite ifilter_ from "@principia/base/HashMap"
     */
    ifilter(predicate: (i: K, a: V) => boolean): HashMap<K, V>
    /**
     * @rewrite ifilterMap_ from "@principia/base/HashMap"
     */
    ifilterMap<B>(f: (i: K, a: V) => Option<B>): HashMap<K, B>
    /**
     * @rewriteConstraint ifilterMapA_ from "@principia/base/HashMap"
     */
    ifilterMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (i: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Option<A>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>
    /**
     * @rewrite ifoldl_ from "@principia/base/HashMap"
     */
    ifoldl<B>(b: B, f: (b: B, k: K, a: V) => B): B
    /**
     * @rewrite iforEach_ from "@principia/base/HashMap"
     */
    iforEach(f: (k: K, a: V, map: HashMap<K, V>) => void): void
    /**
     * @rewrite imap_ from "@principia/base/HashMap"
     */
    imap<A>(f: (k: K, a: V) => A): HashMap<K, A>
    /**
     * @rewriteConstraint imapA_ from "@principia/base/HashMap"
     */
    imapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (i: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>
    /**
     * @rewrite ipartition_ from "@principia/base/hashmap"
     */
    ipartition<K>(predicate: PredicateWithIndex<K, V>): readonly [HashMap<K, V>, HashMap<K, V>]
    /**
     * @rewrite ipartition_ from "@principia/base/hashmap"
     */
    ipartition<B extends V>(refinement: RefinementWithIndex<K, V, B>): readonly [HashMap<K, V>, HashMap<K, B>]
    /**
     * @rewrite ipartitionMap_ from "@principia/base/hashmap"
     */
    ipartitionMap<A, B>(f: (i: K, a: V) => Either<A, B>): readonly [HashMap<K, A>, HashMap<K, B>]
    /**
     * @rewriteConstraint partitionMapA_ from "@principia/base/HashMap"
     */
    ipartitionMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A, B>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [HashMap<K, A>, HashMap<K, B>]>
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
    map<A>(f: (a: V) => A): HashMap<K, A>
    /**
     * @rewriteConstraint mapA_ from "@principia/base/HashMap"
     */
    mapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>
    /**
     * @rewrite modify_ from "@principia/base/HashMap"
     */
    modify(key: K, f: (a: Option<V>) => Option<V>): HashMap<K, V>
    /**
     * @rewrite mutate_ from "@principia/base/HashMap"
     */
    mutate(f: (map: HashMap<K, V>) => void): HashMap<K, V>
    /**
     * @rewrite partition_ from "@principia/base/hashmap"
     */
    partition<B extends V>(refinement: Refinement<V, B>): readonly [HashMap<K, V>, HashMap<K, B>]
    /**
     * @rewrite partition_ from "@principia/base/hashmap"
     */
    partition(predicate: Predicate<V>): readonly [HashMap<K, V>, HashMap<K, V>]
    /**
     * @rewrite partitionMap_ from "@principia/base/hashmap"
     */
    partitionMap<A, B>(f: (a: V) => Either<A, B>): readonly [HashMap<K, A>, HashMap<K, B>]
    /**
     * @rewriteConstraint ipartitionMapA_ from "@principia/base/HashMap"
     */
    partitionMapA<F extends HKT.URIS, C = HKT.Auto>(
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A, B>(
      f: (i: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [HashMap<K, A>, HashMap<K, B>]>
    /**
     * @rewrite pop_ from "@principia/base/HashMap"
     */
    pop(k: K): Option<readonly [V, HashMap<K, V>]>
    /**
     * @rewrite remove_ from "@principia/base/HashMap"
     */
    remove(key: K): HashMap<K, V>
    /**
     * @rewrite removeMany_ from "@principia/base/hashmap"
     */
    removeMany(keys: Iterable<K>): HashMap<K, V>

    /**
     * @rewrite set_ from "@principia/base/hashmap"
     */
    set(key: K, value: V): HashMap<K, V>
    /**
     * @rewrite update_ from "@principia/base/hashmap"
     */
    update(key: K, f: (a: V) => V): HashMap<K, V>
    /**
     * @rewriteGetter values from "@principia/base/HashMap"
     */
    values: IterableIterator<V>
  }
}
