import type { Stack } from '../../internal/Stack'
import type { Equatable, Hashable } from '../../Structural'
import type { Config } from './HashMap'
import type * as HM from './HashMap'

import * as E from '../../Either'
import { identity } from '../../function'
import { makeStack } from '../../internal/Stack'
import * as M from '../../Maybe'
import { not } from '../../Predicate'
import * as P from '../../prelude'
import { DefaultEq } from '../../Structural/Equatable'
import * as Eq from '../../Structural/Equatable'
import { DefaultHash } from '../../Structural/Hashable'
import * as Ha from '../../Structural/Hashable'
import { tuple } from '../../tuple/core'
import * as It from '../Iterable/core'
import {
  arraySpliceIn,
  arraySpliceOut,
  arrayUpdate,
  fromBitmap,
  hashFragment,
  MAX_INDEX_NODE,
  MIN_ARRAY_NODE,
  SIZE,
  toBitmap
} from './HashMap/internal'

export class HashSet<A> implements Iterable<A>, Hashable, Equatable {
  constructor(
    /**
     * @internal
     */
    public _editable: boolean,
    /**
     * @internal
     */
    public _edit: number,
    /**
     * @internal
     */
    readonly config: Config<A>,
    /**
     * @internal
     */
    public _root: Node<A>,
    /**
     * @internal
     */
    public _size: number
  ) {}

  get size(): number {
    return this._size
  }

  [Symbol.iterator](): Iterator<A> {
    return new HashSetIterator(this, identity)
  }

  get [Ha.$hash](): number {
    return Ha.hashIterator(this[Symbol.iterator]())
  }

  [Eq.$equals](other: unknown): boolean {
    return other instanceof HashSet && this._size === other._size && It.corresponds(this, other, Eq.equals)
  }
}

class HashSetIterator<A, T> implements IterableIterator<T> {
  v = visitLazy(this.set._root, this.f, undefined)

  constructor(readonly set: HashSet<A>, readonly f: (node: A) => T) {}

  next(): IteratorResult<T> {
    if (this.v === undefined) {
      return { done: true, value: undefined }
    }
    const v0 = this.v.value
    this.v   = applyCont(this.v.cont)
    return { done: false, value: v0 }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new HashSetIterator(this.set, this.f)
  }
}

export function add_<A>(set: HashSet<A>, value: A): HashSet<A> {
  return modifyHash(set, value, set.config.hash(value), false)
}

export const Default: HM.Config<any> = {
  ...Eq.DefaultEq,
  ...Ha.DefaultHash
}

/**
 * @dataFirst add_
 */
export function add<V>(v: V): (set: HashSet<V>) => HashSet<V> {
  return (set: HashSet<V>) => add_(set, v)
}

/**
 * Mark `set` as mutable.
 */
export function beginMutation<K>(set: HashSet<K>): HashSet<K> {
  return new HashSet(true, set._edit + 1, set.config, set._root, set._size)
}

/**
 * Mark `set` as immutable.
 */
export function endMutation<K>(set: HashSet<K>): HashSet<K> {
  set._editable = false
  return set
}

/**
 * Appy f to each element
 */
export function forEach_<V>(map: HashSet<V>, f: (v: V, m: HashSet<V>) => void): void {
  foldl_(map, undefined as void, (_, value) => f(value, map))
}

/**
 * Appy f to each element
 *
 * @dataFirst forEach_
 */
export function forEach<V>(f: (v: V, m: HashSet<V>) => void): (map: HashSet<V>) => void {
  return (map) => forEach_(map, f)
}

export function has_<A>(set: HashSet<A>, value: A): boolean {
  return hasHash(set, value, set.config.hash(value))
}

/**
 * @dataFirst has_
 */
export function has<A>(value: A): (set: HashSet<A>) => boolean {
  return (set) => has_(set, value)
}

export function make<A>(config: P.Hash<A> & P.Eq<A>): HashSet<A> {
  return new HashSet(false, 0, config, _EmptyNode, 0)
}

export function makeDefault<A>(): HashSet<A> {
  return make<A>({ ...DefaultEq, ...DefaultHash })
}

export function fromDefault<A>(...values: ReadonlyArray<A>): HashSet<A> {
  return mutate_(makeDefault<A>(), (set) => {
    values.forEach((v) => {
      add_(set, v)
    })
  })
}

/**
 * Mutate `set` within the context of `f`.
 */
export function mutate_<A>(set: HashSet<A>, transient: (set: HashSet<A>) => void) {
  const s = beginMutation(set)
  transient(s)
  return endMutation(s)
}

/**
 * @dataFirst mutate_
 */
export function mutate<A>(transient: (set: HashSet<A>) => void): (set: HashSet<A>) => HashSet<A> {
  return (set) => mutate_(set, transient)
}

