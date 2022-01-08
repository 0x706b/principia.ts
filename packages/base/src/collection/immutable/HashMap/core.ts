import type * as Eq from '../../../Eq'
import type { Hash } from '../../../Hash'
import type * as HKT from '../../../HKT'
import type { Equatable, Hashable } from '../../../Structural'
import type { Node, UpdateFn } from './internal'

import * as E from '../../../Either'
import { constant, identity, pipe } from '../../../function'
import * as M from '../../../Maybe'
import * as P from '../../../prelude'
import * as Equ from '../../../Structural/Equatable'
import * as Ha from '../../../Structural/Hashable'
import { tuple } from '../../../tuple/core'
import * as It from '../../Iterable/core'
import * as HS from '../HashSet'
import { _EmptyNode, fromBitmap, hashFragment, isEmptyNode, SIZE, toBitmap } from './internal'

type Eq<A> = Eq.Eq<A>

export type Config<K> = Eq<K> & Hash<K>

export interface HashMapF extends HKT.HKT {
  readonly type: HashMap<this['K'], this['A']>
  readonly variance: {
    K: '_'
    A: '+'
  }
}

export class HashMap<K, V> implements Iterable<readonly [K, V]>, Hashable, Equatable {
  readonly _K!: () => K
  readonly _V!: () => V

  constructor(
    public editable: boolean,
    public edit: number,
    readonly config: Config<K>,
    public root: Node<K, V>,
    public size: number
  ) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return new HashMapIterator(this, identity)
  }

  get [Ha.$hash](): number {
    return Ha.hashIterator(new HashMapIterator(this, ([k, v]) => Ha._combineHash(Ha.hash(k), Ha.hash(v))))
  }

  [Equ.$equals](other: unknown): boolean {
    return other instanceof HashMap && other.size === this.size && It.corresponds(this, other, Equ.equals)
  }
}

export class HashMapIterator<K, V, T> implements IterableIterator<T> {
  v = visitLazy(this.map.root, this.f, undefined)

  constructor(readonly map: HashMap<K, V>, readonly f: (node: readonly [K, V]) => T) {}

