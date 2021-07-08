import type { Config } from '@principia/base/HashMap'
import type { Ord, Predicate, Refinement } from '@principia/base/prelude'

declare module '@principia/base/HashSet' {
  export interface HashSet<V> {
    /**
     * @rewrite add_ from "@principia/base/HashSet"
     */
    add(v: V): HashSet<V>
    /**
     * @rewriteGetter beginMutation from "@principia/base/HashSet"
     */
    beginMutation: HashSet<V>
    /**
     * @rewriteConstraint chain_ from "@principia/base/HashSet"
     */
    chain<B>(E: Config<B>): (f: (x: V) => Iterable<B>) => HashSet<B>
    /**
     * @rewrite difference_ from "@principia/base/HashSet"
     */
    difference(y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter endMutation from "@principia/base/HashSet"
     */
    endMutation: HashSet<V>
    /**
     * @rewrite every_ from "@principia/base/HashSet"
     */
    every(p: Predicate<V>): boolean
    /**
     * @rewrite filter_ from "@principia/base/HashSet"
     */
    filter<B extends V>(refinement: Refinement<V, B>): HashSet<B>
    /**
     * @rewrite filter_ from "@principia/base/HashSet"
     */
    filter(predicate: Predicate<V>): HashSet<V>
    /**
     * @rewrite foldl_ from "@principia/base/HashSet"
     */
    foldl<Z>(z: Z, f: (z: Z, v: V) => Z): Z
    /**
     * @rewrite forEach_ from "@principia/base/HashSet"
     */
    forEach(f: (v: V, m: HashSet<V>) => void): void
    /**
     * @rewrite has_ from "@principia/base/HashSet"
     */
    has(v: V): boolean
    /**
     * @rewrite intersection_ from "@principia/base/HashSet"
     */
    intersection(r: Iterable<V>): HashSet<V>
    /**
     * @rewrite isSubset_ from "@principia/base/HashSet"
     */
    isSubset(y: HashSet<V>): boolean
    /**
     * @rewriteConstraint map_ from "@principia/base/HashSet"
     */
    map<B>(E: Config<B>): (f: (a: V) => B) => HashSet<B>
    /**
     * @rewrite mutate_ from "@principia/base/HashSet"
     */
    mutate(transient: (set: HashSet<V>) => void): HashSet<V>
    /**
     * @rewrite partition_ from "@principia/base/HashSet"
     */
    partition<B extends V>(refinement: Refinement<V, B>): readonly [HashSet<V>, HashSet<B>]
    /**
     * @rewrite partition_ from "@principia/base/HashSet"
     */
    partition(predicate: Predicate<V>): readonly [HashSet<V>, HashSet<V>]
    /**
     * @rewrite remove_ from "@principia/base/HashSet"
     */
    remove(v: V): HashSet<V>
    /**
     * @rewriteGetter size from "@principia/base/HashSet"
     */
    size: number
    /**
     * @rewrite some_ from "@principia/base/HashSet"
     */
    some(predicate: Predicate<V>): boolean
    /**
     * @rewrite toArray_ from "@principia/base/HashSet"
     */
    toArray(O: Ord<V>): ReadonlyArray<V>
    /**
     * @rewrite toggle_ from "@principia/base/HashSet"
     */
    toggle(a: V): HashSet<V>
    /**
     * @rewrite union_ from "@principia/base/HashSet"
     */
    union(y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter values from "@principia/base/HashSet"
     */
    values: IterableIterator<V>
  }
}
