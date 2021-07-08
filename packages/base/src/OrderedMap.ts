/* eslint-disable functional/immutable-data */

/**
 * A persistent ordered map implementation backed by a Red-Black Tree with iterative operations
 *
 * Forked from https://github.com/mikolalysenko/functional-red-black-tree
 */

import type { Option } from './Option'
import type * as P from './prelude'
import type { Stack } from './util/support/Stack'

import * as O from './Option'
import { makeStack } from './util/support/Stack'

export class OrderedMap<K, V> implements OrderedMapIterable<K, V> {
  constructor(readonly ord: P.Ord<K>, readonly root: Node<K, V> | Leaf) {}

  [Symbol.iterator](): OrderedMapIterator<K, V> {
    return forward(this)[Symbol.iterator]()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function make<K, V>(ord: P.Ord<K>) {
  return new OrderedMap<K, V>(ord, null)
}

/**
 * Creates a new `OrderedMap` from an `Ord` and an iterable of key-value pairs
 */
export function from<K, V>(iterable: OrderedMapIterable<K, V>): OrderedMap<K, V>
export function from<K, V>(iterable: Iterable<readonly [K, V]>, ord: P.Ord<K>): OrderedMap<K, V>
export function from<K, V>(
  ...args: [OrderedMapIterable<K, V>] | [Iterable<readonly [K, V]>, P.Ord<K>]
): OrderedMap<K, V> {
  let tree = args.length === 2 ? make<K, V>(args[1]) : make<K, V>(args[0].ord)

  for (const [k, v] of args[0]) {
    tree = insert_(tree, k, v)
  }
  return tree
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isEmpty<K, V>(m: OrderedMap<K, V>): boolean {
  return m.root === Leaf
}

export function isNonEmpty<K, V>(m: OrderedMap<K, V>): boolean {
  return m.root !== Leaf
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Inserts an element into the correct position in the map.
 * This function inserts duplicate keys. For one that combines duplicate key's values,
 * see `insertWith_`
 */
export function insert_<K, V>(m: OrderedMap<K, V>, key: K, value: V): OrderedMap<K, V> {
  if (isEmptyNode(m.root)) {
    return new OrderedMap(m.ord, Node(R, Leaf, key, value, Leaf, 1))
  }
  const cmp                                   = m.ord.compare_
  const nodeStack: Array<Mutable<Node<K, V>>> = []
  const orderStack: Array<P.Ordering>         = []
  let n: RBNode<K, V>                         = m.root
  while (n) {
    const d = cmp(key, n.key)
    nodeStack.push(n)
    orderStack.push(d)
    if (d <= 0) {
      n = n.left
    } else {
      n = n.right
    }
  }

  nodeStack.push(Node(R, Leaf, key, value, Leaf, 1))
  rebuildModifiedPath(nodeStack, orderStack)
  balanceModifiedPath(nodeStack)

  return new OrderedMap(m.ord, nodeStack[0])
}

/**
 * Inserts an element into the correct position in the map.
 * This function ignores duplicate keys. For one that combines duplicate key's values,
 * see `insertWith_`
 */
export function insert<K, V>(key: K, value: V): (m: OrderedMap<K, V>) => OrderedMap<K, V> {
  return (m) => insert_(m, key, value)
}

/**
 * Inserts an element into the correct position in the map, combining the values of keys of equal ordering
 * with a `Semigroup` instance
 */
export function insertWith_<V>(S: P.Semigroup<V>) {
  return <K>(m: OrderedMap<K, V>, key: K, value: V) => {
    if (isEmptyNode(m.root)) {
      return new OrderedMap(m.ord, Node(R, Leaf, key, value, Leaf, 1))
    }
    const com                                   = S.combine_
    const cmp                                   = m.ord.compare_
    const nodeStack: Array<Mutable<Node<K, V>>> = []
    const orderStack: Array<1 | -1>             = []
    let n: RBNode<K, V>                         = m.root
    let cv: V | null                            = null
    while (n && !cv) {
      const d = cmp(key, n.key)
      nodeStack.push(n)
      switch (d) {
        case -1: {
          orderStack.push(d)
          n = n.left
          break
        }
        case 1: {
          orderStack.push(d)
          n = n.right
          break
        }
        case 0: {
          cv = com(n.value, value)
          break
        }
      }
    }
    if (cv) {
      const u                         = nodeStack[nodeStack.length - 1]
      const updated                   = Node(u.color, u.left, u.key, cv, u.right, u.count)
      nodeStack[nodeStack.length - 1] = updated
      rebuildModifiedPath(nodeStack, orderStack, 0)
    } else {
      nodeStack.push(Node(R, Leaf, key, value, Leaf, 1))
      rebuildModifiedPath(nodeStack, orderStack)
      balanceModifiedPath(nodeStack)
    }
    return new OrderedMap(m.ord, nodeStack[0])
  }
}

/**
 * Inserts an element into the correct position in the map, combining euqal key's values
 * with a `Semigroup` instance
 */
export function insertWith<V>(S: P.Semigroup<V>): <K>(key: K, value: V) => (m: OrderedMap<K, V>) => OrderedMap<K, V> {
  const insertWithS_ = insertWith_(S)
  return (key, value) => (m) => insertWithS_(m, key, value)
}

/**
 * Removes an element from the map
 */
export function remove_<K, V>(m: OrderedMap<K, V>, key: K): OrderedMap<K, V> {
  const iter = find_(m, key)[Symbol.iterator]()
  return iter.isEmpty ? m : iter.remove()
}

/**
 * Removes an element from the map
 */
export function remove<K>(key: K): <V>(m: OrderedMap<K, V>) => OrderedMap<K, V> {
  return (m) => remove_(m, key)
}

/**
 * Searches the map for a given key, returning it's value, if it exists
 */
export function get_<K, V>(m: OrderedMap<K, V>, key: K): Option<V> {
  const cmp = m.ord.compare_
  let n     = m.root
  while (n) {
    const d = cmp(key, n.key)
    switch (d) {
      case 0: {
        return O.some(n.value)
      }
      case -1: {
        n = n.left
        break
      }
      case 1: {
        n = n.right
        break
      }
    }
  }
  return O.none()
}

/**
 * Searches the map for a given key, returning it's value, if it exists
 */
export function get<K>(key: K): <V>(m: OrderedMap<K, V>) => Option<V> {
  return (tree) => get_(tree, key)
}

/**
 * Searches the map and returns the first value in sorted order that is >= key, if it exists
 */
export function getGte_<K, V>(m: OrderedMap<K, V>, key: K): Option<V> {
  const cmp     = m.ord.compare_
  let n         = m.root
  let lastValue = O.none<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d <= 0) {
      lastValue = O.some(n.value)
      n         = n.left
    } else {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    }
  }
  return lastValue
}

/**
 * Searches the map and returns the first value in sorted order that is >= key, if it exists
 */
export function getGte<K>(key: K): <V>(m: OrderedMap<K, V>) => Option<V> {
  return (tree) => getGte_(tree, key)
}

/**
 * Searches the map and returns the first value in sorted order that is > key, if it exists
 */
export function getGt_<K, V>(m: OrderedMap<K, V>, key: K): Option<V> {
  const cmp     = m.ord.compare_
  let n         = m.root
  let lastValue = O.none<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d < 0) {
      lastValue = O.some(n.value)
      n         = n.left
    } else {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    }
  }
  return lastValue
}

