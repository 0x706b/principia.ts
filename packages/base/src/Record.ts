import type { Eq } from './Eq'
import type * as HKT from './HKT'
import type { RecordURI } from './Modules'
import type { PredicateWithIndex } from './Predicate'
import type { RefinementWithIndex } from './Refinement'
import type { Show } from './Show'

import * as E from './Either'
import { identity, pipe } from './function'
import * as G from './Guard'
import * as M from './Maybe'
import * as P from './prelude'
import { tuple } from './tuple'

const _hasOwnProperty = Object.prototype.hasOwnProperty

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type ReadonlyRecord<K extends string, T> = Readonly<Record<K, T>>

export type InferRecordType<T extends ReadonlyRecord<any, any>> = T extends {
  readonly [k in keyof T]: infer A
}
  ? A
  : never

type URI = [HKT.URI<RecordURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Guards
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): <N extends string>(r: Readonly<Record<N, A>>, a: A) => boolean {
  return (r, a) => {
    for (const k in r) {
      if (E.equals(r[k])(a)) {
        return true
      }
    }
    return false
  }
}

/**
 * @category Guards
 * @since 1.0.0
 *
 * @dataFirst elem_
 */
export function elem<A>(E: Eq<A>): (a: A) => <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (a) => (r) => elem_(E)(r, a)
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function every_<N extends string, A, B extends A>(
  r: ReadonlyRecord<N, A>,
  predicate: RefinementWithIndex<N, A, B>
): r is ReadonlyRecord<N, B>
export function every_<N extends string, A>(r: ReadonlyRecord<N, A>, predicate: PredicateWithIndex<N, A>): boolean
export function every_<N extends string, A>(r: ReadonlyRecord<N, A>, predicate: PredicateWithIndex<N, A>): boolean {
  for (const k in r) {
    if (!predicate(r[k], k)) {
      return false
    }
  }
  return true
}

/**
 * @category Guards
 * @since 1.0.0
 *
 * @dataFirst every_
 */
export function every<N extends string, A, B extends A>(
  predicate: RefinementWithIndex<N, A, B>
): (r: ReadonlyRecord<N, A>) => r is ReadonlyRecord<N, B>
export function every<N extends string, A>(predicate: PredicateWithIndex<N, A>): (r: ReadonlyRecord<N, A>) => boolean
export function every<N extends string, A>(predicate: PredicateWithIndex<N, A>): (r: ReadonlyRecord<N, A>) => boolean {
  return (r) => every_(r, predicate)
}

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 */
export function has_<N extends string>(r: ReadonlyRecord<N, unknown>, k: string): boolean {
  return _hasOwnProperty.call(r, k)
}

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 *
 * @dataFirst has_
 */
