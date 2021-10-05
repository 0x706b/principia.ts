import type { Either } from './Either'
import type { HashMap } from './HashMap'
import type * as HKT from './HKT'
import type { Maybe } from './Maybe'
import type { DictionaryURI } from './Modules'
import type { PredicateWithIndex, RefinementWithIndex } from './prelude'
import type { ReadonlyRecord } from './Record'

import { identity } from './function'
import * as M from './Maybe'
import * as P from './prelude'
import * as R from './Record'

const _hasOwnProperty = Object.prototype.hasOwnProperty

export const DictionaryTypeId = Symbol.for('@principia/base/Dictionary')
export type DictionaryTypeId = typeof DictionaryTypeId

export const DictionaryStore   = Symbol.for('@principia/base/Dictionary#store')
export const DictionaryOperate = Symbol.for('@principia/base/Dictionary#operate')

export type URI = [HKT.URI<DictionaryURI>]

export class Dictionary<A> implements Iterable<readonly [string, A]> {
  readonly [DictionaryTypeId]: DictionaryTypeId = DictionaryTypeId;
  readonly [DictionaryStore]: ReadonlyRecord<string, A>
  constructor(store: Record<string, A>) {
    this[DictionaryStore] = store
  }

  [Symbol.iterator](): Iterator<readonly [string, A]> {
    let entries = Object.entries(this[DictionaryStore])
    let i       = 0
    return {
      next() {
        const entry = entries[i]
        if (entry) {
          i += 1
          return { done: false, value: entry }
        } else {
          entries = null!
          return { done: true, value: undefined }
        }
      }
    }
  }

