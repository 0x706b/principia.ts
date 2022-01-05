/*
 * Scala (https://www.scala-lang.org)
 *
 * Copyright EPFL and Lightbend, Inc.
 *
 * Licensed under Apache License 2.0
 * (http://www.apache.org/licenses/LICENSE-2.0).
 *
 * See the doc/LICENSE.md file in the root of this source tree
 * for more information regarding copyright ownership
 */

import type { Eq } from '../../Eq'
import type { Hash } from '../../Hash'

import { unsafeCoerce } from '../../function'
import * as M from '../../Maybe'
import { DefaultEq, DefaultHash } from '../../Structural'
import { assert } from '../../util/assert'
import { copyOfArray, improveHash, tableSizeFor } from './internal'

const DEFAULT_INITIAL_CAPACITY = 16
const DEFAULT_LOAD_FACTOR      = 0.75

export class HashMap<K, V> {
  constructor(
    private initialCapacity: number,
    private loadFactor: number,
    private H: Hash<K> = DefaultHash,
    private Eq: Eq<K> = DefaultEq
  ) {}

  static empty<K, V>(H?: Hash<K>, Eq?: Eq<K>): HashMap<K, V> {
    return new HashMap(DEFAULT_INITIAL_CAPACITY, DEFAULT_LOAD_FACTOR, H, Eq)
  }

  private table = new Array<Node<K, V> | undefined>(tableSizeFor(this.initialCapacity))

  private threshold = this.newThreshold(this.table.length)

  private contentSize = 0

  get size(): number {
    return this.contentSize
  }

  has(key: K): boolean {
    return this.findNode(key) !== undefined
  }

  get(key: K): M.Maybe<V> {
    const n = this.findNode(key)
    return n ? M.just(n.value) : M.nothing()
  }

  set(key: K, value: V): M.Maybe<V> {
    return this._set(key, value, true)
  }

  delete(key: K): M.Maybe<V> {
    const n = this._delete(key)
    return n ? M.just(n.value) : M.nothing()
  }

  updateWith(key: K, f: (v: M.Maybe<V>) => M.Maybe<V>): M.Maybe<V> {
    const hash                               = this.computeHash(key)
    const indexedHash                        = this.index(hash)
    let foundNode: Node<K, V> | undefined    = undefined
    let previousNode: Node<K, V> | undefined = undefined
    const n = this.table[indexedHash]
    if (n) {
      let prev: Node<K, V> | undefined = undefined
      let nd: Node<K, V> | undefined   = n
      while (nd) {
        if (hash === nd.hash && this.Eq.equals_(key, nd.key)) {
          previousNode = prev
          foundNode    = nd
          break
        } else if (nd.next === undefined || nd.hash > hash) {
          break
        } else {
          prev = nd
          nd   = nd.next
        }
      }
    }
    const previousValue = foundNode === undefined ? M.nothing() : M.just(foundNode.value)
    const nextValue     = f(previousValue)
    M.match_(
      previousValue,
      () =>
        M.match_(
          nextValue,
          () => {
            /* do nothing */
          },
          (value) => {
            const newIndexedHash =
              this.contentSize + 1 > this.threshold
                ? (this.growTable(this.table.length * 2), this.index(hash))
                : indexedHash
            this._set0(key, value, false, hash, newIndexedHash)
          }
        ),
      () =>
        M.match_(
          nextValue,
          () => {
            if (previousNode !== undefined) {
              previousNode.next = foundNode!.next
            } else {
              this.table[indexedHash] = foundNode!.next
            }
            this.contentSize -= 1
          },
          (newValue) => {
            foundNode!.value = newValue
          }
        )
    )
    return nextValue
  }

  forEach<U>(f: (k: K, v: V) => U): void {
    for (let i = 0; i < this.table.length; i++) {
      const n = this.table[i]
      if (n !== undefined) n.forEach(f)
    }
  }

  private _set(key: K, value: V, getOld: boolean) {
    if (this.contentSize + 1 >= this.threshold) {
      this.growTable(this.table.length * 2)
    }
    const hash = this.computeHash(key)
    const idx  = this.index(hash)
    return this._set0(key, value, getOld, hash, idx)
  }

  private _setHash(key: K, value: V, hash: number, getOld: boolean) {
    if (this.contentSize + 1 >= this.threshold) {
      this.growTable(this.table.length * 2)
    }
    const idx = this.index(hash)
    return this._set0(key, value, getOld, hash, idx)
  }

