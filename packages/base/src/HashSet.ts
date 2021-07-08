import type { Equatable, Hashable } from './Structural'

import * as E from './Either'
import * as HM from './HashMap'
import * as It from './Iterable/core'
import * as O from './Option'
import { not } from './Predicate'
import * as P from './prelude'
import * as Eq from './Structural/Equatable'
import * as Ha from './Structural/Hashable'
import { tuple } from './tuple'

export class HashSet<V> implements Iterable<V>, Hashable, Equatable {
  constructor(readonly keyMap: HM.HashMap<V, any>) {}

  [Symbol.iterator](): Iterator<V> {
    return HM.keys(this.keyMap)
  }
  get [Ha.$hash](): number {
    return Ha.hashIterator(this[Symbol.iterator]())
  }
  [Eq.$equals](other: unknown): boolean {
    return other instanceof HashSet && this.keyMap.size === other.keyMap.size && It.corresponds(this, other, Eq.equals)
  }
}

export function add_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable ? (HM.set_(set.keyMap, v, true), set) : new HashSet(HM.set_(set.keyMap, v, true))
}

export function add<V>(v: V) {
  return (set: HashSet<V>) => add_(set, v)
}

/**
 * Mark `set` as mutable.
 */
export function beginMutation<K>(set: HashSet<K>) {
  return new HashSet(HM.beginMutation(set.keyMap))
}

/**
 * Mark `set` as immutable.
 */
export function endMutation<K>(set: HashSet<K>) {
  // eslint-disable-next-line functional/immutable-data
  set.keyMap.editable = false
  return set
}

/**
 * Appy f to each element
 */
export function forEach_<V>(map: HashSet<V>, f: (v: V, m: HashSet<V>) => void): void {
  HM.iforEach_(map.keyMap, (k, _, m) => {
    f(k, new HashSet(m))
  })
}

/**
 * Appy f to each element
 */
export function forEach<V>(f: (v: V, m: HashSet<V>) => void): (map: HashSet<V>) => void {
  return (map) => forEach_(map, f)
}

export function has_<V>(set: HashSet<V>, v: V): boolean {
  return HM.has_(set.keyMap, v)
}

export function has<V>(v: V): (set: HashSet<V>) => boolean {
  return (set) => has_(set, v)
}

export function make<V>(K: P.Hash<V> & P.Eq<V>) {
  return new HashSet(HM.make(K))
}

export function makeDefault<V>() {
  return new HashSet<V>(HM.makeDefault())
}

/**
 * Mutate `set` within the context of `f`.
 */
export function mutate_<V>(set: HashSet<V>, transient: (set: HashSet<V>) => void) {
  const s = beginMutation(set)
  transient(s)
  return endMutation(s)
}

export function mutate<V>(transient: (set: HashSet<V>) => void): (set: HashSet<V>) => HashSet<V> {
  return (set) => mutate_(set, transient)
}

export function remove_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable ? (HM.remove_(set.keyMap, v), set) : new HashSet(HM.remove_(set.keyMap, v))
}

export function remove<V>(v: V) {
  return (set: HashSet<V>) => remove_(set, v)
}

/**
 * Calculate the number of keys pairs in a set
 */
export function size<A>(set: HashSet<A>) {
  return HM.size(set.keyMap)
}

/**
 * If element is present remove it, if not add it
 *
 * @dataFirst toggle_
 */
export function toggle<A>(a: A): (set: HashSet<A>) => HashSet<A> {
  return (set) => toggle_(set, a)
}

/**
 * If element is present remove it, if not add it
 */
export function toggle_<A>(set: HashSet<A>, a: A): HashSet<A> {
  return (has_(set, a) ? remove : add)(a)(set)
}

