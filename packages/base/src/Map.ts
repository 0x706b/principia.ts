import type * as HKT from './HKT'
import type { MapURI } from './Modules'

import * as E from './Either'
import * as O from './Option'
import * as P from './prelude'

type URI = [HKT.URI<MapURI>]

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

export function fromFoldable<F extends HKT.URIS, K, A, C = HKT.Auto>(
  E: P.Eq<K>,
  S: P.Semigroup<A>,
  F: P.Foldable<F, C>
) {
  return <N extends string, K_, Q, W, X, I, S, R, E>(
    fka: HKT.Kind<F, C, N, K_, Q, W, X, I, S, R, E, readonly [K, A]>
  ): ReadonlyMap<K, A> => {
    const lookupWithKeyE_ = lookupWithKey_(E)
    return F.foldl_(fka, new Map<K, A>(), (b, [k, a]) => {
      const oka = lookupWithKeyE_(b, k)
      if (oka._tag === 'Some') {
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
      if (O.isNone(d2OptA) || !EK.equals_(k, d2OptA.value[0]) || !EA.equals_(a, d2OptA.value[1])) {
        return false
      }
    }
    return true
  }
}

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

export function lookupAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => O.Option<A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k) =>
    P.pipe(
      lookupWithKeyE_(m, k),
      O.map(([_, a]) => a)
    )
}

export function lookupAt<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => O.Option<A> {
  const lookupE_ = lookupAt_(E)
  return (k) => (m) => lookupE_(m, k)
}

export function insertAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE_(m, k)
    if (O.isNone(found)) {
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

export function insertAt<K>(E: P.Eq<K>): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const insertAtE_ = insertAt_(E)
  return (k, a) => (m) => insertAtE_(m, k, a)
}

export function deleteAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k) => {
    const found = lookupWithKeyE_(m, k)
    if (O.isSome(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}

export function deleteAt<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const deleteAtE_ = deleteAt_(E)
  return (k) => (m) => deleteAtE_(m, k)
}

export function updateAt_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => O.Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE_(m, k)
    if (O.isNone(found)) {
      return O.none()
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return O.some(r)
  }
}

export function updateAt<K>(E: P.Eq<K>): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => O.Option<ReadonlyMap<K, A>> {
  const updateAtE_ = updateAt_(E)
  return (k, a) => (m) => updateAtE_(m, k, a)
}

export function modifyAt_<K>(
  E: P.Eq<K>
): <A>(m: ReadonlyMap<K, A>, k: K, f: (a: A) => A) => O.Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E)
  return (m, k, f) => {
    const found = lookupWithKeyE_(m, k)
    if (O.isNone(found)) {
      return O.none()
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return O.some(r)
  }
}

export function modifyAt<K>(
  E: P.Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => O.Option<ReadonlyMap<K, A>> {
  const modifyAtE_ = modifyAt_(E)
  return (k, f) => (m) => modifyAtE_(m, k, f)
}

export function pop_<K>(E: P.Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => O.Option<readonly [A, ReadonlyMap<K, A>]> {
  const lookupE_   = lookupAt_(E)
  const deleteAtE_ = deleteAt_(E)
  return (m, k) =>
    P.pipe(
      lookupE_(m, k),
      O.map((a) => [a, deleteAtE_(m, k)])
    )
}

export function pop<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => O.Option<readonly [A, ReadonlyMap<K, A>]> {
  const popE_ = pop_(E)
  return (k) => (m) => popE_(m, k)
}

export function insert_<K, A>(me: ReadonlyMap<K, A>, k: K, a: A): ReadonlyMap<K, A> {
  const m = new Map(me)
  m.set(k, a)
  return m
}

export function insert<K, A>(k: K, a: A): (me: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (me) => insert_(me, k, a)
}

export function remove_<K, A>(m: ReadonlyMap<K, A>, k: K): ReadonlyMap<K, A> {
  const r = new Map(m)
  r.delete(k)
  return m
}

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

export function removeMany<K>(ks: Iterable<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => removeMany_(m, ks)
}

export function lookup_<K, A>(m: ReadonlyMap<K, A>, k: K): O.Option<A> {
  return O.fromNullable(m.get(k))
}

export function lookup<K>(k: K): <A>(m: ReadonlyMap<K, A>) => O.Option<A> {
  return (m) => lookup_(m, k)
}

export function lookupWithKey_<K>(E: P.Eq<K>) {
  return <A>(m: ReadonlyMap<K, A>, k: K): O.Option<readonly [K, A]> => {
    const entries = m.entries()
    let e: IteratorResult<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals_(ka, k)) {
        return O.some([ka, a])
      }
    }
    return O.none()
  }
}