  private _set0(key: K, value: V, getOld: boolean, hash: number, idx: number): M.Maybe<V> {
    let n = this.table[idx]
    if (n === undefined) {
      this.table[idx] = new Node(key, hash, value, undefined)
    } else {
      const old = n
      let prev: Node<K, V> | undefined = undefined
      while (n !== undefined && n.hash <= hash) {
        if (n.hash === hash && this.Eq.equals_(key, n.key)) {
          const old = n.value
          n.value   = value
          if (getOld) return M.just(old)
          else return M.nothing()
        }
        prev = n
        n    = n.next
      }
      if (prev === undefined) {
        this.table[idx] = new Node(key, hash, value, old)
      } else {
        prev.next = new Node(key, hash, value, prev.next)
      }
    }
    this.contentSize += 1
    return M.nothing()
  }

  private _delete(key: K): Node<K, V> | undefined {
    return this._deleteHash(key, this.computeHash(key))
  }

  private _deleteHash(key: K, hash: number): Node<K, V> | undefined {
    const idx = this.index(hash)
    const nd  = this.table[idx]
    if (nd === undefined) {
      return undefined
    } else if (nd.hash === hash && this.Eq.equals_(nd.key, key)) {
      this.table[idx]   = nd.next
      this.contentSize -= 1
      return nd
    } else {
      let prev = nd
      let next = nd.next
      while (next && next.hash <= hash) {
        if (next.hash === hash && this.Eq.equals_(next.key, key)) {
          prev.next         = next.next
          this.contentSize -= 1
          return next
        }
        prev = next
        next = next.next
      }
      return undefined
    }
  }

  private newThreshold(size: number) {
    return Math.floor(size * this.loadFactor)
  }

  private computeHash(k: K): number {
    return improveHash(this.H.hash(k))
  }

  private index(hash: number) {
    return hash & (this.table.length - 1)
  }

  private findNode(key: K): Node<K, V> | undefined {
    const hash = this.computeHash(key)
    const n    = this.table[this.index(hash)]
    return n === undefined ? n : n.findNode(key, hash, this.Eq.equals_)
  }

  private growTable(newLen: number) {
    assert(newLen >= 0, `New HashMap table size ${newLen}`)
    let oldLen     = this.table.length
    this.threshold = this.newThreshold(newLen)
    if (this.size === 0) {
      this.table = new Array(newLen)
    } else {
      this.table    = copyOfArray(this.table, newLen)
      const preLow  = new Node<K, V>(unsafeCoerce(undefined), 0, unsafeCoerce(undefined), undefined)
      const preHigh = new Node<K, V>(unsafeCoerce(undefined), 0, unsafeCoerce(undefined), undefined)
      while (oldLen < newLen) {
        let i = 0
        while (i < oldLen) {
          const old = this.table[i]
          if (old !== undefined) {
            preLow.next                   = undefined
            preHigh.next                  = undefined
            let lastLow                   = preLow
            let lastHigh                  = preHigh
            let n: Node<K, V> | undefined = old
            while (n) {
              let next: Node<K, V> | undefined = n.next
              if ((n.hash & oldLen) === 0) {
                lastLow.next = n
                lastLow      = n
              } else {
                lastHigh.next = n
                lastHigh      = n
              }
              n = next
            }
            lastLow.next = undefined
            if (old !== preLow.next) {
              this.table[i] = preLow.next
            }
            if (preHigh.next !== undefined) {
              this.table[i + oldLen] = preHigh.next
              lastHigh.next          = undefined
            }
          }
          i += 1
        }
        oldLen *= 2
      }
    }
  }
}

class Node<K, V> {
  constructor(public key: K, public hash: number, public value: V, public next: Node<K, V> | undefined) {}

  findNode(k: K, h: number, equals: (x: K, y: K) => boolean): Node<K, V> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let n: Node<K, V> | undefined = this
    while (n) {
      if (h === n.hash && equals(k, n.key)) {
        return n
      } else {
        n = n.next
      }
    }
    return undefined
  }

  forEach<U>(f: (k: K, v: V) => U): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let n: Node<K, V> | undefined = this
    while (n) {
      f(n.key, n.value)
      n = n.next
    }
  }
}
