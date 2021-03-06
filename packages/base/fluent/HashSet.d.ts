import type { Config } from '@principia/base/collection/immutable/HashMap'
import type * as HS from '@principia/base/collection/immutable/HashSet'
import type { Ord, Predicate, Refinement } from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const HashSet: HashSetStaticOps
  export interface HashSet<V> extends HS.HashSet<V> {}
}

interface HashSetStaticOps {
  make: typeof HS.make
  makeDefault: typeof HS.makeDefault
}

declare module '@principia/base/collection/immutable/HashSet' {
  export interface HashSet<V> {
    /**
     * @rewrite add_ from "@principia/base/collection/immutable/HashSet"
     */
    add<V>(this: HashSet<V>, v: V): HashSet<V>
    /**
     * @rewriteGetter beginMutation from "@principia/base/collection/immutable/HashSet"
     */
    beginMutation: HashSet<V>
    /**
     * @rewriteConstraint chain_ from "@principia/base/collection/immutable/HashSet"
     */
    chain<V, B>(this: HashSet<V>, E: Config<B>): (f: (x: V) => Iterable<B>) => HashSet<B>
    /**
     * @rewrite difference_ from "@principia/base/collection/immutable/HashSet"
     */
    difference<V>(this: HashSet<V>, y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter endMutation from "@principia/base/collection/immutable/HashSet"
     */
    endMutation: HashSet<V>
    /**
     * @rewrite every_ from "@principia/base/collection/immutable/HashSet"
     */
    every<V>(this: HashSet<V>, p: Predicate<V>): boolean
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/HashSet"
     */
    filter<V, B extends V>(this: HashSet<V>, refinement: Refinement<V, B>): HashSet<B>
    /**
     * @rewrite filter_ from "@principia/base/collection/immutable/HashSet"
     */
    filter<V>(this: HashSet<V>, predicate: Predicate<V>): HashSet<V>
    /**
     * @rewrite foldl_ from "@principia/base/collection/immutable/HashSet"
     */
    foldl<V, Z>(this: HashSet<V>, z: Z, f: (z: Z, v: V) => Z): Z
    /**
     * @rewrite forEach_ from "@principia/base/collection/immutable/HashSet"
     */
    forEach<V>(this: HashSet<V>, f: (v: V, m: HashSet<V>) => void): void
    /**
     * @rewrite has_ from "@principia/base/collection/immutable/HashSet"
     */
    has<V>(this: HashSet<V>, v: V): boolean
    /**
     * @rewrite intersection_ from "@principia/base/collection/immutable/HashSet"
     */
    intersection<V>(this: HashSet<V>, r: Iterable<V>): HashSet<V>
    /**
     * @rewrite isSubset_ from "@principia/base/collection/immutable/HashSet"
     */
    isSubset<V>(this: HashSet<V>, y: HashSet<V>): boolean
    /**
     * @rewriteConstraint map_ from "@principia/base/collection/immutable/HashSet"
     */
    map<V, B>(this: HashSet<V>, E: Config<B>): (f: (a: V) => B) => HashSet<B>
    /**
     * @rewrite mutate_ from "@principia/base/collection/immutable/HashSet"
     */
    mutate<V>(this: HashSet<V>, transient: (set: HashSet<V>) => void): HashSet<V>
    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/HashSet"
     */
    partition<V, B extends V>(this: HashSet<V>, refinement: Refinement<V, B>): readonly [HashSet<V>, HashSet<B>]
    /**
     * @rewrite partition_ from "@principia/base/collection/immutable/HashSet"
     */
    partition<V>(this: HashSet<V>, predicate: Predicate<V>): readonly [HashSet<V>, HashSet<V>]
    /**
     * @rewrite remove_ from "@principia/base/collection/immutable/HashSet"
     */
    remove<V>(this: HashSet<V>, v: V): HashSet<V>
    /**
     * @rewriteGetter size from "@principia/base/collection/immutable/HashSet"
     */
    size: number
    /**
     * @rewrite some_ from "@principia/base/collection/immutable/HashSet"
     */
    some<V>(this: HashSet<V>, predicate: Predicate<V>): boolean
    /**
     * @rewrite toArray_ from "@principia/base/collection/immutable/HashSet"
     */
    toArray<V>(this: HashSet<V>, O: Ord<V>): ReadonlyArray<V>
    /**
     * @rewrite toggle_ from "@principia/base/collection/immutable/HashSet"
     */
    toggle<V>(this: HashSet<V>, a: V): HashSet<V>
    /**
     * @rewrite union_ from "@principia/base/collection/immutable/HashSet"
     */
    union<V>(this: HashSet<V>, y: Iterable<V>): HashSet<V>
    /**
     * @rewriteGetter values from "@principia/base/collection/immutable/HashSet"
     */
    values: IterableIterator<V>
  }
}