  [DictionaryOperate]<B>(f: (store: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B>): Dictionary<B> {
    return new Dictionary(f(this[DictionaryStore]))
  }
}

export const empty: Dictionary<never> = fromRecord({})

export function fromRecord<A>(_: ReadonlyRecord<string, A>): Dictionary<A> {
  return new Dictionary(_)
}

export function fromHashMap<A>(_: HashMap<string, A>): Dictionary<A> {
  let store: Record<string, A> = {}
  for (const [k, v] of _) {
    store[k] = v
  }
  return new Dictionary(store)
}

export function toRecord<A>(dict: Dictionary<A>): ReadonlyRecord<string, A> {
  return dict[DictionaryStore]
}

/*
 * -------------------------------------------------------------------------------------------------
 * predicates
 * -------------------------------------------------------------------------------------------------
 */

export function elem_<A>(E: P.Eq<A>): (dict: Dictionary<A>, a: A) => boolean {
  return (dict, a) => R.elem_(E)(dict[DictionaryStore], a)
}

export function elem<A>(E: P.Eq<A>): (a: A) => (dict: Dictionary<A>) => boolean {
  return (a) => (dict) => elem_(E)(dict, a)
}

export function every_<A, B extends A>(
  dict: Dictionary<A>,
  predicate: RefinementWithIndex<string, A, B>
): dict is Dictionary<B>
export function every_<A>(dict: Dictionary<A>, predicate: PredicateWithIndex<string, A>): boolean
export function every_<A>(dict: Dictionary<A>, predicate: PredicateWithIndex<string, A>): boolean {
  return R.every_(dict[DictionaryStore], predicate)
}

export function every<A, B extends A>(
  predicate: RefinementWithIndex<string, A, B>
): (dict: Dictionary<A>) => dict is Dictionary<B>
export function every<A>(predicate: PredicateWithIndex<string, A>): (dict: Dictionary<A>) => boolean
export function every<A>(predicate: PredicateWithIndex<string, A>): (dict: Dictionary<A>) => boolean {
  return (dict) => every_(dict, predicate)
}

export function has_<A>(dict: Dictionary<A>, k: string): boolean {
  return R.has_(dict[DictionaryStore], k)
}

export function has(k: string): <A>(dict: Dictionary<A>) => boolean {
  return (dict) => has_(dict, k)
}

export function isEmpty<A>(dict: Dictionary<A>): boolean {
  return keys(dict).length === 0
}

export function isSubdictionary_<A>(E: P.Eq<A>): (me: Dictionary<A>, that: Dictionary<A>) => boolean {
  return (me, that) => R.isSubrecord_(E)(me[DictionaryStore], that[DictionaryStore])
}

export function isSubdictionary<A>(E: P.Eq<A>): (that: Dictionary<A>) => (me: Dictionary<A>) => boolean {
  return (that) => (me) => isSubdictionary_(E)(me, that)
}

export function some_<A>(dict: Dictionary<A>, predicate: PredicateWithIndex<string, A>): boolean {
  return R.some_(dict[DictionaryStore], predicate)
}

export function some<A>(predicate: PredicateWithIndex<string, A>): (dict: Dictionary<A>) => boolean {
  return (dict) => some_(dict, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Dictionary<A>> {
  const isSubrecordE = isSubdictionary(E)
  return P.Eq((x, y) => isSubrecordE(x)(y) && isSubrecordE(y)(x))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(fa: Dictionary<A>, refinement: RefinementWithIndex<string, A, B>): Dictionary<B>
export function filter_<A>(fa: Dictionary<A>, predicate: PredicateWithIndex<string, A>): Dictionary<A>
export function filter_<A>(fa: Dictionary<A>, predicate: PredicateWithIndex<string, A>): Dictionary<A> {
  return fa[DictionaryOperate](R.filter(predicate))
}

/**
 */
export function filter<A, B extends A>(
  refinement: RefinementWithIndex<string, A, B>
): (fa: Dictionary<A>) => Dictionary<B>
export function filter<A>(predicate: PredicateWithIndex<string, A>): (fa: Dictionary<A>) => Dictionary<A>
export function filter<A>(predicate: PredicateWithIndex<string, A>): (fa: Dictionary<A>) => Dictionary<A> {
  return (fa) => filter_(fa, predicate)
}

/**
 */
export function filterMap_<A, B>(fa: Dictionary<A>, f: (a: A, k: string) => Maybe<B>): Dictionary<B> {
  return fa[DictionaryOperate](R.filterMap(f))
}

/**
 */
export function filterMap<A, B>(f: (a: A, k: string) => Maybe<B>): (fa: Dictionary<A>) => Dictionary<B> {
  return (fa) => filterMap_(fa, f)
}

/**
 */
export function partition_<A, B extends A>(
  fa: Dictionary<A>,
  refinement: RefinementWithIndex<string, A, B>
): readonly [Dictionary<A>, Dictionary<B>]
export function partition_<A>(
  fa: Dictionary<A>,
  predicate: PredicateWithIndex<string, A>
): readonly [Dictionary<A>, Dictionary<A>]
export function partition_<A>(
  fa: Dictionary<A>,
  predicate: PredicateWithIndex<string, A>
): readonly [Dictionary<A>, Dictionary<A>] {
  const [left, right] = R.partition_(fa[DictionaryStore], predicate)
  return [fromRecord(left), fromRecord(right)]
}

/**
 */
export function partition<N extends string, A, B extends A>(
  refinement: RefinementWithIndex<N, A, B>
): (fa: Dictionary<A>) => readonly [Dictionary<A>, Dictionary<B>]
export function partition<N extends string, A>(
  predicate: PredicateWithIndex<N, A>
): (fa: Dictionary<A>) => readonly [Dictionary<A>, Dictionary<A>]
export function partition<A>(
  predicate: PredicateWithIndex<string, A>
): (fa: Dictionary<A>) => readonly [Dictionary<A>, Dictionary<A>] {
  return (fa) => partition_(fa, predicate)
}

/**
 */
export function partitionMap_<A, B, C>(
  fa: Dictionary<A>,
  f: (a: A, k: string) => Either<B, C>
): readonly [Dictionary<B>, Dictionary<C>] {
  const [left, right] = R.partitionMap_(fa[DictionaryStore], f)
  return [fromRecord(left), fromRecord(right)]
}

/**
 */
export function partitionMap<A, B, C>(
  f: (a: A, k: string) => Either<B, C>
): (fa: Dictionary<A>) => readonly [Dictionary<B>, Dictionary<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: Dictionary<A>, b: B, f: (b: B, a: A, k: string) => B): B {
  return R.foldl_(fa[DictionaryStore], b, f)
}

export function foldl<A, B>(b: B, f: (b: B, a: A, k: string) => B): (fa: Dictionary<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: Dictionary<A>, b: B, f: (a: A, b: B, k: string) => B): B {
  return R.foldr_(fa[DictionaryStore], b, f)
}

export function foldr<A, B>(b: B, f: (a: A, b: B, k: string) => B): (fa: Dictionary<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Dictionary<A>, f: (a: A, k: string) => M) => M {
  return (fa, f) => R.foldMap_(M)(fa[DictionaryStore], f)
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A, k: string) => M) => (fa: Dictionary<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function fromFoldableMap<B, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<B>, F: P.Foldable<F, C>) {
  return <KF, QF, WF, XF, IF, SF, RF, EF, A>(
    fa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A) => readonly [string, B]
  ): Dictionary<B> => fromRecord(R.fromFoldableMap(S, F)(fa, f))
}

export function fromFoldable<A, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<A>, F: P.Foldable<F, C>) {
  const fromFoldableMapS = fromFoldableMap(S, F)
  return <KF, QF, WF, XF, IF, SF, RF, EF>(
    fa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, readonly [string, A]>
  ): Dictionary<A> => fromFoldableMapS(fa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: Dictionary<A>, f: (a: A, k: string) => B): Dictionary<B> {
  return fa[DictionaryOperate](R.map(f))
}

export function map<A, B>(f: (a: A, k: string) => B): (fa: Dictionary<A>) => Dictionary<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */
export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<Dictionary<A>> {
  return P.Monoid<Dictionary<A>>((x, y) => {
    if (isEmpty(x)) {
      return y
    }
    if (isEmpty(y)) {
      return x
    }
    const recordKeys = keys(y)
    const len        = recordKeys.length
    if (len === 0) {
      return x
    }
    const r = Object.assign({}, x[DictionaryStore]) as Record<string, A>
    for (let i = 0; i < len; i++) {
      const k = recordKeys[i]
      r[k]    = _hasOwnProperty.call(x, k) ? S.combine_(x[k], y[k]) : y[k]
    }
    return fromRecord(r)
  }, empty)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<A>(S: P.Show<A>): P.Show<Dictionary<A>> {
  return {
    show: (a) => {
      const elements = collect_(a, (a, k) => `${JSON.stringify(k)}: ${S.show(a)}`).join(', ')
      return elements === '' ? '{}' : `{ ${elements} }`
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const mapA_: P.MapWithIndexAFn_<URI> = (A) => (ta, f) => A.map_(R.mapA_(A)(ta[DictionaryStore], f), fromRecord)

export const mapA: P.MapWithIndexAFn<URI> = (A) => (f) => (ta) => mapA_(A)(ta, f)

export const sequence: P.SequenceFn<URI> = (A) => (ta) => mapA_(A)(ta, (_) => _)

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const filterMapA_: P.FilterMapWithIndexAFn_<URI> = (A) => (wa, f) =>
  A.map_(R.filterMapA_(A)(wa[DictionaryStore], f), fromRecord)

export const filterMapA: P.FilterMapWithIndexAFn<URI> = (A) => (f) => (wa) => filterMapA_(A)(wa, f)

export const partitionMapA_: P.PartitionMapWithIndexAFn_<URI> = (A) => (wa, f) =>
  A.map_(R.partitionMapA_(A)(wa[DictionaryStore], f), ([left, right]) => [fromRecord(left), fromRecord(right)])

export const partitionMapA: P.PartitionMapAFn<URI> = (A) => (f) => (wa) => partitionMapA_(A)(wa, f)

/*
 * -------------------------------------------------------------------------------------------------
 * utils
 * -------------------------------------------------------------------------------------------------
 */

export function keys(dict: Dictionary<unknown>): ReadonlyArray<string> {
  return Object.keys(dict[DictionaryStore])
}

export function size(dict: Dictionary<unknown>): number {
  return Object.keys(dict[DictionaryStore]).length
}

/*
 * -------------------------------------------------------------------------------------------------
 * combinators
 * -------------------------------------------------------------------------------------------------
 */

export function collect_<A, B>(dict: Dictionary<A>, f: (a: A, k: string) => B): ReadonlyArray<B> {
  return R.collect_(dict[DictionaryStore], f)
}

export function collect<A, B>(f: (a: A, k: string) => B): (dict: Dictionary<A>) => ReadonlyArray<B> {
  return (dict) => collect_(dict, f)
}

export function deleteAt_<A>(dict: Dictionary<A>, k: string): Dictionary<A> {
  return dict[DictionaryOperate](R.deleteAt(k))
}

export function deleteAt(k: string): <A>(dict: Dictionary<A>) => Dictionary<A> {
  return (dict) => deleteAt_(dict, k)
}

export function insertAt_<A>(dict: Dictionary<A>, k: string, a: A): Maybe<Dictionary<A>> {
  return M.map_(R.insertAt_(dict[DictionaryStore], k, a), fromRecord)
}

export function insertAt<A>(k: string, a: A): (dict: Dictionary<A>) => Maybe<Dictionary<A>> {
  return (dict) => insertAt_(dict, k, a)
}

export function lookup_<A>(dict: Dictionary<A>, k: string): Maybe<A> {
  return R.lookup_(dict[DictionaryStore], k)
}

export function lookup(k: string): <A>(dict: Dictionary<A>) => Maybe<A> {
  return (dict) => lookup_(dict, k)
}

export function modifyAt_<A>(dict: Dictionary<A>, k: string, f: (a: A) => A): Maybe<Dictionary<A>> {
  return M.map_(R.modifyAt_(dict[DictionaryStore], k, f), fromRecord)
}

export function modifyAt<A>(k: string, f: (a: A) => A): (dict: Dictionary<A>) => Maybe<Dictionary<A>> {
  return (dict) => modifyAt_(dict, k, f)
}

export function pop_<A>(dict: Dictionary<A>, k: string): Maybe<readonly [A, Dictionary<A>]> {
  return M.map_(R.pop_(dict[DictionaryStore], k), ([a, record]) => [a, fromRecord(record)])
}

export function pop(k: string): <A>(dict: Dictionary<A>) => Maybe<readonly [A, Dictionary<A>]> {
  return (dict) => pop_(dict, k)
}

export function updateAt_<A>(dict: Dictionary<A>, k: string, a: A): Maybe<Dictionary<A>> {
  return M.map_(R.updateAt_(dict[DictionaryStore], k, a), fromRecord)
}

export function updateAt<A>(k: string, a: A): (dict: Dictionary<A>) => Maybe<Dictionary<A>> {
  return (dict) => updateAt_(dict, k, a)
}

export function upsertAt_<A>(dict: Dictionary<A>, k: string, a: A): Dictionary<A> {
  return dict[DictionaryOperate](R.upsertAt(k, a))
}

export function upsertAt<A>(k: string, a: A): (dict: Dictionary<A>) => Dictionary<A> {
  return (dict) => upsertAt_(dict, k, a)
}
