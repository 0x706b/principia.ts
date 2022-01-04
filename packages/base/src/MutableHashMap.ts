import type { Eq } from './Eq'
import type { Hash } from './Hash'

import { AtomicNumber } from './internal/AtomicNumber'
import * as I from './Iterable'
import * as M from './Maybe'
import { DefaultEq, DefaultHash } from './Structural'

export const HashMapTypeId = Symbol.for('@principia/base/MutableHashMap')
export type HashMapTypeId = typeof HashMapTypeId

class Node<K, V> implements Iterable<readonly [K, V]> {
  constructor(readonly k: K, public v: V, public next?: Node<K, V>) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Node<K, V> | undefined = this
    let n = 0
    return {
      next: () => {
        if (c) {
          const kv = [c.k, c.v] as const
          c        = c.next
          n++
          return {
            value: kv,
            done: false
          }
        } else {
          return {
            value: n,
            done: true
          }
        }
      }
    }
  }
}

/**
 * A Mutable HashMap
 */
export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _typeId: HashMapTypeId = HashMapTypeId
  readonly backingMap = new Map<number, Node<K, V>>()
  readonly length = new AtomicNumber(0)
  private hashEqK: Hash<K> & Eq<K>

  constructor(hashEqK?: Hash<K> & Eq<K>) {
    this.hashEqK = hashEqK ?? { ...DefaultHash, ...DefaultEq }
  }

  get(k: K): M.Maybe<V> {
    const hash = this.hashEqK.hash(k)
    const arr  = this.backingMap.get(hash)

    if (typeof arr === 'undefined') {
      return M.nothing()
    }

    let c: Node<K, V> | undefined = arr

    while (c) {
      if (this.hashEqK.equals_(k, c.k)) {
        return M.just(c.v)
      }
      c = c.next
    }

    return M.nothing()
  }

  remove(k: K): HashMap<K, V> {
    const hash = this.hashEqK.hash(k)
    const arr  = this.backingMap.get(hash)

    if (typeof arr === 'undefined') {
      return this
    }

    if (this.hashEqK.equals_(k, arr.k)) {
      if (typeof arr.next !== 'undefined') {
        this.backingMap.set(hash, arr.next)
      } else {
        this.backingMap.delete(hash)
      }
      this.length.decrementAndGet()
      return this
    }

    let next: Node<K, V> | undefined = arr.next
    let curr = arr

    while (next) {
      if (this.hashEqK.equals_(k, next.k)) {
        curr.next = next.next
        this.length.decrementAndGet()
        return this
      }
      curr = next
      next = next.next
    }

    return this
  }

  set(k: K, v: V): HashMap<K, V> {
    const hash = this.hashEqK.hash(k)
    const arr  = this.backingMap.get(hash)

    if (typeof arr === 'undefined') {
      this.backingMap.set(hash, new Node(k, v))
      this.length.incrementAndGet()
      return this
    }

    let c: Node<K, V> | undefined = arr
    let l = arr

    while (c) {
      if (this.hashEqK.equals_(k, c.k)) {
        c.v = v
        return this
      }
      l = c
      c = c.next
    }

    this.length.incrementAndGet()
    l.next = new Node(k, v)
    return this
  }

  update(k: K, f: (v: V) => V): HashMap<K, V> {
    const hash = this.hashEqK.hash(k)
    const arr  = this.backingMap.get(hash)

    if (typeof arr === 'undefined') {
      return this
    }

    let c: Node<K, V> | undefined = arr

    while (c) {
      if (this.hashEqK.equals_(k, c.k)) {
        c.v = f(c.v)
        return this
      }
      c = c.next
    }

    return this
  }

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return I.chain_(this.backingMap, ([, _]) => _)[Symbol.iterator]()
  }
}

/**
 * Creates a new map
 */
export function hashMap<K, V>(hashEqK?: Hash<K> & Eq<K>) {
  return new HashMap<K, V>(hashEqK)
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): M.Maybe<V> {
  return map.get(key)
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
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return map.set(key, value)
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
 * Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K): HashMap<K, V> {
  return map.remove(key)
}

/**
 * Remove the entry for `key` in `map` using internal hash.
 *
 * @dataFirst remove_
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, V>(map: HashMap<K, V>) {
  return map.length.get
}

/**
 * Update a value if exists
 */
export function update_<K, V>(map: HashMap<K, V>, key: K, f: (v: V) => V) {
  return map.update(key, f)
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
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modify_<K, V>(map: HashMap<K, V>, key: K, f: (v: M.Maybe<V>) => M.Maybe<V>) {
  const v = f(map.get(key))
  if (M.isJust(v)) {
    map.set(key, v.value)
  } else {
    map.remove(key)
  }
  return map
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