export function remove_<A>(set: HashSet<A>, value: A): HashSet<A> {
  return modifyHash(set, value, set.config.hash(value), true)
}

/**
 * @dataFirst remove_
 */
export function remove<A>(value: A): (set: HashSet<A>) => HashSet<A> {
  return (set) => remove_(set, value)
}

/**
 * Calculate the number of keys pairs in a set
 */
export function size<A>(set: HashSet<A>): number {
  return set._size
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

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Projects a Set through a function
 */
export function map_<B>(C: HM.Config<B>): <A>(fa: HashSet<A>, f: (x: A) => B) => HashSet<B> {
  const r = make(C)

  return (fa, f) =>
    mutate_(r, (r) => {
      forEach_(fa, (e) => {
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
export function map<B>(C: HM.Config<B>): <A>(f: (x: A) => B) => (fa: HashSet<A>) => HashSet<B> {
  const m = map_(C)
  return (f) => (fa) => m(fa, f)
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
export function chain<B>(C: HM.Config<B>): <A>(f: (x: A) => Iterable<B>) => (set: HashSet<A>) => HashSet<B> {
  const c = chain_(C)
  return (f) => (set) => c(set, f)
}

/**
 * Map + Flatten
 */
export function chain_<B>(C: HM.Config<B>): <A>(set: HashSet<A>, f: (x: A) => Iterable<B>) => HashSet<B> {
  const r = make<B>(C)
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
  const r = make(set.config)

  return mutate_(r, (r) => {
    forEach_(set, (v) => {
      if (predicate(v)) {
        add_(r, v)
      }
    })
  })
}

export function filterMap_<B>(B: HM.Config<B>): <A>(fa: HashSet<A>, f: (a: A) => M.Maybe<B>) => HashSet<B> {
  return (fa, f) => {
    const out = beginMutation(make(B))
    forEach_(fa, (a) => {
      const ob = f(a)
      if (M.isJust(ob)) {
        add_(out, ob.value)
      }
    })
    return endMutation(out)
  }
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<B>(B: HM.Config<B>): <A>(f: (a: A) => M.Maybe<B>) => (fa: HashSet<A>) => HashSet<B> {
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
  const right = beginMutation(make(set.config))
  const left  = beginMutation(make(set.config))
  forEach_(set, (v) => {
    if (predicate(v)) {
      add_(right, v)
    } else {
      add_(left, v)
    }
  })
  return tuple(endMutation(left), endMutation(right))
}

export function partitionMap_<B, C>(
  B: HM.Config<B>,
  C: HM.Config<C>
): <A>(fa: HashSet<A>, f: (a: A) => E.Either<B, C>) => readonly [HashSet<B>, HashSet<C>] {
  return (fa, f) => {
    const right = beginMutation(make(C))
    const left  = beginMutation(make(B))
    forEach_(fa, (v) => {
      E.match_(
        f(v),
        (b) => {
          add_(left, b)
        },
        (c) => {
          add_(right, c)
        }
      )
    })
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
  const root = fa._root
  if (root._tag === 'LeafNode') return f(b, root.value)
  if (root._tag === 'EmptyNode') return b
  let toVisit: Stack<Array<Node<A>>> | undefined = makeStack(root.children)
  while (toVisit) {
    const children = toVisit.value
    toVisit        = toVisit.previous
    for (let i = 0, len = children.length; i < len; ) {
      const child = children[i++]
      if (child && !isEmptyNode(child)) {
        if (child._tag === 'LeafNode') {
          // eslint-disable-next-line no-param-reassign
          b = f(b, child.value)
        } else {
          toVisit = makeStack(child.children, toVisit)
        }
      }
    }
  }
  return b
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
  const x = make<A>(l.config)

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

/**
 * @dataFirst toArray_
 */
export function toArray<A>(O: P.Ord<A>): (set: HashSet<A>) => ReadonlyArray<A> {
  return (set) => toArray_(set, O)
}

/*
 * -------------------------------------------------------------------------------------------------
 * internal
 * -------------------------------------------------------------------------------------------------
 */

interface SizeRef {
  value: number
}

export function canEditNode<A>(edit: number, node: Node<A>): boolean {
  return isEmptyNode(node) ? false : edit === node.edit
}

type Node<A> = EmptyNode<A> | LeafNode<A> | CollisionNode<A> | IndexedNode<A> | ArrayNode<A>

export class EmptyNode<A> {
  readonly _tag = 'EmptyNode'

  modify(
    remove: boolean,
    edit: number,
    eq: (x: A, y: A) => boolean,
    shift: number,
    hash: number,
    value: A,
    size: SizeRef
  ) {
    if (remove) return this
    ++size.value
    return new LeafNode(edit, hash, value)
  }
}

const _EmptyNode = new EmptyNode<never>()

function isEmptyNode<A>(n: Node<A>): n is EmptyNode<A> {
  return n === _EmptyNode
}

export class LeafNode<A> {
  readonly _tag = 'LeafNode'
  constructor(public edit: number, public hash: number, public value: A) {}

  modify(
    remove: boolean,
    edit: number,
    eq: (x: A, y: A) => boolean,
    shift: number,
    hash: number,
    value: A,
    size: SizeRef
  ): Node<A> {
    if (eq(value, this.value)) {
      if (remove) {
        --size.value
        return _EmptyNode
      }
      if (value === this.value) {
        return this
      }
      if (canEditNode(edit, this)) {
        this.value = value
        return this
      }
      return new LeafNode(edit, hash, value)
    }
    if (remove) {
      return this
    }
    ++size.value
    return mergeLeaves(edit, shift, this.hash, this, hash, new LeafNode(edit, hash, value))
  }
}

export class CollisionNode<A> {
  readonly _tag = 'CollisionNode'
  constructor(public edit: number, public hash: number, public children: Array<Node<A>>) {}
  modify(
    remove: boolean,
    edit: number,
    eq: (x: A, y: A) => boolean,
    shift: number,
    hash: number,
    value: A,
    size: SizeRef
  ): Node<A> {
    if (hash === this.hash) {
      const canEdit = canEditNode(edit, this)
      const list    = updateCollisionList(remove, canEdit, edit, eq, this.hash, this.children, value, size)
      if (list === this.children) return this
      return list.length > 1 ? new CollisionNode(edit, this.hash, list) : list[0]
    }
    if (remove) return this
    ++size.value
    return mergeLeaves(edit, shift, this.hash, this, hash, new LeafNode(edit, hash, value))
  }
}

function updateCollisionList<A>(
  remove: boolean,
  mutate: boolean,
  edit: number,
  eq: (x: A, y: A) => boolean,
  hash: number,
  list: Array<Node<A>>,
  value: A,
  size: SizeRef
) {
  const len = list.length
  for (let i = 0; i < len; ++i) {
    const child = list[i]
    if ('value' in child && eq(child.value, value)) {
      if (remove) {
        --size.value
        return arraySpliceOut(mutate, i, list)
      }
      return arrayUpdate(mutate, i, new LeafNode(edit, hash, value), list)
    }
  }

  if (remove) return list
  ++size.value
  return arrayUpdate(mutate, len, new LeafNode(edit, hash, value), list)
}

export function isLeaf<A>(node: Node<A>): node is EmptyNode<A> | LeafNode<A> | CollisionNode<A> {
  return isEmptyNode(node) || node._tag === 'LeafNode' || node._tag === 'CollisionNode'
}

export class IndexedNode<A> {
  readonly _tag = 'IndexNode'
  constructor(public edit: number, public mask: number, public children: Array<Node<A>>) {}

  modify(
    remove: boolean,
    edit: number,
    eq: (x: A, y: A) => boolean,
    shift: number,
    hash: number,
    value: A,
    size: SizeRef
  ): Node<A> {
    const mask     = this.mask
    const children = this.children
    const frag     = hashFragment(shift, hash)
    const bit      = toBitmap(frag)
    const indx     = fromBitmap(mask, bit)
    const exists   = mask & bit
    const current  = exists ? children[indx] : _EmptyNode
    const child    = current.modify(remove, edit, eq, shift + SIZE, hash, value, size)

    if (current === child) return this

    const canEdit = canEditNode(edit, this)
    let bitmap    = mask
    let newChildren
    if (exists && isEmptyNode(child)) {
      bitmap &= ~bit
      if (!bitmap) return _EmptyNode
      if (children.length <= 2 && isLeaf(children[indx ^ 1])) return children[indx ^ 1]
      newChildren = arraySpliceOut(canEdit, indx, children)
    } else if (!exists && !isEmptyNode(child)) {
      if (children.length >= MAX_INDEX_NODE) return expand(edit, frag, child, mask, children)
      bitmap     |= bit
      newChildren = arraySpliceIn(canEdit, indx, child, children)
    } else {
      newChildren = arrayUpdate(canEdit, indx, child, children)
    }

    if (canEdit) {
      this.mask     = bitmap
      this.children = newChildren
      return this
    }
    return new IndexedNode(edit, bitmap, newChildren)
  }
}

export class ArrayNode<A> {
  readonly _tag = 'ArrayNode'
  constructor(public edit: number, public size: number, public children: Array<Node<A>>) {}
  modify(
    remove: boolean,
    edit: number,
    eq: (x: A, y: A) => boolean,
    shift: number,
    hash: number,
    value: A,
    size: SizeRef
  ): Node<A> {
    let count      = this.size
    const children = this.children
    const frag     = hashFragment(shift, hash)
    const child    = children[frag]
    const newChild = (child || _EmptyNode).modify(remove, edit, eq, shift + SIZE, hash, value, size)

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
      newChildren = arrayUpdate(canEdit, frag, _EmptyNode, children)
    } else {
      newChildren = arrayUpdate(canEdit, frag, newChild, children)
    }

    if (canEdit) {
      this.size     = count
      this.children = newChildren
      return this
    }
    return new ArrayNode(edit, count, newChildren)
  }
}

function pack<A>(edit: number, count: number, removed: number, elements: Array<Node<A>>) {
  const children = new Array<Node<A>>(count - 1)
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
  return new IndexedNode(edit, bitmap, children)
}

function expand<A>(edit: number, frag: number, child: Node<A>, bitmap: number, subNodes: Array<Node<A>>) {
  const arr = []
  let bit   = bitmap
  let count = 0
  for (let i = 0; bit; ++i) {
    if (bit & 1) arr[i] = subNodes[count++]
    bit >>>= 1
  }
  arr[frag] = child
  return new ArrayNode(edit, count + 1, arr)
}

function mergeLeaves<A>(edit: number, shift: number, h1: number, n1: Node<A>, h2: number, n2: Node<A>): Node<A> {
  if (h1 === h2) return new CollisionNode(edit, h1, [n2, n1])
  const subH1 = hashFragment(shift, h1)
  const subH2 = hashFragment(shift, h2)
  return new IndexedNode(
    edit,
    toBitmap(subH1) | toBitmap(subH2),
    subH1 === subH2 ? [mergeLeaves(edit, shift + SIZE, h1, n1, h2, n2)] : subH1 < subH2 ? [n1, n2] : [n2, n1]
  )
}

function modifyHash<A>(set: HashSet<A>, value: A, hash: number, remove: boolean): HashSet<A> {
  const size    = { value: set._size }
  const newRoot = set._root.modify(remove, set._editable ? set._edit : NaN, set.config.equals_, 0, hash, value, size)
  return setTree(set, newRoot, size.value)
}

function setTree<A>(set: HashSet<A>, newRoot: Node<A>, newSize: number) {
  if (set._editable) {
    set._root = newRoot
    set._size = newSize
    return set
  }
  return newRoot === set._root ? set : new HashSet(set._editable, set._edit, set.config, newRoot, newSize)
}

type Cont<V, A> = [len: number, children: Array<Node<V>>, i: number, f: (node: V) => A, cont: Cont<V, A>] | undefined

function applyCont<V, A>(cont: Cont<V, A>) {
  return cont ? visitLazyChildren(cont[0], cont[1], cont[2], cont[3], cont[4]) : undefined
}

function visitLazyChildren<V, A>(
  len: number,
  children: Node<V>[],
  i: number,
  f: (node: V) => A,
  cont: Cont<V, A>
): VisitResult<V, A> | undefined {
  while (i < len) {
    // eslint-disable-next-line no-param-reassign
    const child = children[i++]
    if (child && !isEmptyNode(child)) {
      return visitLazy(child, f, [len, children, i, f, cont])
    }
  }
  return applyCont(cont)
}

interface VisitResult<V, A> {
  value: A
  cont: Cont<V, A>
}

/**
 * Visit each leaf lazily
 */
function visitLazy<V, A>(
  node: Node<V>,
  f: (node: V) => A,
  cont: Cont<V, A> = undefined
): VisitResult<V, A> | undefined {
  switch (node._tag) {
    case 'LeafNode': {
      return {
        value: f(node.value),
        cont
      }
    }
    case 'CollisionNode':
    case 'ArrayNode':
    case 'IndexNode': {
      const children = node.children
      return visitLazyChildren(children.length, children, 0, f, cont)
    }
    default: {
      return applyCont(cont)
    }
  }
}

function tryGetHash<A>(set: HashSet<A>, value: A, hash: number): M.Maybe<A> {
  let node  = set._root
  let shift = 0
  const eq  = set.config.equals_

  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (node._tag) {
      case 'LeafNode': {
        return eq(node.value, value) ? M.just(node.value) : M.nothing()
      }
      case 'CollisionNode': {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]
            if ('value' in child && eq(child.value, value)) return M.just(child.value)
          }
        }
        return M.nothing()
      }
      case 'IndexNode': {
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
      default: {
        return M.nothing()
      }
    }
  }
}

function hasHash<A>(set: HashSet<A>, value: A, hash: number): boolean {
  return M.isJust(tryGetHash(set, value, hash))
}
