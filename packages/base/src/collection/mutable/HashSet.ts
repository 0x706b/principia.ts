import type { Eq } from '../../Eq'
import type { Hash } from '../../Hash'

import * as M from '../../Maybe'
import { DefaultEq, DefaultHash } from '../../Structural'
import { HashMap } from './HashMap'

const DEFAULT_INITIAL_CAPACITY = 16
const DEFAULT_LOAD_FACTOR      = 0.75

// TODO: this could be made more efficient by not using a backing HashMap,
// and instead using its own nodes. Need to decide if its worth the extra bytes.

export class HashSet<A> {
  private backing: HashMap<A, void>

  constructor(initialCapacity: number, loadFactor: number, H: Hash<A> = DefaultHash, Eq: Eq<A> = DefaultEq) {
    this.backing = new HashMap(initialCapacity, loadFactor, H, Eq)
  }

  static empty<A>(H?: Hash<A>, Eq?: Eq<A>) {
    return new HashSet(DEFAULT_INITIAL_CAPACITY, DEFAULT_LOAD_FACTOR, H, Eq)
  }

  add(elem: A): boolean {
    return M.isJust(this.backing.set(elem, undefined))
  }

  remove(elem: A): boolean {
    return M.isJust(this.backing.delete(elem))
  }

  has(elem: A): boolean {
    return this.backing.has(elem)
  }

  forEach<U>(f: (a: A) => U): void {
    this.backing.forEach(f)
  }
}
