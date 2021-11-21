import type * as HKT from './HKT'

import * as E from './Either'
import { pipe } from './function'
import * as M from './Maybe'
import * as P from './prelude'

export interface MapF extends HKT.HKT {
  readonly type: ReadonlyMap<this['K'], this['A']>
  readonly variance: {
    readonly K: '+'
    readonly A: '+'
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function empty<K, A>(): ReadonlyMap<K, A> {
  return new Map()
}

/**
 * Create from a key-value array
 */
export function make<K, V>(values: ReadonlyArray<readonly [K, V]>): ReadonlyMap<K, V> {
  return new Map(values)
}

/**
 * Construct a new Readonly Map
 */
export function fromMutable<K, A>(m: Map<K, A>): ReadonlyMap<K, A> {
  return new Map(m)
}

/**
 * Create a map with one key/value pair
 */
export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
  return new Map([[k, a]])
}

export function fromFoldable<F extends HKT.HKT, K, A, C = HKT.None>(
  E: P.Eq<K>,
  S: P.Semigroup<A>,
  F: P.Foldable<F, C>
) {
  return <K_, Q, W, X, I, S, R, E>(
    fka: HKT.Kind<F, C, K_, Q, W, X, I, S, R, E, readonly [K, A]>
  ): ReadonlyMap<K, A> => {
    const lookupWithKeyE_ = lookupWithKey_(E)
    return F.foldl_(fka, new Map<K, A>(), (b, [k, a]) => {
      const oka = lookupWithKeyE_(b, k)
      if (oka._tag === 'Just') {
        b.set(oka.value[0], S.combine_(oka.value[1], a))
      } else {
        b.set(k, a)
      }
      return b
    })
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Test whether or not a map is empty
 */
export function isEmpty<K, A>(d: ReadonlyMap<K, A>): boolean {
  return d.size === 0
}

export function isNonEmpty<K, A>(d: ReadonlyMap<K, A>): boolean {
  return d.size !== 0
}

/**
 * Test whether or not one `Map` contains all of the keys and values contained in another `Map`
 *
 * @since 1.0.0
 */
export function isSubmap_<K, A>(EK: P.Eq<K>, EA: P.Eq<A>): (me: ReadonlyMap<K, A>, that: ReadonlyMap<K, A>) => boolean {
  const lookupWithKeyE = lookupWithKey(EK)
  return (me, that) => {
    const entries = me.entries()
    let e: IteratorResult<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const d2OptA = lookupWithKeyE(k)(that)
      if (M.isNothing(d2OptA) || !EK.equals_(k, d2OptA.value[0]) || !EA.equals_(a, d2OptA.value[1])) {
        return false
      }
    }
    return true
  }
}

/**
 * @dataFirst isSubmap_
 */
export function isSubmap<K, A>(
  EK: P.Eq<K>,
  EA: P.Eq<A>
): (that: ReadonlyMap<K, A>) => (me: ReadonlyMap<K, A>) => boolean {
  const isSubmapKA_ = isSubmap_(EK, EA)
  return (that) => (me) => isSubmapKA_(me, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Construct a new mutable map by copying this one
 */
export function toMutable<K, A>(m: ReadonlyMap<K, A>): Map<K, A> {
  return new Map(m)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

export function lookupAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => M.Maybe<A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k) =>
    pipe(
      lookupWithKeyE_(m, k),
      M.map(([_, a]) => a)
    )
}

/**
 * @dataFirst lookupAt_
 */
export function lookupAt<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => M.Maybe<A> {
  const lookupE_ = lookupAt_(E)
  return (k) => (m) => lookupE_(m, k)
}

export function insertAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE_(m, k)
    if (M.isNothing(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}

/**
 * @dataFirst insertAt_
 */
export function insertAt<K>(E: P.Eq<K>): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const insertAtE_ = insertAt_(E)
  return (k, a) => (m) => insertAtE_(m, k, a)
}

export function deleteAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k) => {
    const found = lookupWithKeyE_(m, k)
    if (M.isJust(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}

/**
 * @dataFrist deleteAt_
 */
export function deleteAt<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const deleteAtE_ = deleteAt_(E)
  return (k) => (m) => deleteAtE_(m, k)
}

export function updateAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => M.Maybe<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE_(m, k)
    if (M.isNothing(found)) {
      return M.nothing()
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return M.just(r)
  }
}

/**
 * @dataFirst updateAt_
 */
export function updateAt<K>(E: P.Eq<K>): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => M.Maybe<ReadonlyMap<K, A>> {
  const updateAtE_ = updateAt_(E)
  return (k, a) => (m) => updateAtE_(m, k, a)
}

export function modifyAt_<K>(
  E: P.Eq<K>
): <A>(m: ReadonlyMap<K, A>, k: K, f: (a: A) => A) => M.Maybe<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, f) => {
    const found = lookupWithKeyE_(m, k)
    if (M.isNothing(found)) {
      return M.nothing()
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return M.just(r)
  }
}

/**
 * @dataFirst modifyAt_
 */
export function modifyAt<K>(
  E: P.Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => M.Maybe<ReadonlyMap<K, A>> {
  const modifyAtE_ = modifyAt_(E)
  return (k, f) => (m) => modifyAtE_(m, k, f)
}

export function pop_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => M.Maybe<readonly [A, ReadonlyMap<K, A>]> {
  const lookupE_   = lookupAt_(E)
  const deleteAtE_ = deleteAt_(E)
  return (m, k) =>
    pipe(
      lookupE_(m, k),
      M.map((a) => [a, deleteAtE_(m, k)])
    )
}

/**
 * @dataFirst pop_
 */
export function pop<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => M.Maybe<readonly [A, ReadonlyMap<K, A>]> {
  const popE_ = pop_(E)
  return (k) => (m) => popE_(m, k)
}

export function insert_<K, A>(me: ReadonlyMap<K, A>, k: K, a: A): ReadonlyMap<K, A> {
  const m = new Map(me)
  m.set(k, a)
  return m
}

/**
 * @dataFirst insert_
 */
export function insert<K, A>(k: K, a: A): (me: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (me) => insert_(me, k, a)
}

export function remove_<K, A>(m: ReadonlyMap<K, A>, k: K): ReadonlyMap<K, A> {
  const r = new Map(m)
  r.delete(k)
  return m
}

/**
 * @dataFirst remove_
 */
export function remove<K>(k: K): <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => remove_(m, k)
}

export function removeMany_<K, A>(m: ReadonlyMap<K, A>, ks: Iterable<K>): ReadonlyMap<K, A> {
  const r = new Map(m)
  for (const k of ks) {
    r.delete(k)
  }
  return r
}

/**
 * @dataFirst removeMany_
 */
export function removeMany<K>(ks: Iterable<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => removeMany_(m, ks)
}

export function lookup_<K, A>(m: ReadonlyMap<K, A>, k: K): M.Maybe<A> {
  return M.fromNullable(m.get(k))
}

/**
 * @dataFirst lookup_
 */
export function lookup<K>(k: K): <A>(m: ReadonlyMap<K, A>) => M.Maybe<A> {
  return (m) => lookup_(m, k)
}

export function lookupWithKey_<K>(E: P.Eq<K>) {
  return <A>(m: ReadonlyMap<K, A>, k: K): M.Maybe<readonly [K, A]> => {
    const entries = m.entries()
    let e: IteratorResult<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals_(ka, k)) {
        return M.just([ka, a])
      }
    }
    return M.nothing()
  }
}

