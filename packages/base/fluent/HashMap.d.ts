import type * as HM from '@principia/base/collection/immutable/HashMap'
import type { HashSet } from '@principia/base/collection/immutable/HashSet'
import type { Either } from '@principia/base/Either'
import type * as HKT from '@principia/base/HKT'
import type { Maybe } from '@principia/base/Maybe'
import type {
  Applicative,
  Predicate,
  PredicateWithIndex,
  Refinement,
  RefinementWithIndex
} from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const HashMap: HashMapStaticOps
  export interface HashMap<K, V> extends HM.HashMap<K, V> {}
}

interface HashMapStaticOps {
  make: typeof HM.make
  makeDefault: typeof HM.makeDefault
}

declare module '@principia/base/collection/immutable/HashMap' {
  export interface HashMap<K, V> {
    /**
     * @rewriteGetter beginMutation from "@principia/base/collection/immutable/HashMap"
     */
    beginMutation: HashMap<K, V>

    /**
     * @rewrite chain_ from "@principia/base/collection/immutable/HashMap"
     */
    chain<K, V, A>(this: HashMap<K, V>, f: (a: V) => HashMap<K, A>): HashMap<K, A>

    /**
     * @rewrite concat_ from "@principia/base/collection/immutable/HashMap"
     */
    concat<K, V>(this: HashMap<K, V>, ys: Iterable<readonly [K, V]>): HashMap<K, V>

    /**
     * @rewrite concatWith_ from "@principia/base/collection/immutable/HashMap"
     */
    concatWith<K, V>(this: HashMap<K, V>, ys: Iterable<readonly [K, V]>, f: (x: V, y: V) => V): HashMap<K, V>

    /**
     * @rewriteGetter endMutation from "@principia/base/collection/immutable/HashMap"
     */
    endMutation: HashMap<K, V>

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/HashMap"
     */
    filter<K, V>(this: HashMap<K, V>, predicate: Predicate<V>): HashMap<K, V>

    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/HashMap"
     */
    filter<K, V, B extends V>(this: HashMap<K, V>, refinement: Refinement<V, B>): HashMap<K, B>

    /**
     * @rewrite filterMap_ from "@principia/base/collection/immutable/HashMap"
     */
    filterMap<K, V, B>(this: HashMap<K, V>, f: (a: V) => Maybe<B>): HashMap<K, B>

    /**
     * @rewrite foldl_ from "@principia/base/collection/immutable/HashMap"
     */
    foldl<K, V, B>(this: HashMap<K, V>, b: B, f: (b: B, a: V) => B): B

    /**
     * @rewrite forEach_ from "@principia/base/collection/immutable/HashMap"
     */
    forEach<K, V>(this: HashMap<K, V>, f: (a: V, map: HashMap<K, V>) => void): void

    /**
     * @rewrite get_ from "@principia/base/collection/immutable/HashMap"
     */
    get<K, V>(this: HashMap<K, V>, key: K): Maybe<V>

    /**
     * @rewrite has_ from "@principia/base/collection/immutable/HashMap"
     */
    has<K, V>(this: HashMap<K, V>, key: K): boolean

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/HashMap"
     */
    ifilter<K, V>(this: HashMap<K, V>, predicate: PredicateWithIndex<K, V>): HashMap<K, V>

    /**
     * @rewrite ifilter_ from "@principia/base/collection/immutable/HashMap"
     */
    ifilter<K, V, B extends V>(this: HashMap<K, V>, refinement: RefinementWithIndex<K, V, B>): HashMap<K, B>

    /**
     * @rewrite ifilterMap_ from "@principia/base/collection/immutable/HashMap"
     */
    ifilterMap<K, V, B>(this: HashMap<K, V>, f: (k: K, a: V) => Maybe<B>): HashMap<K, B>

    /**
     * @rewrite ifoldl_ from "@principia/base/collection/immutable/HashMap"
     */
    ifoldl<K, V, B>(this: HashMap<K, V>, b: B, f: (k: K, b: B, a: V) => B): B

    /**
     * @rewrite iforEach_ from "@principia/base/collection/immutable/HashMap"
     */
    iforEach<K, V>(this: HashMap<K, V>, f: (k: K, a: V, map: HashMap<K, V>) => void): void

    /**
     * @rewrite imap_ from "@principia/base/collection/immutable/HashMap"
     */
    imap<K, V, A>(this: HashMap<K, V>, f: (k: K, a: V) => A): HashMap<K, A>

    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/HashMap"
     */
    ipartition<K, V, B extends V>(
      this: HashMap<K, V>,
      refinement: RefinementWithIndex<K, V, B>
    ): readonly [HashMap<K, V>, HashMap<K, B>]

