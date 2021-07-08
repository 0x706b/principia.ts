/* eslint-disable functional/immutable-data */
import type { Eq } from '../Eq'

import * as O from '../Option'

/*
 * -------------------------------------------------------------------------------------------------
 * Hash Array Mapped Trie Internals
 * -------------------------------------------------------------------------------------------------
 */

/* Configuration */

export const SIZE = 5

export const BUCKET_SIZE = Math.pow(2, SIZE)

export const MASK = BUCKET_SIZE - 1

export const MAX_INDEX_NODE = BUCKET_SIZE / 2

export const MIN_ARRAY_NODE = BUCKET_SIZE / 4

/* Array Operations */

export function arrayUpdate<A>(mutate: boolean, at: number, v: A, arr: A[]) {
  let out = arr
  if (!mutate) {
    const len = arr.length
    out       = new Array(len)
    for (let i = 0; i < len; ++i) out[i] = arr[i]
  }
  out[at] = v
  return out
}

export function arraySpliceOut<A>(mutate: boolean, at: number, arr: A[]) {
  const newLen = arr.length - 1
  let i        = 0
  let g        = 0
  let out      = arr
  if (mutate) {
    i = g = at
  } else {
    out = new Array(newLen)
    while (i < at) out[g++] = arr[i++]
  }
  ++i
  while (i <= newLen) out[g++] = arr[i++]
  if (mutate) {
    out.length = newLen
  }
  return out
}

export function arraySpliceIn<A>(mutate: boolean, at: number, v: A, arr: A[]) {
  const len = arr.length
  if (mutate) {
    let i = len
    while (i >= at) arr[i--] = arr[i]
    arr[at] = v
    return arr
  }
  let i     = 0,
    g = 0
  const out = new Array<A>(len + 1)
  while (i < at) out[g++] = arr[i++]
  out[at] = v
  while (i < len) out[++g] = arr[i++]
  return out
}

/* Bitwise Operations */

/**
 * Hamming weight.
 *
 * Taken from: http://jsperf.com/hamming-weight
 */
export function popcount(x: number) {
  /* eslint-disable no-param-reassign */
  x -= (x >> 1) & 0x55555555
  x  = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x  = (x + (x >> 4)) & 0x0f0f0f0f
  x += x >> 8
  x += x >> 16
  return x & 0x7f
  /* eslint-enable no-param-reassign */
}

export function hashFragment(shift: number, h: number) {
  return (h >>> shift) & MASK
}

export function toBitmap(x: number) {
  return 1 << x
}