/**
 * @dataFirst lookupWithKey_
 */
export function lookupWithKey<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => M.Maybe<readonly [K, A]> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (k) => (m) => lookupWithKeyE_(m, k)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Compactable
 * @since 1.0.0
 */
export function compact<K, A>(fa: ReadonlyMap<K, M.Maybe<A>>): ReadonlyMap<K, A> {
  const m       = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, M.Maybe<A>]>
  while (!(e = entries.next()).done) {
    const [k, oa] = e.value
    if (oa._tag === 'Just') {
      m.set(k, oa.value)
    }
  }
  return m
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export function separate<K, A, B>(fa: ReadonlyMap<K, E.Either<A, B>>): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>] {
  const left    = new Map<K, A>()
  const right   = new Map<K, B>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, E.Either<A, B>]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, ei] = e.value
    if (E.isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return [left, right]
}

/*
 * -------------------------------------------------------------------------------------------------
 * P.Eq
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category P.Eq
 * @since 1.0.0
 */
export function getEq<K, A>(EK: P.Eq<K>, EA: P.Eq<A>): P.Eq<ReadonlyMap<K, A>> {
  const isSubmapKA_ = isSubmap_(EK, EA)
  return P.Eq((x, y) => isSubmapKA_(x, y) && isSubmapKA_(y, x))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Filter out `None` and map
 */
export function filterMap_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A, k: K) => M.Maybe<B>): ReadonlyMap<K, B> {
  const m       = new Map<K, B>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const o      = f(a, k)
    if (o._tag === 'Just') {
      m.set(k, o.value)
    }
  }
  return m
}