export function values<V>(set: HashSet<V>) {
  return HM.keys(set.keyMap)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Projects a Set through a function
 */
export function map_<B>(E: HM.Config<B>): <A>(set: HashSet<A>, f: (x: A) => B) => HashSet<B> {
  const r = make(E)

  return (set, f) =>
    mutate_(r, (r) => {
      forEach_(set, (e) => {
        const v = f(e)
        if (!has_(r, v)) {
          add_(r, v)
        }
      })
      return r
    })
}

/**
 * Projects a Set through a function
 *
 * @dataFirst map_
 */
export function map<B>(E: HM.Config<B>): <A>(f: (x: A) => B) => (set: HashSet<A>) => HashSet<B> {
  const m = map_(E)
  return (f) => (set) => m(set, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map + Flatten
 *
 * @dataFirst chain_
 */
export function chain<B>(E: HM.Config<B>): <A>(f: (x: A) => Iterable<B>) => (set: HashSet<A>) => HashSet<B> {
  const c = chain_(E)
  return (f) => (set) => c(set, f)
}

/**
 * Map + Flatten
 */
export function chain_<B>(E: HM.Config<B>): <A>(set: HashSet<A>, f: (x: A) => Iterable<B>) => HashSet<B> {
  const r = make<B>(E)
  return (set, f) =>
    mutate_(r, (r) => {
      forEach_(set, (e) => {
        for (const a of f(e)) {
          if (!has_(r, a)) {
            add_(r, a)
          }
        }
      })
      return r
    })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Creates an equal for a set
 */
export function getEq<A>(): P.Eq<HashSet<A>> {
  return P.Eq((x, y) => {
    if (y === x) {
      return true
    }
    if (size(x) !== size(y)) {
      return false
    }
    let eq = true
    for (const vx of x) {
      if (!has_(y, vx)) {
        eq = false
        break
      }
    }
    return eq
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filter set values using predicate
 *
 * @dataFirst filter_
 */
export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (set: HashSet<A>) => HashSet<B>
export function filter<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => HashSet<A>
export function filter<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => HashSet<A> {
  return (set) => filter_(set, predicate)
}

/**
 * Filter set values using predicate
 */
export function filter_<A, B extends A>(set: HashSet<A>, refinement: P.Refinement<A, B>): HashSet<B>
export function filter_<A>(set: HashSet<A>, predicate: P.Predicate<A>): HashSet<A>
export function filter_<A>(set: HashSet<A>, predicate: P.Predicate<A>): HashSet<A> {
  const r = make(set.keyMap.config)

  return mutate_(r, (r) => {
    const values_ = values(set)
    let e: IteratorResult<A>
    while (!(e = values_.next()).done) {
      const value = e.value
      if (predicate(value)) {
        add_(r, value)
      }
    }
    return r
  })
}

export function filterMap_<B>(B: HM.Config<B>): <A>(fa: HashSet<A>, f: (a: A) => O.Option<B>) => HashSet<B> {
  return (fa, f) => {
    const out = beginMutation(make(B))
    for (const a of fa) {
      const ob = f(a)
      if (O.isSome(ob)) {
        add_(out, ob.value)
      }
    }
    return endMutation(out)
  }
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<B>(B: HM.Config<B>): <A>(f: (a: A) => O.Option<B>) => (fa: HashSet<A>) => HashSet<B> {
  return (f) => (fa) => filterMap_(B)(fa, f)
}

/**
 * Partition set values using predicate
 *
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (set: HashSet<A>) => readonly [HashSet<A>, HashSet<B>]
export function partition<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => readonly [HashSet<A>, HashSet<A>]
export function partition<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => readonly [HashSet<A>, HashSet<A>] {
  return (set) => partition_(set, predicate)
}

/**
 * Partition set values using predicate
 */
export function partition_<A, B extends A>(
  set: HashSet<A>,
  refinement: P.Refinement<A, B>
): readonly [HashSet<A>, HashSet<B>]
export function partition_<A>(set: HashSet<A>, predicate: P.Predicate<A>): readonly [HashSet<A>, HashSet<A>]
export function partition_<A>(set: HashSet<A>, predicate: P.Predicate<A>): readonly [HashSet<A>, HashSet<A>] {
  const values_ = values(set)
  let e: IteratorResult<A>
  const right   = beginMutation(make(set.keyMap.config))
  const left    = beginMutation(make(set.keyMap.config))
  while (!(e = values_.next()).done) {
    const value = e.value
    if (predicate(value)) {
      add_(right, value)
    } else {
      add_(left, value)
    }
  }
  return tuple(endMutation(left), endMutation(right))
}

export function partitionMap_<B, C>(
  B: HM.Config<B>,
  C: HM.Config<C>
): <A>(fa: HashSet<A>, f: (a: A) => E.Either<B, C>) => readonly [HashSet<B>, HashSet<C>] {
  return (fa, f) => {
    const right = beginMutation(make(C))
    const left  = beginMutation(make(B))
    for (const a of fa) {
      E.match_(
        f(a),
        (b) => {
          add_(left, b)
        },
        (c) => {
          add_(right, c)
        }
      )
    }
    return [endMutation(left), endMutation(right)]
  }
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<B, C>(
  B: HM.Config<B>,
  C: HM.Config<C>
): <A>(f: (a: A) => E.Either<B, C>) => (fa: HashSet<A>) => readonly [HashSet<B>, HashSet<C>] {
  return (f) => (fa) => partitionMap_(B, C)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Reduce a state over the set elements
 */
export function foldl_<A, B>(fa: HashSet<A>, b: B, f: (b: B, v: A) => B): B {
  return HM.ifoldl_(fa.keyMap, b, (b, a) => f(b, a))
}

/**
 * Reduce a state over the set elements
 *
 * @dataFirst foldl_
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: HashSet<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Form the set difference
 */
export function difference_<A>(x: HashSet<A>, y: Iterable<A>): HashSet<A> {
  return mutate_(x, (s) => {
    for (const k of y) {
      remove_(s, k)
    }
  })
}

/**
 * Form the set difference
 *
 * @dataFirst difference_
 */
export function difference<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => difference_(x, y)
}

/**
 * true if all elements match predicate
 */
export function every_<A>(set: HashSet<A>, predicate: P.Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

/**
 * true if all elements match predicate
 *
 * @dataFirst every_
 */
export function every<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => boolean {
  return (set) => every_(set, predicate)
}

/**
 * The set of elements which are in both the first and second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function intersection_<A>(l: HashSet<A>, r: Iterable<A>): HashSet<A> {
  const x = make<A>(l.keyMap.config)

  return mutate_(x, (y) => {
    for (const k of r) {
      if (has_(l, k)) {
        add_(y, k)
      }
    }
  })
}

/**
 * The set of elements which are in both the first and second set
 *
 * @dataFirst intersection_
 */
export function intersection<A>(r: Iterable<A>) {
  return (l: HashSet<A>) => intersection_(l, r)
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function isSubset_<A>(x: HashSet<A>, y: HashSet<A>): boolean {
  return every_(x, (a: A) => has_(y, a))
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @dataFirst isSubset_
 */
export function isSubset<A>(y: HashSet<A>): (x: HashSet<A>) => boolean {
  return (x) => isSubset_(y, x)
}

/**
 * true if one or more elements match predicate
 */
export function some_<A>(set: HashSet<A>, predicate: P.Predicate<A>): boolean {
  let found = false
  for (const e of set) {
    found = predicate(e)
    if (found) {
      break
    }
  }
  return found
}

/**
 * true if one or more elements match predicate
 *
 * @dataFirst some_
 */
export function some<A>(predicate: P.Predicate<A>): (set: HashSet<A>) => boolean {
  return (set) => some_(set, predicate)
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function union_<A>(l: HashSet<A>, r: Iterable<A>): HashSet<A> {
  return mutate_(l, (x) => {
    for (const a of r) {
      add_(x, a)
    }
  })
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @dataFirst union_
 */
export function union<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => union_(x, y)
}

/*
 * -------------------------------------------------------------------------------------------------
 * destructors
 * -------------------------------------------------------------------------------------------------
 */

export function toArray_<A>(set: HashSet<A>, O: P.Ord<A>): ReadonlyArray<A> {
  const r: Array<A> = []
  forEach_(set, (a) => r.push(a))
  return r.sort(O.compare_)
}

export function toArray<A>(O: P.Ord<A>): (set: HashSet<A>) => ReadonlyArray<A> {
  return (set) => toArray_(set, O)
}