export function has<N extends string>(k: string): (r: ReadonlyRecord<N, unknown>) => boolean {
  return (r) => has_(r, k)
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 */
export function isSubrecord_<A>(E: Eq<A>): (me: ReadonlyRecord<string, A>, that: ReadonlyRecord<string, A>) => boolean {
  return (me, that) => {
    for (const k in me) {
      if (!_hasOwnProperty.call(that, k) || !E.equals(me[k])(that[k])) {
        return false
      }
    }
    return true
  }
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 *
 * @dataFirst isSubrecord_
 */
export function isSubrecord<A>(
  E: Eq<A>
): (that: ReadonlyRecord<string, A>) => (me: ReadonlyRecord<string, A>) => boolean {
  return (that) => (me) => isSubrecord_(E)(me, that)
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function some_<N extends string, A>(r: ReadonlyRecord<N, A>, predicate: PredicateWithIndex<N, A>): boolean {
  for (const k in r) {
    if (predicate(r[k], k)) {
      return true
    }
  }
  return false
}

/**
 * @category Guards
 * @since 1.0.0
 *
 * @dataFirst some_
 */
export function some<N extends string, A>(predicate: PredicateWithIndex<N, A>): (r: Readonly<Record<N, A>>) => boolean {
  return (r) => some_(r, predicate)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export const empty: ReadonlyRecord<string, never> = {}

export function fromRecord<N extends string, A>(r: Record<N, A>): ReadonlyRecord<N, A> {
  return Object.assign({}, r)
}

export function singleton<A>(k: string, a: A): ReadonlyRecord<string, A> {
  return { [k]: a } as any
}

export function toRecord<N extends string, A>(r: ReadonlyRecord<N, A>): Record<N, A> {
  return Object.assign({}, r)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export function toArray<N extends string, A>(r: ReadonlyRecord<N, A>): ReadonlyArray<readonly [N, A]> {
  return collect_(r, (a, k) => [k, a])
}

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUnfoldable<F extends HKT.URIS, C = HKT.Auto>(U: P.Unfoldable<F, C>) {
  return <N extends string, A>(
    r: ReadonlyRecord<N, A>
  ): HKT.Kind<
    F,
    C,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    HKT.Initial<C, 'E'>,
    readonly [N, A]
  > => {
    const arr = toArray(r)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? M.just([arr[b], b + 1]) : M.nothing()))
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

/**
 */
export function separate<N extends string, A, B>(
  fa: ReadonlyRecord<N, E.Either<A, B>>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>] {
  const left: Record<string, A>  = {} as any
  const right: Record<string, B> = {} as any
  const keys                     = Object.keys(fa)
  for (const key of keys) {
    const e = fa[key]
    switch (e.tag_) {
      case 'Left':
        left[key] = e.left
        break
      case 'Right':
        right[key] = e.right
        break
    }
  }
  return [left, right]
}

/**
 */
export function compact<N extends string, A>(fa: ReadonlyRecord<N, M.Maybe<A>>): ReadonlyRecord<string, A> {
  const r  = {} as Record<string, any>
  const ks = keys(fa)
  for (const key of ks) {
    const optionA = fa[key]
    if (M.isJust(optionA)) {
      r[key] = optionA.value
    }
  }
  return r
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<N extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<N, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> {
  const isSubrecordE = isSubrecord(E)
  return P.Eq((x, y) => isSubrecordE(x)(y) && isSubrecordE(y)(x))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 */
export function filter_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: RefinementWithIndex<N, A, B>
): ReadonlyRecord<string, B>
export function filter_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: PredicateWithIndex<N, A>
): ReadonlyRecord<string, A>
export function filter_<A>(
  fa: ReadonlyRecord<string, A>,
  predicate: PredicateWithIndex<string, A>
): ReadonlyRecord<string, A> {
  const out   = {} as Record<string, A>
  let changed = false
  for (const key in fa) {
    if (_hasOwnProperty.call(fa, key)) {
      const a = fa[key]
      if (predicate(a, key)) {
        out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? out : fa
}

/**
 * @dataFirst filter_
 */
export function filter<N extends string, A, B extends A>(
  refinement: RefinementWithIndex<N, A, B>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, B>
export function filter<N extends string, A>(
  predicate: PredicateWithIndex<N, A>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>
export function filter<A>(
  predicate: PredicateWithIndex<string, A>
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (fa) => filter_(fa, predicate)
}

/**
 */
export function filterMap_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  f: (a: A, k: N) => M.Maybe<B>
): ReadonlyRecord<string, B> {
  const r  = {} as Record<string, B>
  const ks = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key     = ks[i]
    const optionB = f(fa[key], key)
    if (M.isJust(optionB)) {
      r[key] = optionB.value
    }
  }
  return r
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<N extends string, A, B>(
  f: (a: A, k: N) => M.Maybe<B>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, B> {
  return (fa) => filterMap_(fa, f)
}

/**
 */
export function partition_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: RefinementWithIndex<N, A, B>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function partition_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: PredicateWithIndex<N, A>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function partition_<A>(fa: ReadonlyRecord<string, A>, predicate: PredicateWithIndex<string, A>) {
  const left  = {} as Record<string, A>
  const right = {} as Record<string, A>
  const ks    = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    const a   = fa[key]
    if (predicate(a, key)) {
      right[key] = a
    } else {
      left[key] = a
    }
  }
  return tuple(left, right)
}

/**
 * @dataFirst partition_
 */
export function partition<N extends string, A, B extends A>(
  refinement: RefinementWithIndex<N, A, B>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function partition<N extends string, A>(
  predicate: PredicateWithIndex<N, A>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function partition<A>(
  predicate: PredicateWithIndex<string, A>
): (fa: ReadonlyRecord<string, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>] {
  return (fa) => partition_(fa, predicate)
}

/**
 */
export function partitionMap_<N extends string, A, B, C>(
  fa: ReadonlyRecord<N, A>,
  f: (a: A, k: N) => E.Either<B, C>
): readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  const left  = {} as Record<string, B>
  const right = {} as Record<string, C>
  const ks    = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    const e   = f(fa[key], key)
    E.match_(
      e,
      (b) => {
        left[key] = b
      },
      (c) => {
        right[key] = c
      }
    )
  }
  return [left, right]
}

/**
 * @dataFirst partitionMap_
 */
export function partitionMap<N extends string, A, B, C>(
  f: (a: A, k: N) => E.Either<B, C>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

/**
 */
export function foldl_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (b: B, a: A, k: N) => B): B {
  let out   = b
  const ks  = keys(fa)
  const len = ks.length
  for (let i = 0; i < len; i++) {
    const k = ks[i]
    out     = f(out, fa[k], k)
  }
  return out
}

/**
 * @dataFirst foldl_
 */
export function foldl<N extends string, A, B>(b: B, f: (b: B, a: A, k: N) => B): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 */
export function foldr_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (a: A, b: B, k: N) => B): B {
  let out   = b
  const ks  = keys(fa)
  const len = ks.length
  for (let i = len - 1; i >= 0; i--) {
    const k = ks[i]
    out     = f(fa[k], out, k)
  }
  return out
}

/**
 * @dataFirst foldr_
 */
export function foldr<N extends string, A, B>(b: B, f: (a: A, b: B, k: N) => B): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(
  M: P.Monoid<M>
): <N extends string, A>(fa: Readonly<Record<N, A>>, f: (a: A, k: N) => M) => M {
  return (fa, f) => {
    let out   = M.nat
    const ks  = keys(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out     = M.combine_(out, f(fa[k], k))
    }
    return out
  }
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<M>(
  M: P.Monoid<M>
): <N extends string, A>(f: (a: A, k: N) => M) => (fa: Readonly<Record<N, A>>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function fromFoldableMap<B, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<B>, F: P.Foldable<F, C>) {
  return <KF, QF, WF, XF, IF, SF, RF, EF, A, N extends string>(
    fa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A) => readonly [N, B]
  ): ReadonlyRecord<N, B> =>
    pipe(
      fa,
      F.foldl<A, Record<N, B>>({} as any, (r, a) => {
        const [k, b] = f(a)
        r[k]         = _hasOwnProperty.call(r, k) ? S.combine_(r[k], b) : b
        return r
      })
    )
}

export function fromFoldable<A, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<A>, F: P.Foldable<F, C>) {
  const fromFoldableMapS = fromFoldableMap(S, F)
  return <KF, QF, WF, XF, IF, SF, RF, EF, N extends string>(
    fa: HKT.Kind<F, C, KF, QF, WF, XF, IF, SF, RF, EF, readonly [N, A]>
  ): ReadonlyRecord<N, A> => fromFoldableMapS(fa, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function map_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, f: (a: A, k: N) => B): ReadonlyRecord<N, B> {
  const out  = {} as Record<N, B>
  const keys = Object.keys(fa)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as keyof typeof fa
    out[k]  = f(fa[k], k)
  }
  return out
}

/**
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 *
 * @dataFirst map_
 */
export function map<N extends string, A, B>(f: (a: A, k: N) => B): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<N, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getMonoid<N extends string, A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<N, A>>
export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<string, A>>
export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<string, A>> {
  return P.Monoid<ReadonlyRecord<string, A>>((x, y) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const keys = Object.keys(y)
    const len  = keys.length
    if (len === 0) {
      return x
    }
    const r = Object.assign({}, x) as Record<string, A>
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      r[k]    = _hasOwnProperty.call(x, k) ? S.combine_(x[k], y[k]) : y[k]
    }
    return r
  }, empty)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<A>(S: Show<A>): Show<ReadonlyRecord<string, A>> {
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

/**
 */
export const traverse_: P.TraverseIndexFn_<[HKT.URI<RecordURI>]> = P.implementTraverseWithIndex_<
  [HKT.URI<RecordURI>]
>()((_) => (G) => (ta, f) => {
  type _ = typeof _

  const ks = keys(ta)
  if (ks.length === 0) {
    return G.pure(empty)
  }
  let gr: HKT.HKT<_['G'], Record<string, _['B']>> = G.pure({}) as any
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    gr        = G.crossWith_(gr, f(ta[key], key), (r, b) => {
      r[key] = b
      return r
    })
  }
  return gr
})

/**
 * @dataFirst traverse_
 */
export const traverse: P.MapWithIndexAFn<[HKT.URI<RecordURI>]> = (G) => (f) => (ta) => traverse_(G)(ta, f)

/**
 */
export const sequence: P.SequenceFn<[HKT.URI<RecordURI>]> = (G) => (ta) => traverse_(G)(ta, (a) => a)

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const wither_: P.WitherWithIndexFn_<[HKT.URI<RecordURI>]> = (A) => (wa, f) =>
  pipe(traverse_(A)(wa, f), A.map(compact))

/**
 * @dataFirst wither_
 */
export const wither: P.WitherWithIndexFn<[HKT.URI<RecordURI>]> = (A) => (f) => (wa) => wither_(A)(wa, f)

export const wilt_: P.WiltWithIndexFn_<[HKT.URI<RecordURI>]> = (A) => (wa, f) =>
  pipe(traverse_(A)(wa, f), A.map(separate))

/**
 * @dataFirst wilt_
 */
export const wilt: P.WiltWithIndexFn<[HKT.URI<RecordURI>]> = (G) => (f) => (wa) => wilt_(G)(wa, f)

/*
 * -------------------------------------------------------------------------------------------------
 * Utils
 * -------------------------------------------------------------------------------------------------
 */

export function keys<N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> {
  return Object.keys(r) as any
}

export function size(r: ReadonlyRecord<string, unknown>): number {
  return Object.keys(r).length
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function collect_<N extends string, A, B>(r: ReadonlyRecord<N, A>, f: (a: A, k: N) => B): ReadonlyArray<B> {
  const out: Array<B> = []
  const ks            = keys(r)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    out.push(f(r[key], key))
  }
  return out
}

/**
 * @dataFirst collect_
 */
export function collect<N extends string, A, B>(f: (a: A, k: N) => B): (r: ReadonlyRecord<N, A>) => ReadonlyArray<B> {
  return (r) => collect_(r, f)
}

export function deleteAt_<A>(r: ReadonlyRecord<string, A>, k: string): ReadonlyRecord<string, A> {
  if (!has_(r, k)) {
    return r
  }
  const out = Object.assign({}, r) as Record<string, A>
  delete out[k as any]
  return out as any
}

/**
 * @dataFirst deleteAt_
 */
export function deleteAt(k: string): <A>(r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (r) => deleteAt_(r, k)
}

export function insertAt_<A>(r: ReadonlyRecord<string, A>, k: string, a: A): M.Maybe<ReadonlyRecord<string, A>> {
  if (!has_(r, k)) {
    const out = Object.assign({}, r) as Record<string, A>
    out[k]    = a
    return M.just(out)
  }
  return M.nothing()
}

/**
 * @dataFirst insertAt_
 */
export function insertAt<A>(k: string, a: A): (r: ReadonlyRecord<string, A>) => M.Maybe<ReadonlyRecord<string, A>> {
  return (r) => insertAt_(r, k, a)
}

export function lookup_<A>(r: ReadonlyRecord<string, A>, k: string): M.Maybe<A> {
  return _hasOwnProperty.call(r, k) ? M.just(r[k]) : M.nothing()
}

/**
 * @dataFirst lookup_
 */
export function lookup(k: string): <A>(r: ReadonlyRecord<string, A>) => M.Maybe<A> {
  return (r) => lookup_(r, k)
}

export function modifyAt_<A>(
  r: ReadonlyRecord<string, A>,
  k: string,
  f: (a: A) => A
): M.Maybe<ReadonlyRecord<string, A>> {
  if (!has_(r, k)) {
    return M.nothing()
  }
  const out = Object.assign({}, r) as Record<string, A>
  out[k]    = f(r[k])
  return M.just(out)
}

/**
 * @dataFirst modifyAt_
 */
export function modifyAt<A>(
  k: string,
  f: (a: A) => A
): (r: ReadonlyRecord<string, A>) => M.Maybe<ReadonlyRecord<string, A>> {
  return (r) => modifyAt_(r, k, f)
}

export function pop_<A>(r: ReadonlyRecord<string, A>, k: string): M.Maybe<readonly [A, ReadonlyRecord<string, A>]> {
  const deleteAtk = deleteAt(k)
  const oa        = lookup(k)(r)
  return M.match_(oa, M.nothing, (a) => M.just([a, deleteAtk(r)]))
}

/**
 * @dataFirst pop_
 */
export function pop(k: string): <A>(r: ReadonlyRecord<string, A>) => M.Maybe<readonly [A, ReadonlyRecord<string, A>]> {
  return (r) => pop_(r, k)
}

export function updateAt_<A>(r: ReadonlyRecord<string, A>, k: string, a: A): M.Maybe<ReadonlyRecord<string, A>> {
  return modifyAt_(r, k, () => a)
}

/**
 * @dataFirst updateAt_
 */
export function updateAt<A>(k: string, a: A): (r: ReadonlyRecord<string, A>) => M.Maybe<ReadonlyRecord<string, A>> {
  return (r) => updateAt_(r, k, a)
}

export function upsertAt_<A>(r: ReadonlyRecord<string, A>, k: string, a: A): ReadonlyRecord<string, A> {
  if (has_(r, k) && r[k] === a) {
    return r
  }
  const out = Object.assign({}, r) as Record<string, A>
  out[k]    = a
  return out
}

/**
 * @dataFirst upsertAt_
 */
export function upsertAt<A>(k: string, a: A): (r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (r) => upsertAt_(r, k, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const UnknownRecordEq: Eq<ReadonlyRecord<string, unknown>> = P.Eq((x, y) => {
  for (const k in x) {
    if (!(k in y)) {
      return false
    }
  }
  for (const k in y) {
    if (!(k in x)) {
      return false
    }
  }
  return true
})

export const UnknownRecordGuard: G.Guard<unknown, ReadonlyRecord<string, unknown>> = G.Guard(
  (u): u is ReadonlyRecord<string, unknown> => u != null && typeof u === 'object' && !Array.isArray(u)
)

export function getGuard<A>(codomain: G.Guard<unknown, A>): G.Guard<unknown, ReadonlyRecord<string, A>> {
  return pipe(
    UnknownRecordGuard,
    G.refine((r): r is ReadonlyRecord<string, A> => {
      for (const k in r) {
        if (!codomain.is(r[k])) {
          return false
        }
      }
      return true
    })
  )
}

export const Functor = P.Functor<URI>({
  map_
})

export const FunctorWithIndex = P.FunctorWithIndex<URI>({
  imap_: map_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const FoldableWithIndex = P.FoldableWithIndex<URI>({
  ifoldl_: foldl_,
  ifoldr_: foldr_,
  ifoldMap_: foldMap_
})

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const FilterableWithIndex = P.FilterableWithIndex<URI>({
  imap_: map_,
  ifilter_: filter_,
  ifilterMap_: filterMap_,
  ipartition_: partition_,
  ipartitionMap_: partitionMap_
})

export const Traversable = P.Traversable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  traverse_
})

export const TraversableWithIndex = P.TraversableWithIndex<URI>({
  imap_: map_,
  ifoldl_: foldl_,
  ifoldr_: foldr_,
  ifoldMap_: foldMap_,
  itraverse_: traverse_
})

export const Witherable = P.Witherable<URI>({
  map_,
  foldl_,
  foldr_,
  foldMap_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  traverse_,
  wither_,
  wilt_
})

export const WitherableWithIndex = P.WitherableWithIndex<URI>({
  imap_: map_,
  ifoldl_: foldl_,
  ifoldr_: foldr_,
  ifoldMap_: foldMap_,
  ifilter_: filter_,
  ifilterMap_: filterMap_,
  ipartition_: partition_,
  ipartitionMap_: partitionMap_,
  itraverse_: traverse_,
  iwither_: wither_,
  iwilt_: wilt_
})

export { RecordURI } from './Modules'
