import type { Eq } from './Eq'
import type { Hash } from './Hash'

import * as I from './Iterable'
import * as M from './Maybe'
import * as MHM from './MutableHashMap'

export class HashSet<A> {
  private hashMap: MHM.HashMap<A, boolean>

  constructor(hashEqA?: Hash<A> & Eq<A>) {
    this.hashMap = MHM.hashMap(hashEqA)
  }

  size(): number {
    return this.hashMap.length.get
  }

  isEmpty(): boolean {
    return this.size() === 0
  }

  contains(a: A): boolean {
    return M.getOrElse_(this.hashMap.get(a), () => false)
  }

  add(a: A): boolean {
    this.hashMap.set(a, true)

    return this.contains(a)
  }

  remove(a: A): boolean {
    this.hashMap.remove(a)

    return !this.contains(a)
  }

  [Symbol.iterator](): Iterator<A> {
    return I.map_(this.hashMap, ([a]) => a)[Symbol.iterator]()
  }
}

/**
 * Creates a new set
 */
export function hashSet<A>(hashEqA?: Hash<A> & Eq<A>): HashSet<A> {
  return new HashSet(hashEqA)
}

/**
 * Calculate the number of values in a set
 */
export function size<A>(self: HashSet<A>): number {
  return self.size()
}

/**
 * returns `true` if the set is empty
 */
export function isEmpty<A>(self: HashSet<A>): boolean {
  return self.isEmpty()
}

/**
 * Creates a new set
 */
export function contains_<A>(self: HashSet<A>, a: A): boolean {
  return self.contains(a)
}

/**
 * return true if the set contains `a`
 *
 * @dataFirst contains_
 */
export function contains<A>(a: A) {
  return (self: HashSet<A>) => contains_(self, a)
}

/**
 * add `a` to the set
 */
export function add_<A>(self: HashSet<A>, a: A): boolean {
  return self.add(a)
}

/**
 * add `a` to the set
 *
 * @dataFirst add_
 */
export function add<A>(a: A) {
  return (self: HashSet<A>) => add_(self, a)
}

/**
 * remove `a` from the set
 */
export function remove_<A>(self: HashSet<A>, a: A): boolean {
  return self.remove(a)
}

/**
 * remove `a` from the set
 *
 * @dataFirst remove_
 */
export function remove<A>(a: A) {
  return (self: HashSet<A>) => remove_(self, a)
}