    /**
     * @rewrite ipartition_ from "@principia/base/collection/immutable/HashMap"
     */
    ipartition<K, V>(this: HashMap<K, V>, predicate: PredicateWithIndex<K, V>): readonly [HashMap<K, V>, HashMap<K, V>]

    /**
     * @rewrite ipartitionMap_ from "@principia/base/collection/immutable/HashMap"
     */
    ipartitionMap<K, V, A, B>(
      this: HashMap<K, V>,
      f: (k: K, a: V) => Either<A, B>
    ): readonly [HashMap<K, A>, HashMap<K, B>]

    /**
     * @rewriteGetter isEmpty from "@principia/base/collection/immutable/HashMap"
     */
    isEmpty: boolean

    /**
     * @rewriteConstraint itraverse_ from "@principia/base/collection/immutable/HashMap"
     */
    itraverse<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (k: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>

    /**
     * @rewriteConstraint iwilt_ from "@principia/base/collection/immutable/HashMap"
     */
    iwilt<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A, B>(
      f: (i: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [HashMap<K, A>, HashMap<K, B>]>

    /**
     * @rewriteConstraint iwither_ from "@principia/base/collection/immutable/HashMap"
     */
    iwither<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (k: K, a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Maybe<A>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>

    /**
     * @rewriteGetter keySet from "@principia/base/collection/immutable/HashMap"
     */
    keySet: HashSet<K>

    /**
     * @rewriteGetter keys from "@principia/base/collection/immutable/HashMap"
     */
    keys: IterableIterator<K>

    /**
     * @rewrite map_ from "@principia/base/collection/immutable/HashMap"
     */
    map<K, V, A>(this: HashMap<K, V>, f: (a: V) => A): HashMap<K, A>

    /**
     * @rewrite modify_ from "@principia/base/collection/immutable/HashMap"
     */
    modify<K, V>(this: HashMap<K, V>, key: K, f: (a: Maybe<V>) => Maybe<V>): HashMap<K, V>

    /**
     * @rewrite mutate_ from "@principia/base/collection/immutable/HashMap"
     */
    mutate<K, V>(this: HashMap<K, V>, f: (map: HashMap<K, V>) => void): HashMap<K, V>

    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/HashMap"
     */
    partition<K, V, B extends V>(
      this: HashMap<K, V>,
      refinement: Refinement<V, B>
    ): readonly [HashMap<K, V>, HashMap<K, B>]

    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/HashMap"
     */
    partition<K, V>(this: HashMap<K, V>, predicate: Predicate<V>): readonly [HashMap<K, V>, HashMap<K, V>]

    /**
     * @rewrite partitionMap_ from "@principia/base/collection/immutable/HashMap"
     */
    partitionMap<K, V, A, B>(this: HashMap<K, V>, f: (a: V) => Either<A, B>): readonly [HashMap<K, A>, HashMap<K, B>]

    /**
     * @rewrite pop_ from "@principia/base/collection/immutable/HashMap"
     */
    pop<K, V>(this: HashMap<K, V>, k: K): Maybe<readonly [V, HashMap<K, V>]>

    /**
     * @rewrite remove_ from "@principia/base/collection/immutable/HashMap"
     */
    remove<K, V>(this: HashMap<K, V>, key: K): HashMap<K, V>

    /**
     * @rewrite removeMany_ from "@principia/base/collection/immutable/HashMap"
     */
    removeMany<K, V>(this: HashMap<K, V>, keys: Iterable<K>): HashMap<K, V>

    /**
     * @rewrite set_ from "@principia/base/collection/immutable/HashMap"
     */
    set<K, V>(this: HashMap<K, V>, key: K, value: V): HashMap<K, V>
    /**
     * @rewriteConstraint traverse_ from "@principia/base/collection/immutable/HashMap"
     */
    traverse<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>

    /**
     * @rewrite update_ from "@principia/base/collection/immutable/HashMap"
     */
    update<K, V>(this: HashMap<K, V>, key: K, f: (a: V) => V): HashMap<K, V>

    /**
     * @rewriteGetter values from "@principia/base/collection/immutable/HashMap"
     */
    values: IterableIterator<V>

    /**
     * @rewriteConstraint wilt_ from "@principia/base/collection/immutable/HashMap"
     */
    wilt<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A, B>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Either<A, B>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [HashMap<K, A>, HashMap<K, B>]>

    /**
     * @rewriteConstraint wither_ from "@principia/base/collection/immutable/HashMap"
     */
    wither<K, V, F extends HKT.HKT, C = HKT.Auto>(
      this: HashMap<K, V>,
      A: Applicative<F, C>
    ): <K_, Q, W, X, I, S, R, E, A>(
      f: (a: V) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, Maybe<A>>
    ) => HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, HashMap<K, A>>
  }
}
