import type * as E from './Either'
import type * as O from './Option'

import * as A from './Array/core'
import { not } from './Predicate'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function fromSet<A>(s: Set<A>): ReadonlySet<A> {
  return new Set(s)
}

export function empty<A>(): ReadonlySet<A> {
  return new Set()
}

export function singleton<A>(a: A): ReadonlySet<A> {
  return new Set([a])
}

export function fromArray_<A>(as: ReadonlyArray<A>, E: P.Eq<A>): ReadonlySet<A> {
  const len = as.length
  const r   = new Set<A>()
  const has = elem_(E)
  for (let i = 0; i < len; i++) {
    const a = as[i]
    if (!has(r, a)) {
      r.add(a)
    }
  }
  return r
}

export function fromArray<A>(E: P.Eq<A>): (as: ReadonlyArray<A>) => ReadonlySet<A> {
  return (as) => fromArray_(as, E)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

export function toArray<A>(O: P.Ord<A>): (set: ReadonlySet<A>) => ReadonlyArray<A> {
  return (set) => {
    const r: Array<A> = []
    set.forEach((e) => r.push(e))
    return r.sort(O.compare_)
  }
}

export function toSet<A>(s: ReadonlySet<A>): Set<A> {
  return new Set(s)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Operations
 * -------------------------------------------------------------------------------------------------
 */

export function insert_<A>(E: P.Eq<A>) {
  const elemE_ = elem_(E)
  return (set: ReadonlySet<A>, a: A) => {
    if (!elemE_(set, a)) {
      const r = new Set(set)
      r.add(a)
      return r
    } else {
      return set
    }
  }
}

export function insert<A>(E: P.Eq<A>) {
  const insertE_ = insert_(E)
  return (a: A) => (set: ReadonlySet<A>) => insertE_(set, a)
}

export function remove_<A>(E: P.Eq<A>): (set: ReadonlySet<A>, a: A) => ReadonlySet<A> {
  return (set, a) => filter_(set, (ax) => !E.equals(a)(ax))
}

export function remove<A>(E: P.Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (a) => (set) => remove_(E)(set, a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @since 1.0.0
 */
export function some_<A>(set: ReadonlySet<A>, predicate: P.Predicate<A>): boolean {
  const values = set.values()
  let e: IteratorResult<A>
  let found    = false
  while (!found && !(e = values.next()).done) {
    found = predicate(e.value)
  }
  return found
}

/**
 * @since 1.0.0
 */
export function some<A>(predicate: P.Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return (set) => some_(set, predicate)
}

/**
 * @since 1.0.0
 */
export function every_<A>(set: ReadonlySet<A>, predicate: P.Predicate<A>) {
  return not(some(not(predicate)))(set)
}

/**
 * @since 1.0.0
 */
export function every<A>(predicate: P.Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return (set) => every_(set, predicate)
}

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export function elem_<A>(E: P.Eq<A>): (set: ReadonlySet<A>, a: A) => boolean {
  return (set, a) => {
    const values = set.values()
    let e: IteratorResult<A>
    let found    = false
    while (!found && !(e = values.next()).done) {
      found = E.equals(a)(e.value)
    }
    return found
  }
}

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export function elem<A>(E: P.Eq<A>): (a: A) => (set: ReadonlySet<A>) => boolean {
  return (a) => (set) => elem_(E)(set, a)
}

/**
 * `true` if and only if every element in the first set is an element of the second set
 *
 * @since 1.0.0
 */
export function isSubset<A>(E: P.Eq<A>): (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => boolean {
  const elemE = elem(E)
  return (that) => every((a: A) => elemE(a)(that))
}

export function isEmpty<A>(set: ReadonlySet<A>): boolean {
  return set.size === 0
}

export function isNonEmpty<A>(set: ReadonlySet<A>): boolean {
  return set.size !== 0
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function compact<A>(E: P.Eq<A>): (fa: ReadonlySet<O.Option<A>>) => ReadonlySet<A> {
  return filterMap(E)(P.identity)
}

export function separate<E, A>(
  EE: P.Eq<E>,
  EA: P.Eq<A>
): (fa: ReadonlySet<E.Either<E, A>>) => readonly [ReadonlySet<E>, ReadonlySet<A>] {
  return (fa) => {
    const elemEE        = elem(EE)
    const elemEA        = elem(EA)
    const left: Set<E>  = new Set()
    const right: Set<A> = new Set()
    fa.forEach((e) => {
      switch (e._tag) {
        case 'Left':
          if (!elemEE(e.left)(left)) {
            left.add(e.left)
          }
          break
        case 'Right':
          if (!elemEA(e.right)(right)) {
            right.add(e.right)
          }
          break
      }
    })
    return [left, right]
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * P.Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<ReadonlySet<A>> {
  const subsetE = isSubset(E)
  return P.Eq((x, y) => subsetE(x)(y) && subsetE(y)(x))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: ReadonlySet<A>, refinement: P.Refinement<A, B>): ReadonlySet<B>
export function filter_<A>(fa: ReadonlySet<A>, predicate: P.Predicate<A>): ReadonlySet<A>
export function filter_<A>(fa: ReadonlySet<A>, predicate: P.Predicate<A>) {
  const values = fa.values()
  let e: IteratorResult<A>
  const r      = new Set<A>()
  while (!(e = values.next()).done) {
    const value = e.value
    if (predicate(value)) {
      r.add(value)
    }
  }
  return r
}

/**
 * @since 1.0.0
 */
export function partition_<A, B extends A>(
  fa: ReadonlySet<A>,
  refinement: P.Refinement<A, B>
): readonly [ReadonlySet<A>, ReadonlySet<B>]
export function partition_<A>(fa: ReadonlySet<A>, predicate: P.Predicate<A>): readonly [ReadonlySet<A>, ReadonlySet<A>]
export function partition_<A>(fa: ReadonlySet<A>, predicate: P.Predicate<A>) {
  const values = fa.values()
  let e: IteratorResult<A>
  const right  = new Set<A>()
  const left   = new Set<A>()
  while (!(e = values.next()).done) {
    const value = e.value
    if (predicate(value)) {
      right.add(value)
    } else {
      left.add(value)
    }
  }
  return P.tuple(left, right)
}

/**
 * @since 1.0.0
 */
export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: ReadonlySet<A>) => readonly [ReadonlySet<A>, ReadonlySet<B>]
export function partition<A>(
  predicate: P.Predicate<A>
): (fa: ReadonlySet<A>) => readonly [ReadonlySet<A>, ReadonlySet<A>]
export function partition<A>(
  predicate: P.Predicate<A>
): (fa: ReadonlySet<A>) => readonly [ReadonlySet<A>, ReadonlySet<A>] {
  return (fa) => partition_(fa, predicate)
}

/**
 * @since 1.0.0
 */
export function partitionMap_<B, C>(EB: P.Eq<B>, EC: P.Eq<C>) {
  return <A>(set: ReadonlySet<A>, f: (a: A) => E.Either<B, C>): readonly [ReadonlySet<B>, ReadonlySet<C>] => {
    const values = set.values()
    let e: IteratorResult<A>
    const left   = new Set<B>()
    const right  = new Set<C>()
    const hasB   = elem(EB)
    const hasC   = elem(EC)
    while (!(e = values.next()).done) {
      const v = f(e.value)
      switch (v._tag) {
        case 'Left':
          if (!hasB(v.left)(left)) {
            left.add(v.left)
          }
          break
        case 'Right':
          if (!hasC(v.right)(right)) {
            right.add(v.right)
          }
          break
      }
    }
    return [left, right]
  }
}

/**
 * @since 1.0.0
 */
export function partitionMap<B, C>(
  EB: P.Eq<B>,
  EC: P.Eq<C>
): <A>(f: (a: A) => E.Either<B, C>) => (set: ReadonlySet<A>) => readonly [ReadonlySet<B>, ReadonlySet<C>] {
  return (f) => (set) => partitionMap_(EB, EC)(set, f)
}

/**
 * @since 1.0.0
 */
export function filterMap_<B>(E: P.Eq<B>) {
  const elemE_ = elem_(E)
  return <A>(fa: ReadonlySet<A>, f: (a: A) => O.Option<B>) => {
    const r: Set<B> = new Set()
    fa.forEach((a) => {
      const ob = f(a)
      if (ob._tag === 'Some' && !elemE_(r, ob.value)) {
        r.add(ob.value)
      }
    })
    return r
  }
}

/**
 * @since 1.0.0
 */
export function filterMap<B>(E: P.Eq<B>) {
  const filterMapE_ = filterMap_(E)
  return <A>(f: (a: A) => O.Option<B>) =>
    (fa: ReadonlySet<A>) =>
      filterMapE_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A>(O: P.Ord<A>) {
  const toArrayO = toArray(O)
  return <B>(set: ReadonlySet<A>, b: B, f: (b: B, a: A) => B): B => A.foldl_(toArrayO(set), b, f)
}

export function foldl<A>(O: P.Ord<A>): <B>(b: B, f: (b: B, a: A) => B) => (set: ReadonlySet<A>) => B {
  return (b, f) => (set) => foldl_(O)(set, b, f)
}

export function foldMap_<A, M>(O: P.Ord<A>, M: P.Monoid<M>) {
  const toArrayO = toArray(O)
  return (fa: ReadonlySet<A>, f: (a: A) => M) => A.foldl_(toArrayO(fa), M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<A, M>(O: P.Ord<A>, M: P.Monoid<M>) {
  const foldMapOM_ = foldMap_(O, M)
  return (f: (a: A) => M) => (fa: ReadonlySet<A>) => foldMapOM_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<B>(E: P.Eq<B>) {
  return <A>(set: ReadonlySet<A>, f: (a: A) => B) => {
    const elemE = elem(E)
    const r     = new Set<B>()
    set.forEach((e) => {
      const v = f(e)
      if (!elemE(v)(r)) {
        r.add(v)
      }
    })
    return r
  }
}

export function map<B>(E: P.Eq<B>): <A>(f: (a: A) => B) => (set: ReadonlySet<A>) => Set<B> {
  return (f) => (set) => map_(E)(set, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function chain_<B>(E: P.Eq<B>): <A>(set: ReadonlySet<A>, f: (a: A) => ReadonlySet<B>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (set, f) => {
    const r = new Set<B>()
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(e)(r)) {
          r.add(e)
        }
      })
    })
    return r
  }
}

export function chain<B>(E: P.Eq<B>): <A>(f: (a: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  return (f) => (set) => chain_(E)(set, f)
}

export function flatten<A>(E: P.Eq<A>): (ma: ReadonlySet<ReadonlySet<A>>) => ReadonlySet<A> {
  const bindE = chain(E)
  return bindE(P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getUnionMonoid<A>(E: P.Eq<A>): P.Monoid<ReadonlySet<A>> {
  const unionE_ = union_(E)
  return P.Monoid<ReadonlySet<A>>((x, y) => unionE_(x, y), empty())
}

/*
 * -------------------------------------------------------------------------------------------------
 * Semigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getIntersectionSemigroup<A>(E: P.Eq<A>): P.Semigroup<ReadonlySet<A>> {
  const intersectionE_ = intersection_(E)
  return P.Semigroup((x, y) => intersectionE_(x, y))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<A>(S: P.Show<A>): P.Show<ReadonlySet<A>> {
  return {
    show: (s) => {
      let elements = ''
      s.forEach((a) => {
        elements += S.show(a) + ', '
      })
      if (elements !== '') {
        elements = elements.substring(0, elements.length - 2)
      }
      return `Set([${elements}])`
    }
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export function union_<A>(E: P.Eq<A>) {
  const elemE = elem(E)
  return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
    if (me.size === 0) {
      return that
    }
    if (that.size === 0) {
      return me
    }
    const r = new Set(me)
    that.forEach((e) => {
      if (!elemE(e)(r)) {
        r.add(e)
      }
    })
    return r
  }
}

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export function union<A>(E: P.Eq<A>) {
  const unionE_ = union_(E)
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => unionE_(me, that)
}

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export function intersection_<A>(E: P.Eq<A>): (me: ReadonlySet<A>, that: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (me, that) => {
    if (me.size === 0 || that.size === 0) {
      return empty<A>()
    }
    const r = new Set<A>()
    me.forEach((e) => {
      if (elemE(e)(that)) {
        r.add(e)
      }
    })
    return r
  }
}

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export function intersection<A>(E: P.Eq<A>) {
  const intersectionE_ = intersection_(E)
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => intersectionE_(me, that)
}

export function difference_<A>(E: P.Eq<A>) {
  const elemE_ = elem_(E)
  return (me: ReadonlySet<A>, that: ReadonlySet<A>) => filter_(me, (a) => !elemE_(that, a))
}

export function difference<A>(E: P.Eq<A>) {
  const differenceE_ = difference_(E)
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => differenceE_(me, that)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------------------------------------------
 */

export function size<A>(set: ReadonlySet<A>): number {
  return set.size
}