export function lookupWithKey<K>(E: P.Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => O.Option<readonly [K, A]> {
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
export function compact<K, A>(fa: ReadonlyMap<K, O.Option<A>>): ReadonlyMap<K, A> {
  const m       = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, O.Option<A>]>
  while (!(e = entries.next()).done) {
    const [k, oa] = e.value
    if (oa._tag === 'Some') {
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
export function ifilterMap_<K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => O.Option<B>): ReadonlyMap<K, B> {
  const m       = new Map<K, B>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const o      = f(k, a)
    if (o._tag === 'Some') {
      m.set(k, o.value)
    }
  }
  return m
}

/**
 * Filter out `None` and map
 */
export function ifilterMap<K, A, B>(f: (k: K, a: A) => O.Option<B>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 * Filter out `None` and map
 */
export function filterMap_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => O.Option<B>): ReadonlyMap<K, B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * Filter out `None` and map
 */
export function filterMap<A, B>(f: (a: A) => O.Option<B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
  return (fa) => filterMap_(fa, f)
}

export function ifilter_<K, A, B extends A>(
  fa: ReadonlyMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): ReadonlyMap<K, B>
export function ifilter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.PredicateWithIndex<K, A>): ReadonlyMap<K, A>
export function ifilter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.PredicateWithIndex<K, A>): ReadonlyMap<K, A> {
  const m       = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (predicate(k, a)) {
      m.set(k, a)
    }
  }
  return m
}

/**
 *
 */
export function ifilter<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>
export function ifilter<K, A>(predicate: P.PredicateWithIndex<K, A>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: P.Refinement<A, B>): ReadonlyMap<K, B>
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.Predicate<A>): ReadonlyMap<K, A>
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: P.Predicate<A>): ReadonlyMap<K, A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>
export function filter<A>(predicate: P.Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>
export function filter<A>(predicate: P.Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (fa) => filter_(fa, predicate)
}

export function ipartition_<K, A, B extends A>(
  fa: ReadonlyMap<K, A>,
  refinement: P.RefinementWithIndex<K, A, B>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function ipartition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.PredicateWithIndex<K, A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function ipartition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.PredicateWithIndex<K, A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  const left    = new Map<K, A>()
  const right   = new Map<K, A>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (predicate(k, a)) {
      right.set(k, a)
    } else {
      left.set(k, a)
    }
  }
  return [left, right]
}