/**
 * Searches the map and returns the first value in sorted order that is > key, if it exists
 */
export function getGt<K>(key: K): <V>(m: OrderedMap<K, V>) => Option<V> {
  return (m) => getGt_(m, key)
}

/**
 * Searches the map and returns the first value in sorted order that is <= key, if it exists
 */
export function getLte_<K, V>(m: OrderedMap<K, V>, key: K): Option<V> {
  const cmp     = m.ord.compare_
  let n         = m.root
  let lastValue = O.none<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d > 0) {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    } else {
      lastValue = O.some(n.value)
      n         = n.left
    }
  }
  return lastValue
}

/**
 * Searches the map and returns the first value in sorted order that is <= key, if it exists
 */
export function getLte<K>(key: K): <V>(m: OrderedMap<K, V>) => Option<V> {
  return (m) => getLte_(m, key)
}

/**
 * Searches the map and returns the first value in sorted order that is < key, if it exists
 */
export function getLt_<K, V>(m: OrderedMap<K, V>, key: K): Option<V> {
  const cmp     = m.ord.compare_
  let n         = m.root
  let lastValue = O.none<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d > 0) {
      lastValue = O.some(n.value)
    }
    if (d <= 0) {
      n = n.left
    } else {
      n = n.right
    }
  }
  return lastValue
}

/**
 * Searches the map and returns the first value in sorted order that is < key, if it exists
 */
export function getLt<K>(key: K): <V>(m: OrderedMap<K, V>) => Option<V> {
  return (m) => getLt_(m, key)
}

