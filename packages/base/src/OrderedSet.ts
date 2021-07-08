import type * as P from './prelude'

import * as OM from './OrderedMap'
import { not } from './Predicate'

export class OrderedSet<A> implements Iterable<A> {
  constructor(readonly keyMap: OM.OrderedMap<A, null>) {}

  [Symbol.iterator](): Iterator<A> {
    return OM.keys_(this.keyMap)[Symbol.iterator]()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function make<A>(ord: P.Ord<A>): OrderedSet<A> {
  return new OrderedSet(OM.make(ord))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

export function add_<A>(set: OrderedSet<A>, a: A): OrderedSet<A> {
  return new OrderedSet(OM.insert_(set.keyMap, a, null))
}

export function add<A>(a: A): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => add_(set, a)
}

export function remove_<A>(set: OrderedSet<A>, a: A): OrderedSet<A> {
  return new OrderedSet(OM.remove_(set.keyMap, a))
}

export function remove<A>(a: A): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => new OrderedSet(OM.remove_(set.keyMap, a))
}

export function forEach_<A>(set: OrderedSet<A>, f: (a: A) => void): void {
  return OM.iforEach_(set.keyMap, (a) => f(a))
}

export function forEach<A>(f: (a: A) => void): (set: OrderedSet<A>) => void {
  return (set) => forEach_(set, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function has_<A>(set: OrderedSet<A>, a: A): boolean {
  return OM.get_(set.keyMap, a)._tag === 'Some'
}

export function has<A>(a: A): (set: OrderedSet<A>) => boolean {
  return (set) => has_(set, a)
}

export function isEmpty<A>(set: OrderedSet<A>): boolean {
  return OM.isEmpty(set.keyMap)
}

export function isNonEmpty<A>(set: OrderedSet<A>): boolean {
  return OM.isNonEmpty(set.keyMap)
}

export function isSubset_<A>(x: OrderedSet<A>, y: OrderedSet<A>): boolean {
  return every_(x, (a) => has_(y, a))
}

export function isSubset<A>(y: OrderedSet<A>): (x: OrderedSet<A>) => boolean {
  return (x) => isSubset_(x, y)
}

export function some_<A>(set: OrderedSet<A>, predicate: P.Predicate<A>): boolean {
  let found = false
  for (const a of set) {
    found = predicate(a)
    if (found) break
  }
  return found
}

export function some<A>(predicate: P.Predicate<A>): (set: OrderedSet<A>) => boolean {
  return (set) => some_(set, predicate)
}

export function every_<A>(set: OrderedSet<A>, predicate: P.Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<B>(O: P.Ord<B>): <A>(fa: OrderedSet<A>, f: (a: A) => B) => OrderedSet<B> {
  return (fa, f) => {
    let r = make<B>(O)
    forEach_(fa, (a) => {
      r = add_(r, f(a))
    })
    return r
  }
}

export function map<B>(O: P.Ord<B>): <A>(f: (a: A) => B) => (fa: OrderedSet<A>) => OrderedSet<B> {
  return (f) => (fa) => map_(O)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(set: OrderedSet<A>, refinement: P.Refinement<A, B>): OrderedSet<B>
export function filter_<A>(set: OrderedSet<A>, predicate: P.Predicate<A>): OrderedSet<A>
export function filter_<A>(set: OrderedSet<A>, predicate: P.Predicate<A>): OrderedSet<A> {
  return new OrderedSet(OM.ifilter_(set.keyMap, (a) => predicate(a)))
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (set: OrderedSet<A>) => OrderedSet<B>
export function filter<A>(predicate: P.Predicate<A>): (set: OrderedSet<A>) => OrderedSet<A>
export function filter<A>(predicate: P.Predicate<A>): (set: OrderedSet<A>) => OrderedSet<A> {
  return (set) => filter_(set, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, Z>(fa: OrderedSet<A>, z: Z, f: (z: Z, a: A) => Z): Z {
  return OM.ifoldl_(fa.keyMap, z, (z, a) => f(z, a))
}

export function foldl<A, Z>(z: Z, f: (z: Z, a: A) => Z): (fa: OrderedSet<A>) => Z {
  return (fa) => foldl_(fa, z, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<B>(O: P.Ord<B>): <A>(ma: OrderedSet<A>, f: (a: A) => Iterable<B>) => OrderedSet<B> {
  return (ma, f) => {
    let r = make(O)
    forEach_(ma, (a) => {
      for (const b of f(a)) {
        if (!has_(r, b)) {
          r = add_(r, b)
        }
      }
    })
    return r
  }
}

export function chain<B>(O: P.Ord<B>): <A>(f: (A: A) => Iterable<B>) => (ma: OrderedSet<A>) => OrderedSet<B> {
  return (f) => (ma) => chain_(O)(ma, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function intersection_<A>(x: OrderedSet<A>, y: Iterable<A>): OrderedSet<A> {
  let r = make(x.keyMap.ord)
  for (const a of y) {
    if (has_(x, a)) {
      r = add_(r, a)
    }
  }
  return r
}

export function intersection<A>(y: Iterable<A>): (x: OrderedSet<A>) => OrderedSet<A> {
  return (x) => intersection_(x, y)
}

export function difference_<A>(x: OrderedSet<A>, y: Iterable<A>): OrderedSet<A> {
  let r = x
  for (const a of y) {
    r = remove_(r, a)
  }
  return r
}

export function difference<A>(y: Iterable<A>): (x: OrderedSet<A>) => OrderedSet<A> {
  return (x) => difference_(x, y)
}

export function union_<A>(x: OrderedSet<A>, y: Iterable<A>): OrderedSet<A> {
  let r = make(x.keyMap.ord)
  forEach_(x, (a) => {
    r = add_(r, a)
  })
  for (const a of y) {
    r = add_(r, a)
  }
  return r
}

export function union<A>(y: Iterable<A>): (x: OrderedSet<A>) => OrderedSet<A> {
  return (x) => union_(x, y)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------------------------------------------
 */

export function values_<A>(set: OrderedSet<A>, direction: 0 | 1 = 0): Iterable<A> {
  return OM.keys_(set.keyMap, direction)
}

export function values(direction: 0 | 1 = 0): <A>(set: OrderedSet<A>) => Iterable<A> {
  return (set) => values_(set, direction)
}

export function size<A>(set: OrderedSet<A>): number {
  return OM.size(set.keyMap)
}

export function toArray<A>(set: OrderedSet<A>): ReadonlyArray<A> {
  const r: Array<A> = []
  forEach_(set, (a) => {
    r.push(a)
  })
  return r
}
