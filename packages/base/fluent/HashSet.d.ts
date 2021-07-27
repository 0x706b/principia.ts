import type { Config } from '@principia/base/HashMap'
import type { Ord, Predicate, Refinement } from '@principia/base/prelude'

declare module '@principia/base/HashSet' {
  export interface HashSet<V> {
    /**
     * @rewrite add_ from "@principia/base/HashSet"
     */
    add<V>(this: HashSet<V>, v: V): HashSet<V>
    /**
     * @rewriteGetter beginMutation from "@principia/base/HashSet"
     */
    beginMutation: HashSet<V>
    /**
     * @rewriteConstraint chain_ from "@principia/base/HashSet"
     */
    chain<V, B>(this: HashSet<V>, E: Config<B>): (f: (x: V) => Iterable<B>) => HashSet<B>
    /**
     * @rewrite difference_ from "@principia/base/HashSet"
     */
    difference<V>(this: HashSet<V>, y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter endMutation from "@principia/base/HashSet"
     */
    endMutation: HashSet<V>
    /**
     * @rewrite every_ from "@principia/base/HashSet"
     */
    every<V>(this: HashSet<V>, p: Predicate<V>): boolean
    /**
     * @rewrite filter_ from "@principia/base/HashSet"
     */
    filter<V, B extends V>(this: HashSet<V>, refinement: Refinement<V, B>): HashSet<B>
    /**
     * @rewrite filter_ from "@principia/base/HashSet"
     */
    filter<V>(this: HashSet<V>, predicate: Predicate<V>): HashSet<V>
    /**
     * @rewrite foldl_ from "@principia/base/HashSet"
     */
    foldl<V, Z>(this: HashSet<V>, z: Z, f: (z: Z, v: V) => Z): Z
    /**
     * @rewrite forEach_ from "@principia/base/HashSet"
     */
    forEach<V>(this: HashSet<V>, f: (v: V, m: HashSet<V>) => void): void
    /**
     * @rewrite has_ from "@principia/base/HashSet"
     */
    has<V>(this: HashSet<V>, v: V): boolean
    /**
     * @rewrite intersection_ from "@principia/base/HashSet"
     */
    intersection<V>(this: HashSet<V>, r: Iterable<V>): HashSet<V>
    /**
     * @rewrite isSubset_ from "@principia/base/HashSet"
     */
    isSubset<V>(this: HashSet<V>, y: HashSet<V>): boolean
    /**
     * @rewriteConstraint map_ from "@principia/base/HashSet"
     */
    map<V, B>(this: HashSet<V>, E: Config<B>): (f: (a: V) => B) => HashSet<B>
    /**
     * @rewrite mutate_ from "@principia/base/HashSet"
     */
    mutate<V>(this: HashSet<V>, transient: (set: HashSet<V>) => void): HashSet<V>
    /**
     * @rewrite partition_ from "@principia/base/HashSet"
     */
    partition<V, B extends V>(this: HashSet<V>, refinement: Refinement<V, B>): readonly [HashSet<V>, HashSet<B>]
    /**
     * @rewrite partition_ from "@principia/base/HashSet"
     */
    partition<V>(this: HashSet<V>, predicate: Predicate<V>): readonly [HashSet<V>, HashSet<V>]
    /**
     * @rewrite remove_ from "@principia/base/HashSet"
     */
    remove<V>(this: HashSet<V>, v: V): HashSet<V>
    /**
     * @rewriteGetter size from "@principia/base/HashSet"
     */
    size: number
    /**
     * @rewrite some_ from "@principia/base/HashSet"
     */
    some<V>(this: HashSet<V>, predicate: Predicate<V>): boolean
    /**
     * @rewrite toArray_ from "@principia/base/HashSet"
     */
    toArray<V>(this: HashSet<V>, O: Ord<V>): ReadonlyArray<V>
    /**
     * @rewrite toggle_ from "@principia/base/HashSet"
     */
    toggle<V>(this: HashSet<V>, a: V): HashSet<V>
    /**
     * @rewrite union_ from "@principia/base/HashSet"
     */
    union<V>(this: HashSet<V>, y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter values from "@principia/base/HashSet"
     */
    values: IterableIterator<V>
  }
}