  next(): IteratorResult<T> {
    if (M.isNothing(this.v)) {
      return { done: true, value: undefined }
    }
    const v0 = this.v.value
    this.v   = applyCont(v0.cont)
    return { done: false, value: v0.value }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new HashMapIterator(this.map, this.f)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Predicates
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Does `map` contain any elements?
 */
export function isEmpty<K, V>(map: HashMap<K, V>): boolean {
  return map && !!isEmptyNode(map.root)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates a new map
 */
export function make<K, V>(K: Hash<K> & Eq<K>) {
  return new HashMap<K, V>(false, 0, K, _EmptyNode, 0)
}

/**
 * Make a new map that has randomly cached hash and structural equality
 */
export function makeDefault<K, V>() {
  return make<K, V>({
    ...Equ.DefaultEq,
    ...Ha.DefaultHash
  })
}

/**
 * Makes a new map from a Foldable of key-value pairs
 */
export function fromFoldable<F extends HKT.HKT, C, K, A>(C: Config<K>, S: P.Semigroup<A>, F: P.Foldable<F, C>) {
  return <K_, Q, W, X, I, S, R, E>(fka: HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [K, A]>): HashMap<K, A> => {
    return F.foldl_(fka, make(C), (b, [k, a]) => {
      const oa = get_(b, k)
      if (M.isJust(oa)) {
        return set_(b, k, S.combine_(oa.value, a))
      } else {
        return set_(b, k, a)
      }
    })
  }
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 */
export function getHash_<K, V>(map: HashMap<K, V>, key: K, hash: number): M.Maybe<V> {
  return tryGetHash(map, key, hash)
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 *
 * @dataFirst getHash_
 */
export function getHash<K>(key: K, hash: number): <V>(map: HashMap<K, V>) => M.Maybe<V> {
  return (map) => getHash_(map, key, hash)
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): M.Maybe<V> {
  return tryGetHash(map, key, map.config.hash(key))
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 *
 * @dataFirst get_
 */
export function get<K>(key: K) {
  return <V>(map: HashMap<K, V>) => get_(map, key)
}

/**
 * Does an entry exist for `key` in `map`? Uses custom `hash`.
 */
export function hasHash_<K, V>(map: HashMap<K, V>, key: K, hash: number): boolean {
  return M.isJust(tryGetHash(map, key, hash))
}

/**
 * Does an entry exist for `key` in `map`? Uses custom `hash`.
 *
 * @dataFirst hasHash_
 */
export function hasHash<K>(key: K, hash: number): <V>(map: HashMap<K, V>) => boolean {
  return (map) => hasHash_(map, key, hash)
}

/**
 * Does an entry exist for `key` in `map`? Uses internal hash function.
 */
export function has_<K, V>(map: HashMap<K, V>, key: K): boolean {
  return M.isJust(tryGetHash(map, key, map.config.hash(key)))
}

/**
 * Does an entry exist for `key` in `map`? Uses internal hash function.
 *
 * @dataFirst has_
 */
export function has<K>(key: K) {
  return <V>(map: HashMap<K, V>) => has_(map, key)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using custom hash.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modifyHash_<K, V>(map: HashMap<K, V>, key: K, hash: number, f: UpdateFn<V>): HashMap<K, V> {
  const size    = { value: map.size }
  const newRoot = map.root.modify(map.editable ? map.edit : NaN, map.config.equals_, 0, f, hash, key, size)
  return setTree(map, newRoot, size.value)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modify_<K, V>(map: HashMap<K, V>, key: K, f: UpdateFn<V>) {
  return modifyHash_(map, key, map.config.hash(key), f)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 *
 * @dataFirst modify_
 */
export function modify<K, V>(key: K, f: (v: M.Maybe<V>) => M.Maybe<V>) {
  return (map: HashMap<K, V>) => modify_(map, key, f)
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return modify_(map, key, constant(M.just(value)))
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 *
 * @dataFirst set_
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K) {
  return modify_(map, key, constant(M.nothing()))
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 *
 * @dataFirst remove_
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}

/**
 * Remove many keys
 */
export function removeMany_<K, V>(map: HashMap<K, V>, ks: Iterable<K>): HashMap<K, V> {
  return mutate_(map, (m) => {
    for (const k of ks) {
      remove_(m, k)
    }
  })
}

/**
 * Remove many keys
 *
 * @dataFirst removeMany_
 */
export function removeMany<K>(ks: Iterable<K>): <V>(map: HashMap<K, V>) => HashMap<K, V> {
  return (map) => removeMany_(map, ks)
}

/**
 * Mark `map` as mutable.
 */
export function beginMutation<K, V>(map: HashMap<K, V>) {
  return new HashMap(true, map.edit + 1, map.config, map.root, map.size)
}

/**
 * Mark `map` as immutable.
 */
export function endMutation<K, V>(map: HashMap<K, V>) {
  map.editable = false
  return map
}

/**
 * Mutate `map` within the context of `f`.
 *
 * @dataFirst mutate_
 */
export function mutate<K, V>(f: (map: HashMap<K, V>) => void) {
  return (map: HashMap<K, V>) => mutate_(map, f)
}

/**
 * Mutate `map` within the context of `f`.
 */
export function mutate_<K, V>(map: HashMap<K, V>, f: (map: HashMap<K, V>) => void) {
  const transient = beginMutation(map)
  f(transient)
  return endMutation(transient)
}

/**
 * Get an IterableIterator of the map keys
 */
export function keys<K, V>(map: HashMap<K, V>): IterableIterator<K> {
  return new HashMapIterator(map, ([k]) => k)
}

/**
 * Get the set of keys
 */
export function keySet<K, V>(self: HashMap<K, V>): HS.HashSet<K> {
  return pipe(
    HS.make(self.config),
    HS.mutate((set) => {
      iforEach_(self, (k) => {
        HS.add_(set, k)
      })
    })
  )
}

/**
 * Get an IterableIterator of the map values
 */
export function values<K, V>(map: HashMap<K, V>): IterableIterator<V> {
  return new HashMapIterator(map, ([, v]) => v)
}

/**
 * Update a value if exists
 */
export function update_<K, V>(map: HashMap<K, V>, key: K, f: (v: V) => V) {
  return modify_(map, key, M.map(f))
}

/**
 * Update a value if exists
 *
 * @dataFirst update_
 */
export function update<K, V>(key: K, f: (v: V) => V) {
  return (map: HashMap<K, V>) => update_(map, key, f)
}

/**
 * Apply f to each element
 */
export function iforEach_<K, V>(map: HashMap<K, V>, f: (k: K, v: V, m: HashMap<K, V>) => void): void {
  ifoldl_(map, undefined as void, (key, _, value) => f(key, value, map))
}

/**
 * Apply f to each element
 *
 * @dataFirst iforEach_
 */
export function iforEach<K, V>(f: (k: K, v: V, m: HashMap<K, V>) => void): (map: HashMap<K, V>) => void {
  return (map) => iforEach_(map, f)
}

/**
 * Apply f to each element
 */
export function forEach_<K, V>(map: HashMap<K, V>, f: (v: V, m: HashMap<K, V>) => void): void {
  return iforEach_(map, (_, v, m) => f(v, m))
}

/**
 * Apply f to each element
 *
 * @dataFirst forEach_
 */
export function forEach<K, V>(f: (v: V, m: HashMap<K, V>) => void): (map: HashMap<K, V>) => void {
  return (map) => forEach_(map, f)
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, V>(map: HashMap<K, V>): number {
  return map.size
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps over the map entries
 */
export function imap_<K, V, A>(fa: HashMap<K, V>, f: (k: K, v: V) => A): HashMap<K, A> {
  return ifoldl_(fa, make<K, A>(fa.config), (k, z, v) => set_(z, k, f(k, v)))
}

/**
 * Maps over the map entries
 *
 * @dataFirst imap_
 */
export function imap<K, V, A>(f: (k: K, v: V) => A): (fa: HashMap<K, V>) => HashMap<K, A> {
  return (fa) => imap_(fa, f)
}

/**
 * Maps over the map entries
 */
export function map_<K, V, A>(fa: HashMap<K, V>, f: (v: V) => A): HashMap<K, A> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Maps over the map entries
 *
 * @dataFirst map_
 */
export function map<K, V, A>(f: (v: V) => A): (fa: HashMap<K, V>) => HashMap<K, A> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 */
export function ichain_<K, V, A>(ma: HashMap<K, V>, f: (k: K, v: V) => HashMap<K, A>): HashMap<K, A> {
  return ifoldl_(ma, make<K, A>(ma.config), (k, z, v) =>
    mutate_(z, (m) => {
      iforEach_(f(k, v), (_k, _a) => {
        set_(m, _k, _a)
      })
    })
  )
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 *
 * @dataFirst ichain_
 */
export function ichain<K, V, A>(f: (k: K, v: V) => HashMap<K, A>): (ma: HashMap<K, V>) => HashMap<K, A> {
  return (ma) => ichain_(ma, f)
}

export function chain_<K, V, A>(ma: HashMap<K, V>, f: (v: V) => HashMap<K, A>): HashMap<K, A> {
  return ichain_(ma, (_, a) => f(a))
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 *
 * @dataFirst chain_
 */
export function chain<K, V, A>(f: (v: V) => HashMap<K, A>): (ma: HashMap<K, V>) => HashMap<K, A> {
  return (ma) => chain_(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Removes None values
 */
export function compact<K, A>(fa: HashMap<K, M.Maybe<A>>): HashMap<K, A> {
  return filterMap_(fa, (a) => a)
}

export function separate<K, A, B>(fa: HashMap<K, E.Either<A, B>>): readonly [HashMap<K, A>, HashMap<K, B>] {
  return partitionMap_(fa, (a) => a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filter out None and map
 */
export function ifilterMap_<K, A, B>(fa: HashMap<K, A>, f: (k: K, a: A) => M.Maybe<B>): HashMap<K, B> {
  const m = make<K, B>(fa.config)

  return mutate_(m, (m) => {
    for (const [k, a] of fa) {
      const o = f(k, a)
      if (M.isJust(o)) {
        set_(m, k, o.value)
      }
    }
  })
}

/**
 * Filter out None and map
 *
 * @dataFirst ifilterMap_
 */
export function ifilterMap<K, A, B>(f: (k: K, a: A) => M.Maybe<B>): (fa: HashMap<K, A>) => HashMap<K, B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 * Filter out None and map
 */
export function filterMap_<K, A, B>(fa: HashMap<K, A>, f: (a: A) => M.Maybe<B>): HashMap<K, B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * Filter out None and map
 *
 * @dataFirst filterMap_
 */
export function filterMap<K, A, B>(f: (a: A) => M.Maybe<B>): (fa: HashMap<K, A>) => HashMap<K, B> {
  return (fa) => filterMap_(fa, f)
}

/**
 * Filter out by predicate
 */
export function ifilter_<K, A, B extends A>(
  fa: HashMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): HashMap<K, B>
export function ifilter_<K, A>(fa: HashMap<K, A>, predicate: P.PredicateWithIndex<K, A>): HashMap<K, A>
export function ifilter_<K, A>(fa: HashMap<K, A>, predicate: P.PredicateWithIndex<K, A>): HashMap<K, A> {
  const m = make<K, A>(fa.config)

  return mutate_(m, (m) => {
    for (const [k, a] of fa) {
      if (predicate(k, a)) {
        set_(m, k, a)
      }
    }
  })
}

/**
 * Filter out by predicate
 *
 * @dataFirst ifilter_
 */
export function ifilter<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (fa: HashMap<K, A>) => HashMap<K, B>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: HashMap<K, A>) => HashMap<K, A>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: HashMap<K, A>) => HashMap<K, A> {
  return (fa) => ifilter_(fa, predicate)
}

/**
 * Filter out by predicate
 */
export function filter_<K, A, B extends A>(fa: HashMap<K, A>, refinement: P.Refinement<A, B>): HashMap<K, B>
export function filter_<K, A>(fa: HashMap<K, A>, predicate: P.Predicate<A>): HashMap<K, A>
export function filter_<K, A>(fa: HashMap<K, A>, predicate: P.Predicate<A>): HashMap<K, A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

/**
 * Filter out by predicate
 *
 * @dataFirst filter_
 */
export function filter<K, A, B extends A>(refinement: P.Refinement<A, B>): (fa: HashMap<K, A>) => HashMap<K, B>
export function filter<K, A>(predicate: P.Predicate<A>): (fa: HashMap<K, A>) => HashMap<K, A>
export function filter<K, A>(predicate: P.Predicate<A>): (fa: HashMap<K, A>) => HashMap<K, A> {
  return (fa) => filter_(fa, predicate)
}

export function ipartitionMap_<K, V, A, B>(
  fa: HashMap<K, V>,
  f: (i: K, a: V) => E.Either<A, B>
): readonly [HashMap<K, A>, HashMap<K, B>] {
  const left  = make<K, A>(fa.config)
  const right = make<K, B>(fa.config)

  beginMutation(left)
  beginMutation(right)

  iforEach_(fa, (k, v) => {
    E.match_(
      f(k, v),
      (a) => {
        set_(left, k, a)
      },
      (b) => {
        set_(right, k, b)
      }
    )
  })

  endMutation(left)
  endMutation(right)

  return [left, right]
}

/**
 * @dataFirst ipartitionMap_
 */
export function ipartitionMap<K, V, A, B>(
  f: (i: K, a: V) => E.Either<A, B>
): (fa: HashMap<K, V>) => readonly [HashMap<K, A>, HashMap<K, B>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<K, V, A, B>(
  fa: HashMap<K, V>,
  f: (a: V) => E.Either<A, B>
): readonly [HashMap<K, A>, HashMap<K, B>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<K, V, A, B>(
  f: (a: V) => E.Either<A, B>
): (fa: HashMap<K, V>) => readonly [HashMap<K, A>, HashMap<K, B>] {
  return (fa) => partitionMap_(fa, f)
}

export function ipartition_<K, V, B extends V>(
  fa: HashMap<K, V>,
  refinement: P.RefinementWithIndex<K, V, B>
): readonly [HashMap<K, V>, HashMap<K, B>]
export function ipartition_<K, V>(
  fa: HashMap<K, V>,
  predicate: P.PredicateWithIndex<K, V>
): readonly [HashMap<K, V>, HashMap<K, V>]
export function ipartition_<K, V>(
  fa: HashMap<K, V>,
  predicate: P.PredicateWithIndex<K, V>
): readonly [HashMap<K, V>, HashMap<K, V>] {
  const left  = make<K, V>(fa.config)
  const right = make<K, V>(fa.config)

  beginMutation(left)
  beginMutation(right)

  iforEach_(fa, (k, v) => {
    if (predicate(k, v)) {
      set_(right, k, v)
    } else {
      set_(left, k, v)
    }
  })

  endMutation(left)
  endMutation(right)

  return [left, right]
}

/**
 * @dataFirst ipartition_
 */
export function ipartition<K, V, B extends V>(
  refinement: P.RefinementWithIndex<K, V, B>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, B>]
export function ipartition<K, V>(
  predicate: P.PredicateWithIndex<K, V>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, V>]
export function ipartition<K, V>(
  predicate: P.PredicateWithIndex<K, V>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, V>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<K, V, B extends V>(
  fa: HashMap<K, V>,
  refinement: P.Refinement<V, B>
): readonly [HashMap<K, V>, HashMap<K, B>]
export function partition_<K, V>(fa: HashMap<K, V>, predicate: P.Predicate<V>): readonly [HashMap<K, V>, HashMap<K, V>]
export function partition_<K, V>(
  fa: HashMap<K, V>,
  predicate: P.Predicate<V>
): readonly [HashMap<K, V>, HashMap<K, V>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

/**
 * @dataFirst partition_
 */
export function partition<K, V, B extends V>(
  refinement: P.Refinement<V, B>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, B>]
export function partition<K, V>(
  predicate: P.Predicate<V>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, V>]
export function partition<K, V>(
  predicate: P.Predicate<V>
): (fa: HashMap<K, V>) => readonly [HashMap<K, V>, HashMap<K, V>] {
  return (fa) => partition_(fa, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Reduce a state over the map entries
 */
export function ifoldl_<K, V, Z>(map: HashMap<K, V>, z: Z, f: (r: K, z: Z, v: V) => Z): Z {
  const root = map.root
  if (root._tag === 'LeafNode') return M.isJust(root.value) ? f(root.key, z, root.value.value) : z
  if (root._tag === 'EmptyNode') {
    return z
  }
  const toVisit = [root.children]
  let children
  while ((children = toVisit.pop())) {
    for (let i = 0, len = children.length; i < len; ) {
      const child = children[i++]
      if (child && !isEmptyNode(child)) {
        if (child._tag === 'LeafNode') {
          if (M.isJust(child.value)) {
            // eslint-disable-next-line no-param-reassign
            z = f(child.key, z, child.value.value)
          }
        } else {
          toVisit.push(child.children)
        }
      }
    }
  }
  return z
}

/**
 * Reduce a state over the map entries
 *
 * @dataFirst ifoldl_
 */
export function ifoldl<K, V, Z>(z: Z, f: (k: K, z: Z, v: V) => Z) {
  return (map: HashMap<K, V>) => ifoldl_(map, z, f)
}

export function foldl_<K, V, Z>(map: HashMap<K, V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return ifoldl_(map, z, (_, b, a) => f(b, a))
}

/**
 * Reduce a state over the map entries
 *
 * @dataFirst foldl_
 */
export function foldl<K, V, Z>(z: Z, f: (z: Z, v: V) => Z): (map: HashMap<K, V>) => Z {
  return (map) => foldl_(map, z, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const itraverse_: P.TraverseIndexFn_<HashMapF> = P.implementTraverseWithIndex_<HashMapF>()(
  () => (A) => (ta, f) =>
    ifoldl_(ta, A.pure(make(ta.config)), (k, b, a) => A.crossWith_(b, f(k, a), (map, b) => set_(map, k, b)))
)

/**
 * @dataFirst itraverse_
 */
export const itraverse: P.MapWithIndexAFn<HashMapF> = (A) => {
  const _ = itraverse_(A)
  return (f) => (ta) => _(ta, f)
}

export const traverse_: P.TraverseFn_<HashMapF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (ta, f) => itraverseA_(ta, (_, a) => f(a))
}

export const traverse: P.TraverseFn<HashMapF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (f) => (ta) => itraverseA_(ta, (_, a) => f(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const iwither_: P.WitherWithIndexFn_<HashMapF> = (A) => (wa, f) => pipe(itraverse_(A)(wa, f), A.map(compact))

/**
 * @dataFirst iwither_
 */
export const iwither: P.WitherWithIndexFn<HashMapF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (f) => (ta) => iwitherA_(ta, f)
}

export const wither_: P.WitherFn_<HashMapF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (wa, f) => iwitherA_(wa, (_, a) => f(a))
}

/**
 * @dataFirst wither_
 */
export const wither: P.WitherFn<HashMapF> = (A) => {
  const iwitherA_ = iwither_(A)
  return (f) => (wa) => iwitherA_(wa, (_, a) => f(a))
}

export const iwilt_: P.WiltWithIndexFn_<HashMapF> = (A) => {
  const itraverseA_ = itraverse_(A)
  return (wa, f) => pipe(itraverseA_(wa, f), A.map(separate))
}

/**
 * @dataFirst iwilt_
 */
export const iwilt: P.WiltWithIndexFn<HashMapF> = (A) => {
  const _ = iwilt_(A)
  return (f) => (wa) => _(wa, f)
}

export const wilt_: P.WiltFn_<HashMapF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (wa, f) => iwiltA_(wa, (_, a) => f(a))
}

/**
 * @dataFirst wilt_
 */
export const wilt: P.WiltFn<HashMapF> = (A) => {
  const iwiltA_ = iwilt_(A)
  return (f) => (wa) => iwiltA_(wa, (_, a) => f(a))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function concatWith_<K, A>(
  xs: HashMap<K, A>,
  ys: Iterable<readonly [K, A]>,
  f: (x: A, y: A) => A
): HashMap<K, A> {
  return mutate_(xs, (m) => {
    for (const [k, a] of ys) {
      modify_(
        m,
        k,
        M.match(
          () => M.just(a),
          (a0) => M.just(f(a0, a))
        )
      )
    }
  })
}

/**
 * @dataFirst concatWith_
 */
export function concatWith<K, A>(
  ys: Iterable<readonly [K, A]>,
  f: (x: A, y: A) => A
): (xs: HashMap<K, A>) => HashMap<K, A> {
  return (xs) => concatWith_(xs, ys, f)
}

export function concat_<K, A>(xs: HashMap<K, A>, ys: Iterable<readonly [K, A]>): HashMap<K, A> {
  return mutate_(xs, (m) => {
    for (const [k, a] of ys) {
      set_(m, k, a)
    }
  })
}

/**
 * @dataFirst concat_
 */
export function concat<K, A>(ys: Iterable<readonly [K, A]>): (xs: HashMap<K, A>) => HashMap<K, A> {
  return (xs) => concat_(xs, ys)
}

export function pop_<K, A>(m: HashMap<K, A>, k: K): M.Maybe<readonly [A, HashMap<K, A>]> {
  return pipe(
    get_(m, k),
    M.map((a) => [a, remove_(m, k)])
  )
}

/**
 * @dataFirst pop_
 */
export function pop<K>(k: K): <A>(m: HashMap<K, A>) => M.Maybe<readonly [A, HashMap<K, A>]> {
  return (m) => pop_(m, k)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

type Cont<K, V, A> =
  | [len: number, children: Node<K, V>[], i: number, f: (node: readonly [K, V]) => A, cont: Cont<K, V, A>]
  | undefined

function applyCont<K, V, A>(cont: Cont<K, V, A>) {
  return cont ? visitLazyChildren(cont[0], cont[1], cont[2], cont[3], cont[4]) : M.nothing()
}

function visitLazyChildren<K, V, A>(
  len: number,
  children: Node<K, V>[],
  i: number,
  f: (node: readonly [K, V]) => A,
  cont: Cont<K, V, A>
): M.Maybe<VisitResult<K, V, A>> {
  while (i < len) {
    // eslint-disable-next-line no-param-reassign
    const child = children[i++]
    if (child && !isEmptyNode(child)) {
      return visitLazy(child, f, [len, children, i, f, cont])
    }
  }
  return applyCont(cont)
}

interface VisitResult<K, V, A> {
  value: A
  cont: Cont<K, V, A>
}

/**
 * Visit each leaf lazily
 */
function visitLazy<K, V, A>(
  node: Node<K, V>,
  f: (node: readonly [K, V]) => A,
  cont: Cont<K, V, A> = undefined
): M.Maybe<VisitResult<K, V, A>> {
  switch (node._tag) {
    case 'LeafNode': {
      return M.isJust(node.value)
        ? M.just({
            value: f(tuple(node.key, node.value.value)),
            cont
          })
        : applyCont(cont)
    }
    case 'CollisionNode':
    case 'ArrayNode':
    case 'IndexedNode': {
      const children = node.children
      return visitLazyChildren(children.length, children, 0, f, cont)
    }
    default: {
      return applyCont(cont)
    }
  }
}

/**
 * Set the root of the map
 */
function setTree<K, V>(map: HashMap<K, V>, newRoot: Node<K, V>, newSize: number) {
  if (map.editable) {
    map.root = newRoot
    map.size = newSize
    return map
  }
  return newRoot === map.root ? map : new HashMap(map.editable, map.edit, map.config, newRoot, newSize)
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 */
function tryGetHash<K, V>(map: HashMap<K, V>, key: K, hash: number): M.Maybe<V> {
  let node    = map.root
  let shift   = 0
  const keyEq = map.config.equals_

  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (node._tag) {
      case 'LeafNode': {
        return keyEq(node.key, key) ? node.value : M.nothing()
      }
      case 'CollisionNode': {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]
            if ('key' in child && keyEq(child.key, key)) return child.value
          }
        }
        return M.nothing()
      }
      case 'IndexedNode': {
        const frag = hashFragment(shift, hash)
        const bit  = toBitmap(frag)
        if (node.mask & bit) {
          node   = node.children[fromBitmap(node.mask, bit)]
          shift += SIZE
          break
        }
        return M.nothing()
      }
      case 'ArrayNode': {
        node = node.children[hashFragment(shift, hash)]
        if (node) {
          shift += SIZE
          break
        }
        return M.nothing()
      }
      default:
        return M.nothing()
    }
  }
}