export function ipartition<K, A, B extends A>(
  refinement: P.RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function ipartition<K, A>(
  predicate: P.PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function ipartition<K, A>(
  predicate: P.PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  return (fa) => ipartition_(fa, predicate)
}

export function partition_<K, A, B extends A>(
  fa: ReadonlyMap<K, A>,
  refinement: P.Refinement<A, B>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function partition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function partition_<K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: P.Predicate<A>
): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  return ipartition_(fa, (_, a) => predicate(a))
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): <K>(fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, B>]
export function partition<A>(
  predicate: P.Predicate<A>
): <K>(fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>]
export function partition<A>(
  predicate: P.Predicate<A>
): <K>(fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] {
  return (fa) => partition_(fa, predicate)
}

export function ipartitionMap_<K, A, B, C>(
  fa: ReadonlyMap<K, A>,
  f: (k: K, a: A) => E.Either<B, C>
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
  const left    = new Map<K, B>()
  const right   = new Map<K, C>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const ei     = f(k, a)
    if (E.isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return [left, right]
}

export function ipartitionMap<K, A, B, C>(
  f: (k: K, a: A) => E.Either<B, C>
): (fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<K, A, B, C>(
  fa: ReadonlyMap<K, A>,
  f: (a: A) => E.Either<B, C>
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>
): <K>(fa: ReadonlyMap<K, A>) => readonly [ReadonlyMap<K, B>, ReadonlyMap<K, C>] {
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

  const ifoldl_: P.FoldLeftWithIndexFn_<URI, FixK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (b: B, k: K, a: A) => B
  ): B => {
    let out: B = b
    const ks   = keysO(fa)
    const len  = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(out, k, fa.get(k)!)
    }
    return out
  }
  const ifoldMap_: P.FoldMapWithIndexFn_<URI, FixK> =
    <M>(M: P.Monoid<M>) =>
    <A>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => M): M => {
      let out: M = M.nat
      const ks   = keysO(fa)
      const len  = ks.length
      for (let i = 0; i < len; i++) {
        const k = ks[i]
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        out = M.combine_(out, f(k, fa.get(k)!))
      }
      return out
    }
  const ifoldr_: P.FoldRightWithIndexFn_<URI, FixK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (a: A, k: K, b: B) => B
  ): B => {
    let out: B = b
    const ks   = keysO(fa)
    const len  = ks.length
    for (let i = len - 1; i >= 0; i--) {
      const k = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(fa.get(k)!, k, out)
    }
    return out
  }

  return P.FoldableWithIndex<URI, FixK>({
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
export function imap_<K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => B): ReadonlyMap<K, B> {
  const m       = new Map<K, B>()
  const entries = fa.entries()
  let e: IteratorResult<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    m.set(key, f(key, a))
  }
  return m
}

/**
 * Maps values using f
 */
export function imap<K, A, B>(f: (k: K, a: A) => B): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
  return (fa) => imap_(fa, f)
}

/**
 * Maps values using f
 */
export function map_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => B): ReadonlyMap<K, B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Maps values using f
 */
export function map<A, B>(f: (a: A) => B): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
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
      if (O.isSome(mxOptA)) {
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

  const imapA_ = P.implementMapWithIndexA_<URI, FixK>()((_) => (AG) => (ta, f) => {
    type _ = typeof _
    let gm: HKT.HKT<_['G'], ReadonlyMap<_['K'], _['B']>> = AG.pure(empty())
    const ks                                             = keysO(ta)
    const len                                            = ks.length
    for (let i = 0; i < len; i++) {
      const key = ks[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const a = ta.get(key)!
      gm      = AG.crossWith_(gm, f(key, a), (m, b) => new Map(m).set(key, b))
    }
    return gm
  })

  return P.TraversableWithIndex({
    imap_,
    ...getFoldableWithIndex(O),
    imapA_
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

  const icompactA_ = P.implementWitherWithIndex_<URI, CK>()(
    (_) => (G) => (wa, f) => P.pipe(TraversableWithIndex.imapA_(G)(wa, f), G.map(compact))
  )

  const iseparateA_ = P.implementPartitionMapWithIndexA_<URI, CK>()(
    (_) => (G) => (wa, f) => P.pipe(TraversableWithIndex.imapA_(G)(wa, f), G.map(separate))
  )

  return P.WitherableWithIndex<URI, CK>({
    ...TraversableWithIndex,
    ifilter_,
    ifilterMap_,
    ipartition_,
    ipartitionMap_,
    ipartitionMapA_: iseparateA_,
    ifilterMapA_: icompactA_
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

export function concat<K>(E: P.Eq<K>): <A>(ys: ReadonlyMap<K, A>) => (xs: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const concatE_ = concat_(E)
  return (ys) => (xs) => concatE_(xs, ys)
}