export function visitFull<K, V, A>(m: OrderedMap<K, V>, visit: (key: K, value: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

/**
 * Iterates through the elements of the map inorder, performing the given function for each element
 */
export function iforEach_<K, V>(m: OrderedMap<K, V>, visit: (key: K, value: V) => void) {
  if (m.root) {
    visitFull(m, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

/**
 * Iterates through the elements of the map inorder, performing the given function for each element
 */
export function iforEach<K, V>(visit: (key: K, value: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => iforEach_(m, visit)
}

/**
 * Iterates through the elements of the map inorder, performing the given function for each element
 */
export function forEach_<K, V>(m: OrderedMap<K, V>, visit: (v: V) => void) {
  return iforEach_(m, (_, v) => visit(v))
}

/**
 * Iterates through the elements of the map inorder, performing the given function for each element
 */
export function forEach<V>(visit: (v: V) => void): <K>(m: OrderedMap<K, V>) => void {
  return (m) => forEach_(m, visit)
}

export function forEachLte_<K, V>(m: OrderedMap<K, V>, max: K, visit: (k: K, v: V) => void): void {
  if (m.root) {
    visitLte(m, max, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

export function forEachLte<K, V>(max: K, visit: (k: K, v: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => forEachLte_(m, max, visit)
}

export function forEachLt_<K, V>(m: OrderedMap<K, V>, max: K, visit: (k: K, v: V) => void): void {
  if (m.root) {
    visitLt(m, max, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

export function forEachLt<K, V>(max: K, visit: (k: K, v: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => forEachLt_(m, max, visit)
}

export function forEachGte_<K, V>(m: OrderedMap<K, V>, min: K, visit: (k: K, v: V) => void): void {
  if (m.root) {
    visitGte(m, min, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

export function forEachGte<K, V>(min: K, visit: (k: K, v: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => forEachGte_(m, min, visit)
}

export function forEachGt_<K, V>(m: OrderedMap<K, V>, min: K, visit: (k: K, v: V) => void): void {
  if (m.root) {
    visitGt(m, min, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

export function forEachGt<K, V>(min: K, visit: (k: K, v: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => forEachGt_(m, min, visit)
}

export function forEachBetween_<K, V>(m: OrderedMap<K, V>, min: K, max: K, visit: (k: K, v: V) => void): void {
  if (m.root) {
    visitBetween(m, min, max, (k, v) => {
      visit(k, v)
      return O.none()
    })
  }
}

export function forEachBetween<K, V>(min: K, max: K, visit: (k: K, v: V) => void): (m: OrderedMap<K, V>) => void {
  return (m) => forEachBetween_(m, min, max, visit)
}

export function visitLte<K, V, A>(m: OrderedMap<K, V>, max: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = m.ord.compare_

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      if (cmp(stack.value.key, max) > 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

export function visitLt<K, V, A>(m: OrderedMap<K, V>, max: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = m.ord.compare_

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      if (cmp(stack.value.key, max) >= 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

export function visitGte<K, V, A>(m: OrderedMap<K, V>, min: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = m.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) >= 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, min) >= 0) {
        const v = visit(stack.value.key, stack.value.value)
        if (v._tag === 'Some') {
          return v
        }
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

export function visitGt<K, V, A>(m: OrderedMap<K, V>, min: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = m.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) > 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, min) > 0) {
        const v = visit(stack.value.key, stack.value.value)
        if (v._tag === 'Some') {
          return v
        }
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

export function visitBetween<K, V, A>(
  m: OrderedMap<K, V>,
  min: K,
  max: K,
  visit: (k: K, v: V) => Option<A>
): Option<A> {
  let current: RBNode<K, V>                = m.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = m.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) > 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, max) >= 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.none()
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<K, A, B>(fa: OrderedMap<K, A>, f: (a: A) => B): OrderedMap<K, B> {
  let tree = make<K, B>(fa.ord)
  for (const [k, v] of fa) {
    tree = insert_(tree, k, f(v))
  }
  return tree
}

export function map<A, B>(f: (a: A) => B): <K>(fa: OrderedMap<K, A>) => OrderedMap<K, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function ifilter_<K, A, B extends A>(
  m: OrderedMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): OrderedMap<K, B>
export function ifilter_<K, A>(m: OrderedMap<K, A>, predicate: P.PredicateWithIndex<K, A>): OrderedMap<K, A>
export function ifilter_<K, A>(m: OrderedMap<K, A>, predicate: P.PredicateWithIndex<K, A>): OrderedMap<K, A> {
  let r         = make<K, A>(m.ord)
  const entries = forward(m)
  for (const [k, v] of entries) {
    if (predicate(k, v)) {
      r = insert_(m, k, v)
    }
  }
  return r
}

export function ifilter<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (m: OrderedMap<K, A>) => OrderedMap<K, B>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (m: OrderedMap<K, A>) => OrderedMap<K, A>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (m: OrderedMap<K, A>) => OrderedMap<K, A> {
  return (m) => ifilter_(m, predicate)
}

export function filter_<K, A, B extends A>(m: OrderedMap<K, A>, refinement: P.Refinement<A, B>): OrderedMap<K, B>
export function filter_<K, A>(m: OrderedMap<K, A>, predicate: P.Predicate<A>): OrderedMap<K, A>
export function filter_<K, A>(m: OrderedMap<K, A>, predicate: P.Predicate<A>): OrderedMap<K, A> {
  return ifilter_(m, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): <K>(m: OrderedMap<K, A>) => OrderedMap<K, B>
export function filter<A>(predicate: P.Predicate<A>): <K>(m: OrderedMap<K, A>) => OrderedMap<K, A>
export function filter<A>(predicate: P.Predicate<A>): <K>(m: OrderedMap<K, A>) => OrderedMap<K, A> {
  return (m) => filter_(m, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function ifoldl_<K, V, Z>(fa: OrderedMap<K, V>, z: Z, f: (z: Z, k: K, v: V) => Z): Z {
  let r = z
  iforEach_(fa, (k, v) => {
    r = f(r, k, v)
  })
  return r
}

export function ifoldl<K, V, Z>(z: Z, f: (z: Z, k: K, v: V) => Z): (fa: OrderedMap<K, V>) => Z {
  return (fa) => ifoldl_(fa, z, f)
}

export function foldl_<K, V, Z>(fa: OrderedMap<K, V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return ifoldl_(fa, z, (z, _, v) => f(z, v))
}

export function foldl<V, Z>(z: Z, f: (z: Z, v: V) => Z): <K>(fa: OrderedMap<K, V>) => Z {
  return (fa) => foldl_(fa, z, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Returns the first ("smallest") element in the map
 */
export function head<K, V>(m: OrderedMap<K, V>): Option<readonly [K, V]> {
  return O.map_(headNode(m.root), (n) => [n.key, n.value])
}

/**
 * Returns the last ("largest") element in the map
 */
export function last<K, V>(m: OrderedMap<K, V>): Option<readonly [K, V]> {
  return O.map_(lastNode(m.root), (n) => [n.key, n.value])
}

export function size<K, V>(m: OrderedMap<K, V>): number {
  return m.root?.count ?? 0
}

/**
 * Converts a `OrderedMap` into a sorted `ReadonlyArray`
 */
export function toArray<K, V>(m: OrderedMap<K, V>): ReadonlyArray<readonly [K, V]> {
  const as: Array<readonly [K, V]> = []
  iforEach_(m, (k, v) => {
    as.push([k, v])
  })
  return as
}

export function forward<K, V>(m: OrderedMap<K, V>): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const stack: Array<Node<K, V>> = []
      let n                          = m.root
      while (n) {
        stack.push(n)
        n = n.left
      }
      return new OrderedMapIterator(m, stack, 0)
    }
  }
}

export function backward<K, V>(m: OrderedMap<K, V>): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const stack: Array<Node<K, V>> = []
      let n                          = m.root
      while (n) {
        stack.push(n)
        n = n.right
      }
      return new OrderedMapIterator(m, stack, 1)
    }
  }
}

export function find_<K, V>(m: OrderedMap<K, V>, key: K, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const cmp                      = m.ord.compare_
      let n                          = m.root
      const stack: Array<Node<K, V>> = []
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        switch (d) {
          case 0: {
            return new OrderedMapIterator(m, stack, direction)
          }
          case -1: {
            n = n.left
            break
          }
          case 1: {
            n = n!.right
            break
          }
        }
      }
      return new OrderedMapIterator(m, [], direction)
    }
  }
}

export function at_<K, V>(m: OrderedMap<K, V>, index: number, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      if (index < 0 || !m.root) {
        return new OrderedMapIterator(m, [], direction)
      }
      let idx                        = index
      let n                          = m.root
      const stack: Array<Node<K, V>> = []
      for (;;) {
        stack.push(n)
        if (n.left) {
          if (index < n.left.count) {
            n = n.left
            continue
          }
          idx -= n.left.count
        }
        if (!idx) {
          return new OrderedMapIterator(m, stack, direction)
        }
        idx -= 1
        if (n.right) {
          if (idx >= n.right.count) {
            break
          }
          n = n.right
        } else {
          break
        }
      }
      return new OrderedMapIterator(m, [], direction)
    }
  }
}

export function at(index: number, direction: 0 | 1 = 0): <K, V>(tree: OrderedMap<K, V>) => OrderedMapIterable<K, V> {
  return (tree) => at_(tree, index, direction)
}

/**
 * Finds the first element in the map whose key is >= the given key
 * @returns An iterator at the found element
 */
export function gte_<K, V>(m: OrderedMap<K, V>, key: K, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const cmp                      = m.ord.compare_
      let n: RBNode<K, V>            = m.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d <= 0) {
          last_ptr = stack.length
          n        = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new OrderedMapIterator(m, stack, direction)
    }
  }
}

/**
 * Finds the first element in the map whose key is >= the given key
 * @returns An iterator at the found element
 */
export function gte<K>(key: K, direction: 0 | 1 = 0): <V>(m: OrderedMap<K, V>) => OrderedMapIterable<K, V> {
  return (m) => gte_(m, key, direction)
}

/**
 * Finds the first element in the map whose key is > the given key
 * @returns An iterator at the found element
 */
export function gt_<K, V>(m: OrderedMap<K, V>, key: K, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const cmp                      = m.ord.compare_
      let n: RBNode<K, V>            = m.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d < 0) {
          last_ptr = stack.length
          n        = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new OrderedMapIterator(m, stack, direction)
    }
  }
}

/**
 * Finds the first element in the map whose key is > the given key
 * @returns An iterator at the found element
 */
export function gt<K>(key: K, direction: 0 | 1 = 0): <V>(m: OrderedMap<K, V>) => OrderedMapIterable<K, V> {
  return (m) => gt_(m, key, direction)
}

/**
 * Finds the first element in the map whose key is <= the given key
 * @returns An iterator at the found element
 */
export function lte_<K, V>(m: OrderedMap<K, V>, key: K, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const cmp                      = m.ord.compare_
      let n: RBNode<K, V>            = m.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d >= 0) {
          last_ptr = stack.length
        }
        if (d < 0) {
          n = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new OrderedMapIterator(m, stack, direction)
    }
  }
}

/**
 * Finds the first element in the map whose key is <= the given key
 * @returns An iterator at the found element
 */
export function lte<K>(key: K, direction: 0 | 1 = 0): <V>(m: OrderedMap<K, V>) => OrderedMapIterable<K, V> {
  return (m) => lte_(m, key, direction)
}

/**
 * Finds the first element in the map whose key is < the given key
 * @returns An iterator at the found element
 */
export function lt_<K, V>(m: OrderedMap<K, V>, key: K, direction: 0 | 1 = 0): OrderedMapIterable<K, V> {
  return {
    ord: m.ord,
    [Symbol.iterator]() {
      const cmp                      = m.ord.compare_
      let n: RBNode<K, V>            = m.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d > 0) {
          last_ptr = stack.length
        }
        if (d <= 0) {
          n = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new OrderedMapIterator(m, stack, direction)
    }
  }
}

/**
 * Finds the first element in the map whose key is < the given key
 * @returns An iterator at the found element
 */
export function lt<K>(key: K, direction: 0 | 1 = 0): <V>(m: OrderedMap<K, V>) => OrderedMapIterable<K, V> {
  return (m) => lt_(m, key, direction)
}

/**
 * Returns an iterable of all the values in the map in sorted order
 */
export function values_<K, V>(m: OrderedMap<K, V>, direction: 0 | 1 = 0): Iterable<V> {
  return {
    *[Symbol.iterator]() {
      const iter: Iterator<readonly [K, V]> = direction ? backward(m)[Symbol.iterator]() : forward(m)[Symbol.iterator]()
      let d: IteratorResult<readonly [K, V]>
      while (!(d = iter.next()).done) {
        yield d.value[1]
      }
    }
  }
}

/**
 * Returns an iterable of all the values in the map in sorted order
 */
export function values(direction: 0 | 1 = 0): <K, V>(m: OrderedMap<K, V>) => Iterable<V> {
  return (m) => values_(m, direction)
}

/**
 * Returns an iterable of all the keys in the map in sorted order
 */
export function keys_<K, V>(m: OrderedMap<K, V>, direction: 0 | 1 = 0): Iterable<K> {
  return {
    *[Symbol.iterator]() {
      const iter: Iterator<readonly [K, V]> = direction ? backward(m)[Symbol.iterator]() : forward(m)[Symbol.iterator]()
      let d: IteratorResult<readonly [K, V]>
      while (!(d = iter.next()).done) {
        yield d.value[0]
      }
    }
  }
}

/**
 * Returns an iterable of all the keys in the map in sorted order
 */
export function keys(direction: 0 | 1 = 0): <K, V>(m: OrderedMap<K, V>) => Iterable<K> {
  return (m) => keys_(m, direction)
}

/**
 * Returns a range of the map with keys >= min and < max
 */
export function range_<K, V>(m: OrderedMap<K, V>, min: Option<K>, max: Option<K>): OrderedMap<K, V> {
  let r = make<K, V>(m.ord)
  if (min._tag === 'Some') {
    if (max._tag === 'Some') {
      forEachBetween_(m, min.value, max.value, (k, v) => {
        r = insert_(r, k, v)
      })
    } else {
      forEachGte_(m, min.value, (k, v) => {
        r = insert_(r, k, v)
      })
    }
  } else if (max._tag === 'Some') {
    forEachLt_(m, max.value, (k, v) => {
      r = insert_(r, k, v)
    })
  }
  return r
}

/**
 * Returns a range of the map with keys >= min and < max
 */
export function range<K>(min: Option<K>, max: Option<K>): <V>(m: OrderedMap<K, V>) => OrderedMap<K, V> {
  return (m) => range_(m, min, max)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

class OrderedMapIterator<K, V> implements Iterator<readonly [K, V]> {
  private count = 0
  constructor(readonly m: OrderedMap<K, V>, readonly stack: Array<Node<K, V>>, readonly direction: 0 | 1) {}

  next(): IteratorResult<readonly [K, V]> {
    if (this.isEmpty) {
      return { done: true, value: this.count }
    }
    this.count++
    const value: readonly [K, V] = [this.stack[this.stack.length - 1].key, this.stack[this.stack.length - 1].value]
    switch (this.direction) {
      case 0: {
        this.moveNext()
        break
      }
      case 1: {
        this.movePrev()
        break
      }
    }
    return { done: false, value }
  }

  get isEmpty(): boolean {
    return this.stack.length === 0
  }

  /**
   * Returns the current node
   */
  get node(): RBNode<K, V> {
    if (this.isEmpty) {
      return Leaf
    }
    return this.stack[this.stack.length - 1]
  }

  /**
   * Returns the current key
   */
  get key(): O.Option<K> {
    if (this.isEmpty) {
      return O.none()
    }
    return O.some(this.node!.key)
  }

  /**
   * Returns the current value
   */
  get value(): O.Option<V> {
    if (this.isEmpty) {
      return O.none()
    }
    return O.some(this.node!.value)
  }

  /**
   * Returns the current entry
   */
  get entry(): O.Option<readonly [K, V]> {
    if (this.isEmpty) {
      return O.none()
    }
    return O.some([this.stack[this.stack.length - 1].key, this.stack[this.stack.length - 1].value])
  }

  /**
   * Checks if the iterator has a next element
   */
  get hasNext(): boolean {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1].right) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1].left === stack[s]) {
        return true
      }
    }
    return false
  }

  /**
   * Advances the iterator
   */
  moveNext(): void {
    if (this.isEmpty) {
      return
    }
    const stack         = this.stack
    let n: RBNode<K, V> = stack[stack.length - 1]
    if (n.right) {
      n = n.right
      while (n) {
        stack.push(n)
        n = n.left
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1].right === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Checks if the iterator has a previous element
   */
  get hasPrev(): boolean {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1].left) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1].right === stack[s]) {
        return true
      }
    }
    return false
  }

  /**
   * Retreats the iterator to the previous element
   */
  movePrev(): void {
    const stack = this.stack
    if (stack.length === 0) {
      return
    }
    let n: RBNode<K, V> = stack[stack.length - 1]
    if (n.left) {
      n = n.left
      while (n) {
        stack.push(n)
        n = n.right
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1].left === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Returns a `OrderedMapIterator` of the same tree, with a cloned stack
   */
  clone(): OrderedMapIterator<K, V> {
    return new OrderedMapIterator(this.m, this.stack.slice(), this.direction)
  }

  /**
   * Reverses the direction of the iterator
   */
  reverse(): OrderedMapIterator<K, V> {
    return new OrderedMapIterator(this.m, this.stack.slice(), this.direction ? 0 : 1)
  }

  /**
   * Deletes the current element, returing a new `OrderedMap`
   */
  remove(): OrderedMap<K, V> {
    const pathStack = this.stack
    if (pathStack.length === 0) {
      return this.m
    }
    // clone path to node
    const stack: Array<Mutable<Node<K, V>>> = new Array(pathStack.length)
    let n: Mutable<Node<K, V>>              = pathStack[pathStack.length - 1]
    stack[stack.length - 1]                 = Node(n.color, n.left, n.key, n.value, n.right, n.count)
    for (let i = pathStack.length - 2; i >= 0; --i) {
      const n = pathStack[i]
      if (n.left === pathStack[i + 1]) {
        stack[i] = Node(n.color, stack[i + 1], n.key, n.value, n.right, n.count)
      } else {
        stack[i] = Node(n.color, n.left, n.key, n.value, stack[i + 1], n.count)
      }
    }

    // get node
    n = stack[stack.length - 1]

    // if not leaf, then swap with previous node
    if (n.left && n.right) {
      // first walk to previous leaf
      const split = stack.length
      n           = n.left
      while (n.right) {
        stack.push(n)
        n = n.right
      }
      // clone path to leaf
      const v = stack[split - 1]
      stack.push(Node(n.color, n.left, v.key, v.value, n.right, n.count))
      stack[split - 1].key   = n.key
      stack[split - 1].value = n.value

      // fix stack
      for (let i = stack.length - 2; i >= split; --i) {
        n        = stack[i]
        stack[i] = Node(n.color, n.left, n.key, n.value, stack[i + 1], n.count)
      }
      stack[split - 1].left = stack[split]
    }
    n = stack[stack.length - 1]
    if (n.color === R) {
      // removing red leaf
      const p = stack[stack.length - 2]
      if (p.left === n) {
        p.left = null
      } else if (p.right === n) {
        p.right = null
      }
      stack.pop()
      for (let i = 0; i < stack.length; ++i) {
        stack[i].count--
      }
      return new OrderedMap(this.m.ord, stack[0])
    } else {
      if (n.left || n.right) {
        // single child black parent
        // black single child
        if (n.left) {
          swapNode(n, n.left)
        } else if (n.right) {
          swapNode(n, n.right)
        }
        //Child must be red, so repaint it black to balance color
        n.color = B
        for (let i = 0; i < stack.length - 1; ++i) {
          stack[i].count--
        }
        return new OrderedMap(this.m.ord, stack[0])
      } else if (stack.length === 1) {
        // root
        return new OrderedMap(this.m.ord, null)
      } else {
        // black leaf no children
        for (let i = 0; i < stack.length; ++i) {
          stack[i].count--
        }
        const parent = stack[stack.length - 2]
        fixDoubleBlack(stack)
        // fix links
        if (parent.left === n) {
          parent.left = null
        } else {
          parent.right = null
        }
      }
    }
    return new OrderedMap(this.m.ord, stack[0])
  }
}

export interface OrderedMapIterable<K, V> extends Iterable<readonly [K, V]> {
  readonly ord: P.Ord<K>
  [Symbol.iterator](): OrderedMapIterator<K, V>
}

export function blackHeight<K, V>(root: RBNode<K, V>): number {
  if (root === Leaf) {
    return 0
  }
  let n: RBNode<K, V> = root
  let x               = 0
  while (n) {
    n.color === B && x++
    n = n.right
  }
  return x
}

function headNode<K, V>(root: RBNode<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.none()
  }
  let n: Node<K, V> = root
  while (n.left) {
    n = n.left
  }
  return O.some(n)
}

function lastNode<K, V>(root: RBNode<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.none()
  }
  let n: Node<K, V> = root
  while (n.right) {
    n = n.right
  }
  return O.some(n)
}

type Color = 0 | 1

const R: Color = 0
const B: Color = 1

type Leaf = null

const Leaf = null

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

interface Node<K, V> {
  readonly color: Color
  readonly key: K
  readonly value: V
  readonly left: RBNode<K, V>
  readonly right: RBNode<K, V>
  readonly count: number
}

function Node<K, V>(
  color: Color,
  left: Node<K, V> | Leaf,
  key: K,
  value: V,
  right: Node<K, V> | Leaf,
  count: number
): Node<K, V> {
  return {
    color,
    left,
    key,
    value,
    right,
    count
  }
}

type RBNode<K, V> = Node<K, V> | Leaf

function swapNode<K, V>(node: Mutable<Node<K, V>>, v: Node<K, V>): void {
  node.key   = v.key
  node.value = v.value
  node.left  = v.left
  node.right = v.right
  node.color = v.color
  node.count = v.count
}

function isEmptyNode<K, V>(node: RBNode<K, V>): node is Leaf {
  return node === null
}

function repaintNode<K, V>(n: RBNode<K, V>, c: Color): RBNode<K, V> {
  return n === Leaf ? Leaf : Node(c, n.left, n.key, n.value, n.right, n.count)
}

function cloneNode<K, V>(n: RBNode<K, V>): RBNode<K, V> {
  return n === Leaf ? Leaf : Node(n.color, n.left, n.key, n.value, n.right, n.count)
}

function recountNode<K, V>(n: Mutable<Node<K, V>>): void {
  n.count = 1 + (n.left ? n.left.count : 0) + (n.right ? n.right.count : 0)
}

function rebuildModifiedPath<K, V>(
  nodeStack: Array<Mutable<Node<K, V>>>,
  orderStack: Array<P.Ordering>,
  inc = 1
): void {
  for (let s = nodeStack.length - 2; s >= 0; --s) {
    const n = nodeStack[s]
    if (orderStack[s] <= 0) {
      nodeStack[s] = Node(n.color, nodeStack[s + 1], n.key, n.value, n.right, n.count + inc)
    } else {
      nodeStack[s] = Node(n.color, n.left, n.key, n.value, nodeStack[s + 1], n.count + inc)
    }
  }
}

function balanceModifiedPath<K, V>(nodeStack: Array<Mutable<Node<K, V>>>): void {
  for (let s = nodeStack.length - 1; s > 1; --s) {
    const parent = nodeStack[s - 1]
    const node   = nodeStack[s]
    if (parent.color === B || node.color === B) {
      break
    }
    const gparent = nodeStack[s - 2]
    if (gparent.left === parent) {
      if (parent.left === node) {
        const parsib = gparent.right
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.right = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.left     = parent.right
          parent.color     = B
          parent.right     = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recountNode(gparent)
          recountNode(parent)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.left === gparent) {
              ggparent.left = parent
            } else {
              ggparent.right = parent
            }
          }
          break
        }
      } else {
        const uncle = gparent.right
        if (uncle && uncle.color === R) {
          parent.color  = B
          gparent.right = repaintNode(uncle, B)
          gparent.color = R
          s            -= 1
        } else {
          parent.right     = node.left
          gparent.color    = R
          gparent.left     = node.right
          node.color       = B
          node.left        = parent
          node.right       = gparent
          nodeStack[s - 2] = node
          nodeStack[s - 1] = parent
          recountNode(gparent)
          recountNode(parent)
          recountNode(node)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.left === gparent) {
              ggparent.left = node
            } else {
              ggparent.right = node
            }
          }
          break
        }
      }
    } else {
      if (parent.right === node) {
        const parsib = gparent.left
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.left  = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.right    = parent.left
          parent.color     = B
          parent.left      = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recountNode(gparent)
          recountNode(parent)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.right === gparent) {
              ggparent.right = parent
            } else {
              ggparent.left = parent
            }
          }
          break
        }
      } else {
        const parsib = gparent.left
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.left  = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          parent.left      = node.right
          gparent.color    = R
          gparent.right    = node.left
          node.color       = B
          node.right       = parent
          node.left        = gparent
          nodeStack[s - 2] = node
          nodeStack[s - 1] = parent
          recountNode(gparent)
          recountNode(parent)
          recountNode(node)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.right === gparent) {
              ggparent.right = node
            } else {
              ggparent.left = node
            }
          }
          break
        }
      }
    }
  }
  nodeStack[0].color = B
}