export function fromBitmap(bitmap: number, bit: number) {
  return popcount(bitmap & (bit - 1))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Node
 * -------------------------------------------------------------------------------------------------
 */

export type Node<K, V> = LeafNode<K, V> | CollisionNode<K, V> | IndexedNode<K, V> | ArrayNode<K, V> | Empty<K, V>

export interface SizeRef {
  value: number
}

interface Empty<K, V> extends ModifyFn<K, V> {
  readonly _tag: 'Empty'
}

export const Empty: Empty<any, any> = {
  _tag: 'Empty',
  modify(edit, keyEq, shift, f, hash, key, size) {
    const v = f(O.none())
    if (O.isNone(v)) return Empty
    ++size.value
    return LeafNode(edit, hash, key, v)
  }
}

export function isEmptyNode(a: unknown): a is Empty<unknown, unknown> {
  return a === Empty
}

export function isLeaf<K, V>(node: Node<K, V>): node is Empty<K, V> | LeafNode<K, V> | CollisionNode<K, V> {
  return isEmptyNode(node) || node._tag === 'LeafNode' || node._tag === 'CollisionNode'
}

export function canEditNode<K, V>(edit: number, node: Node<K, V>): boolean {
  return isEmptyNode(node) ? false : edit === node.edit
}

export type KeyEq<K> = Eq<K>['equals_']

export type UpdateFn<V> = (v: O.Option<V>) => O.Option<V>

interface ModifyFn<K, V> {
  modify(edit: number, keyEq: KeyEq<K>, shift: number, f: UpdateFn<V>, hash: number, key: K, size: SizeRef): Node<K, V>
}

interface LeafNode<K, V> extends ModifyFn<K, V> {
  readonly _tag: 'LeafNode'
  edit: number
  hash: number
  key: K
  value: O.Option<V>
}

export function LeafNode<K, V>(edit: number, hash: number, key: K, value: O.Option<V>): LeafNode<K, V> {
  return {
    _tag: 'LeafNode',
    edit,
    hash,
    key,
    value,
    modify: LeafNode__modify
  }
}

function LeafNode__modify<K, V>(
  this: LeafNode<K, V>,
  edit: number,
  keyEq: KeyEq<K>,
  shift: number,
  f: UpdateFn<V>,
  hash: number,
  key: K,
  size: SizeRef
): Node<K, V> {
  if (keyEq(this.key, key)) {
    const v = f(this.value)
    if (v === this.value) {
      return this
    } else if (O.isNone(v)) {
      --size.value
      return Empty
    }
    if (canEditNode(edit, this)) {
      this.value = v
      return this
    }
    return LeafNode(edit, hash, key, v)
  }
  const v = f(O.none())
  if (O.isNone(v)) return this
  ++size.value
  return mergeLeaves(edit, shift, this.hash, this, hash, LeafNode(edit, hash, key, v))
}

export interface CollisionNode<K, V> extends ModifyFn<K, V> {
  readonly _tag: 'CollisionNode'
  edit: number
  hash: number
  children: Array<Node<K, V>>
}

export function CollisionNode<K, V>(edit: number, hash: number, children: Array<Node<K, V>>): CollisionNode<K, V> {
  return {
    _tag: 'CollisionNode',
    edit,
    hash,
    children,
    modify: CollisionNode__modify
  }
}

function CollisionNode__modify<K, V>(
  this: CollisionNode<K, V>,
  edit: number,
  keyEq: KeyEq<K>,
  shift: number,
  f: UpdateFn<V>,
  hash: number,
  key: K,
  size: SizeRef
): Node<K, V> {
  if (hash === this.hash) {
    const canEdit = canEditNode(edit, this)
    const list    = updateCollisionList(canEdit, edit, keyEq, this.hash, this.children, f, key, size)
    if (list === this.children) return this

    return list.length > 1 ? CollisionNode(edit, this.hash, list) : list[0] // collapse single element collision list
  }
  const v = f(O.none())
  if (O.isNone(v)) return this
  ++size.value
  return mergeLeaves(edit, shift, this.hash, this, hash, LeafNode(edit, hash, key, v))
}

function updateCollisionList<K, V>(
  mutate: boolean,
  edit: number,
  keyEq: KeyEq<K>,
  hash: number,
  list: Node<K, V>[],
  f: UpdateFn<V>,
  key: K,
  size: SizeRef
) {
  const len = list.length
  for (let i = 0; i < len; ++i) {
    const child = list[i]
    if ('key' in child && keyEq(child.key, key)) {
      const value    = child.value
      const newValue = f(value)
      if (newValue === value) return list
      if (O.isNone(newValue)) {
        --size.value
        return arraySpliceOut(mutate, i, list)
      }
      return arrayUpdate(mutate, i, LeafNode(edit, hash, key, newValue), list)
    }
  }

  const newValue = f(O.none())
  if (O.isNone(newValue)) return list
  ++size.value
  return arrayUpdate(mutate, len, LeafNode(edit, hash, key, newValue), list)
}

interface IndexedNode<K, V> extends ModifyFn<K, V> {
  readonly _tag: 'IndexedNode'
  edit: number
  mask: number
  children: Array<Node<K, V>>
}

export function IndexedNode<K, V>(edit: number, mask: number, children: Array<Node<K, V>>): IndexedNode<K, V> {
  return {
    _tag: 'IndexedNode',
    edit,
    mask,
    children,
    modify: IndexedNode__modify
  }
}

function IndexedNode__modify<K, V>(
  this: IndexedNode<K, V>,
  edit: number,
  keyEq: KeyEq<K>,
  shift: number,
  f: UpdateFn<V>,
  hash: number,
  key: K,
  size: SizeRef
): Node<K, V> {
  const mask     = this.mask
  const children = this.children
  const frag     = hashFragment(shift, hash)
  const bit      = toBitmap(frag)
  const indx     = fromBitmap(mask, bit)
  const exists   = mask & bit
  const current  = exists ? children[indx] : (Empty as Empty<K, V>)
  const child    = current.modify(edit, keyEq, shift + SIZE, f, hash, key, size)

  if (current === child) return this

  const canEdit = canEditNode(edit, this)
  let bitmap    = mask
  let newChildren
  if (exists && isEmptyNode(child)) {
    // remove
    bitmap &= ~bit
    if (!bitmap) return Empty
    if (children.length <= 2 && isLeaf(children[indx ^ 1])) return children[indx ^ 1] // collapse

    newChildren = arraySpliceOut(canEdit, indx, children)
  } else if (!exists && !isEmptyNode(child)) {
    // add
    if (children.length >= MAX_INDEX_NODE) return expand(edit, frag, child, mask, children)

    bitmap     |= bit
    newChildren = arraySpliceIn(canEdit, indx, child, children)
  } else {
    // modify
    newChildren = arrayUpdate(canEdit, indx, child, children)
  }

  if (canEdit) {
    this.mask     = bitmap
    this.children = newChildren
    return this
  }
  return IndexedNode(edit, bitmap, newChildren)
}

export interface ArrayNode<K, V> extends ModifyFn<K, V> {
  readonly _tag: 'ArrayNode'
  edit: number
  mask: number
  children: Array<Node<K, V>>
  size: number
}

export function ArrayNode<K, V>(edit: number, mask: number, children: Array<Node<K, V>>): ArrayNode<K, V> {
  return {
    _tag: 'ArrayNode',
    edit,
    mask,
    children,
    size: 0,
    modify: ArrayNode__modify
  }
}

function ArrayNode__modify<K, V>(
  this: ArrayNode<K, V>,
  edit: number,
  keyEq: KeyEq<K>,
  shift: number,
  f: UpdateFn<V>,
  hash: number,
  key: K,
  size: SizeRef
): Node<K, V> {
  let count      = this.size
  const children = this.children
  const frag     = hashFragment(shift, hash)
  const child    = children[frag]
  const newChild = (child || Empty).modify(edit, keyEq, shift + SIZE, f, hash, key, size)

  if (child === newChild) return this

  const canEdit = canEditNode(edit, this)
  let newChildren
  if (isEmptyNode(child) && !isEmptyNode(newChild)) {
    // add
    ++count
    newChildren = arrayUpdate(canEdit, frag, newChild, children)
  } else if (!isEmptyNode(child) && isEmptyNode(newChild)) {
    // remove
    --count
    if (count <= MIN_ARRAY_NODE) {
      return pack(edit, count, frag, children)
    }
    newChildren = arrayUpdate(canEdit, frag, Empty as Empty<K, V>, children)
  } else {
    // modify
    newChildren = arrayUpdate(canEdit, frag, newChild, children)
  }

  if (canEdit) {
    this.size     = count
    this.children = newChildren
    return this
  }
  return ArrayNode(edit, count, newChildren)
}

function pack<K, V>(edit: number, count: number, removed: number, elements: Node<K, V>[]) {
  const children = new Array<Node<K, V>>(count - 1)
  let g          = 0
  let bitmap     = 0
  for (let i = 0, len = elements.length; i < len; ++i) {
    if (i !== removed) {
      const elem = elements[i]
      if (elem && !isEmptyNode(elem)) {
        children[g++] = elem
        bitmap       |= 1 << i
      }
    }
  }
  return IndexedNode(edit, bitmap, children)
}

function expand<K, V>(edit: number, frag: number, child: Node<K, V>, bitmap: number, subNodes: Node<K, V>[]) {
  const arr = []
  let bit   = bitmap
  let count = 0
  for (let i = 0; bit; ++i) {
    if (bit & 1) arr[i] = subNodes[count++]
    bit >>>= 1
  }
  arr[frag] = child
  return ArrayNode(edit, count + 1, arr)
}

function mergeLeaves<K, V>(
  edit: number,
  shift: number,
  h1: number,
  n1: Node<K, V>,
  h2: number,
  n2: Node<K, V>
): Node<K, V> {
  if (h1 === h2) return CollisionNode(edit, h1, [n2, n1])

  const subH1 = hashFragment(shift, h1)
  const subH2 = hashFragment(shift, h2)

  return IndexedNode(
    edit,
    toBitmap(subH1) | toBitmap(subH2),
    subH1 === subH2 ? [mergeLeaves(edit, shift + SIZE, h1, n1, h2, n2)] : subH1 < subH2 ? [n1, n2] : [n2, n1]
  )
}