/**
 * Filter out `None` and map
 *
 * @dataFirst filterMap_
 */
export function filterMap<K, A, B>(f: (a: A, k: K) => M.Maybe<B>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
  return (fa) => filterMap_(fa, f)
}

export function filter_<K, A, B extends A>(
  fa: ReadonlyMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): ReadonlyMap<K, B>
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.PredicateWithIndex<K, A>): ReadonlyMap<K, A>
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.PredicateWithIndex<K, A>): ReadonlyMap<K, A> {
  const m       = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (predicate(a, k)) {
      m.set(k, a)
    }
  }
  return m
}

/**
 * @dataFirst filter_
 */
export function filter<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>
export function filter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>
export function filter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<K, A, B extends A>(
  fa: ReadonlyMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function partition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.PredicateWithIndex<K, A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function partition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.PredicateWithIndex<K, A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  const left    = new Map<K, A>()
  const right   = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (predicate(a, k)) {
      right.set(k, a)
    } else {
      left.set(k, a)
    }
  }
  return [left, right]
}

/**
 * @dataFirst partition_
 */
export function partition<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function partition<K, A>(
  predicate: P.PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function partition<K, A>(
  predicate: P.PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<K, A, B, C>(
  fa: ReadonlyMap<K, A>,
  f: (a: A, k: K) => E.Either<B, C>
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
  const left    = new Map<K, B>()
  const right   = new Map<K, C>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const ei     = f(a, k)
    if (E.isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return [left, right]
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<K, A, B, C>(
  f: (a: A, k: K) => E.Either<B, C>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getFoldableWithIndex<K>(O: P.Ord<K>) {
  type FixK = HKT.Fix<'K', K>
  const keysO = keys(O)

  const ifoldl_: P.FoldLeftWithIndexFn_<MapF, FixK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (b: B, a: A, k: K) => B
  ): B => {
    let out: B = b
    const ks   = keysO(fa)
    const len  = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(out, fa.get(k)!, k)
    }
    return out
  }
  const ifoldMap_: P.FoldMapWithIndexFn_<MapF, FixK> =
    <M>(M: P.Monoid<M>) =>
    <A>(fa: ReadonlyMap<K, A>, f: (a: A, k: K) => M): M => {
      let out: M = M.nat
      const ks   = keysO(fa)
      const len  = ks.length
      for (let i = 0; i < len; i++) {
        const k = ks[i]
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        out = M.combine_(out, f(fa.get(k)!, k))
      }
      return out
    }
  const ifoldr_: P.FoldRightWithIndexFn_<MapF, FixK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (a: A, b: B, k: K) => B
  ): B => {
    let out: B = b
    const ks   = keysO(fa)
    const len  = ks.length
    for (let i = len - 1; i >= 0; i--) {
      const k = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(fa.get(k)!, out, k)
    }
    return out
  }

  return P.FoldableWithIndex<MapF, FixK>({
    ifoldl_,
    ifoldMap_,
    ifoldr_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Maps values using f
 */
export function map_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A, k: K) => B): ReadonlyMap<K, B> {
  const m       = new Map<K, B>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    m.set(key, f(a, key))
  }
  return m
}

/**
 * Maps values using f
 *
 * @dataFirst map_
 */
export function map<K, A, B>(f: (a: A, k: K) => B): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<K, A>(SK: P.Eq<K>, SA: P.Semigroup<A>): P.Monoid<ReadonlyMap<K, A>> {
  const lookupWithKeyK_ = lookupWithKey_(SK)
  return P.Monoid<ReadonlyMap<K, A>>((mx, my) => {
    if (mx.size === 0) {
      return my
    }
    if (my.size === 0) {
      return mx
    }
    const r       = new Map(mx)
    const entries = my.entries()
    let e: IteratorResult<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const mxOptA = lookupWithKeyK_(mx, k)
      if (M.isJust(mxOptA)) {
        r.set(mxOptA.value[0], SA.combine_(mxOptA.value[1], a))
      } else {
        r.set(k, a)
      }
    }
    return r
  }, empty())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getShow<K, A>(SK: P.Show<K>, SA: P.Show<A>): P.Show<ReadonlyMap<K, A>> {
  return {
    show: (m) => {
      const elements: string[] = []
      m.forEach((a, k) => {
        elements.push(`{ ${SK.show(k)} => ${SA.show(a)} }`)
      })
      return `Map(\n  ${elements.join('\n  ')}\n)`
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getTraversableWithindex<K>(O: P.Ord<K>) {
  type FixK = HKT.Fix<'K', K>

  const keysO = keys(O)

  const itraverse_ = P.implementTraverseWithIndex_<MapF, FixK>()((_) => (AG) => (ta, f) => {
    type _ = typeof _
    let gm: HKT.FK<
      _['G'],
      _['K1'],
      _['Q1'],
      _['W1'],
      _['X1'],
      _['I1'],
      _['S1'],
      _['R1'],
      _['E1'],
      ReadonlyMap<_['K'], _['B']>
    > = AG.pure(empty())
    const ks  = keysO(ta)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const key = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const a = ta.get(key)!
      gm      = AG.crossWith_(gm, f(a, key), (m, b) => new Map(m).set(key, b))
    }
    return gm
  })

  return P.TraversableWithIndex({
    imap_: map_,
    ...getFoldableWithIndex(O),
    itraverse_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getWitherableWithIndex<K>(O: P.Ord<K>) {
  type CK = HKT.Fix<'K', K>

  const TraversableWithIndex = getTraversableWithindex(O)

  const iwither_ = P.implementWitherWithIndex_<MapF, CK>()(
    (_) => (G) => (wa, f) => pipe(TraversableWithIndex.itraverse_(G)(wa, f), G.map(compact))
  )

  const iwilt_ = P.implementPartitionMapWithIndexA_<MapF, CK>()(
    (_) => (G) => (wa, f) => pipe(TraversableWithIndex.itraverse_(G)(wa, f), G.map(separate))
  )

  return P.WitherableWithIndex<MapF, CK>({
    ...TraversableWithIndex,
    ifilter_: filter_,
    ifilterMap_: filterMap_,
    ipartition_: partition_,
    ipartitionMap_: partitionMap_,
    iwilt_,
    iwither_
  })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Get a sorted array of the keys contained in a map
 *
 * @since 2.5.0
 */
export function keys<K>(O: P.Ord<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyArray<K> {
  return (m) => Array.from(m.keys()).sort((a, b) => O.compare_(a, b))
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, A>(d: Map<K, A>): number {
  return d.size
}

export function copy<K, A>(me: ReadonlyMap<K, A>): ReadonlyMap<K, A> {
  return new Map(me)
}

export function concat_<K>(E: P.Eq<K>): <A>(xs: ReadonlyMap<K, A>, ys: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const insertAtE_ = insertAt_(E)
  return (xs, ys) => {
    let r = copy(xs)
    for (const [k, a] of ys) {
      r = insertAtE_(r, k, a)
    }
    return r
  }
}

/**
 * @dataFirst concat_
 */
export function concat<K>(E: P.Eq<K>): <A>(ys: ReadonlyMap<K, A>) => (xs: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const concatE_ = concat_(E)
  return (ys) => (xs) => concatE_(xs, ys)
}