function fixDoubleBlack<K, V>(stack: Array<Mutable<Node<K, V>>>): void {
  let node: Mutable<Node<K, V>>,
    parent: Mutable<Node<K, V>>,
    sibling: Mutable<RBNode<K, V>>,
    nibling: Mutable<RBNode<K, V>>
  for (let i = stack.length - 1; i >= 0; --i) {
    node = stack[i]
    if (i === 0) {
      node.color = B
      return
    }
    parent = stack[i - 1]
    if (parent.left === node) {
      // left child
      sibling = parent.right
      if (sibling && sibling.right && sibling.right.color === R) {
        // right sibling child red
        sibling        = parent.right = cloneNode(sibling)
        nibling        = sibling!.right = cloneNode(sibling!.right)
        parent.right   = sibling!.left
        sibling!.left  = parent
        sibling!.right = nibling
        sibling!.color = parent.color
        node.color     = B
        parent.color   = B
        nibling!.color = B
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = sibling
          } else {
            pp.right = sibling
          }
        }
        stack[i - 1] = sibling!
        return
      } else if (sibling && sibling.left && sibling.left.color === R) {
        // left sibling child red
        sibling        = parent.right = cloneNode(sibling)
        nibling        = sibling!.left = cloneNode(sibling!.left)
        parent.right   = nibling!.left
        sibling!.left  = nibling!.right
        nibling!.left  = parent
        nibling!.right = sibling
        nibling!.color = parent.color
        parent.color   = B
        sibling!.color = B
        node.color     = B
        recountNode(parent)
        recountNode(sibling!)
        recountNode(nibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = nibling
          } else {
            pp.right = nibling
          }
        }
        stack[i - 1] = nibling!
        return
      }
      if (sibling!.color === B) {
        if (parent.color === R) {
          // black sibling, red parent
          parent.color = B
          parent.right = repaintNode(sibling!, R)
          return
        } else {
          // black sibling, black parent
          parent.right = repaintNode(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.right   = sibling!.left
        sibling!.left  = parent
        sibling!.color = parent.color
        parent!.color  = R
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = sibling
          } else {
            pp.right = sibling
          }
        }
        stack[i - 1] = sibling!
        stack[i]     = parent
        if (i + 1 < stack.length) {
          stack[i + 1] = node
        } else {
          stack.push(node)
        }
        i += 2
      }
    } else {
      // right child
      sibling = parent.left
      if (sibling && sibling.left && sibling.left.color === R) {
        // left sibling child red
        sibling        = parent.left = cloneNode(sibling)
        nibling        = sibling!.left = cloneNode(sibling!.left)
        parent.left    = sibling!.right
        sibling!.right = parent
        sibling!.left  = nibling
        sibling!.color = parent.color
        node.color     = B
        parent.color   = B
        nibling!.color = B
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = sibling
          } else {
            pp.left = sibling
          }
        }
        stack[i - 1] = sibling!
        return
      } else if (sibling && sibling.right && sibling.right.color === R) {
        // right sibling child red
        sibling        = parent.left = cloneNode(sibling)
        nibling        = sibling!.right = cloneNode(sibling!.right)
        parent.left    = nibling!.right
        sibling!.right = nibling!.left
        nibling!.right = parent
        nibling!.left  = sibling
        nibling!.color = parent.color
        parent.color   = B
        sibling!.color = B
        node.color     = B
        recountNode(parent)
        recountNode(sibling!)
        recountNode(nibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = nibling
          } else {
            pp.left = nibling
          }
        }
        stack[i - 1] = nibling!
        return
      }
      if (sibling!.color === B) {
        if (parent.color === R) {
          // black sibling, red parent
          parent.color = B
          parent.left  = repaintNode(sibling!, R)
          return
        } else {
          // black sibling, black, parent
          parent.left = repaintNode(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.left    = sibling!.right
        sibling!.right = parent
        sibling!.color = parent.color
        parent.color   = R
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = sibling
          } else {
            pp.left = sibling
          }
        }
        stack[i - 1] = sibling!
        stack[i]     = parent
        if (i + 1 < stack.length) {
          stack[i + 1] = node
        } else {
          stack.push(node)
        }
        i += 2
      }
    }
  }
}
