import type { GetFn, Getter } from './Getter'
import type { LensURI } from './Modules'
import type { Optional, POptional } from './Optional'
import type { PPrism } from './Prism'
import type { ReplaceFn_ } from './Setter'
import type { PTraversal, Traversal } from './Traversal'
import type * as O from '@principia/base/Maybe'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { List } from '@principia/typelevel/List'
import type { AutoPath, Path } from '@principia/typelevel/Object'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import * as HKT from '@principia/base/HKT'
import * as P from '@principia/base/prelude'

import * as At from './At'
import * as _ from './internal'
import * as Ix from './Ix'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface PLens<S, T, A, B> extends POptional<S, T, A, B>, Getter<S, A> {}

export interface PLensMin<S, T, A, B> {
  readonly get: GetFn<S, A>
  readonly replace_: ReplaceFn_<S, T, B>
}

export const PLens: <S, T, A, B>(_: PLensMin<S, T, A, B>) => PLens<S, T, A, B> = _.makePLens

export interface Lens<S, A> extends PLens<S, S, A, A> {}

export const Lens: <S, A>(_: PLensMin<S, S, A, A>) => Lens<S, A> = _.makePLens

export interface LensF extends HKT.HKT {
  readonly type: Lens<this['I'], this['A']>
  readonly variance: {
    I: '_'
    A: '+'
  }
}

/*
 * -------------------------------------------
 * Compositions
 * -------------------------------------------
 */

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenPrism_<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PPrism<A, B, C, D>): POptional<S, T, C, D> {
  return _.optionalAndThenOptional(sa, ab)
}

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenPrism<A, B, C, D>(
  ab: PPrism<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThenPrism_(sa, ab)
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenOptional_<S, T, A, B, C, D>(
  sa: PLens<S, T, A, B>,
  ab: POptional<A, B, C, D>
): POptional<S, T, C, D> {
  return _.optionalAndThenOptional(sa, ab)
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function andThenOptional<A, B, C, D>(
  ab: POptional<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => POptional<S, T, C, D> {
  return (sa) => andThenOptional_(sa, ab)
}

export function andThenTraversal_<S, T, A, B, C, D>(
  sa: PLens<S, T, A, B>,
  ab: PTraversal<A, B, C, D>
): PTraversal<S, T, C, D> {
  return _.traversalAndThenTraversal(sa, ab)
}

export function andThenTraversal<A, B, C, D>(
  ab: PTraversal<A, B, C, D>
): <S, T>(sa: PLens<S, T, A, B>) => PTraversal<S, T, C, D> {
  return (sa) => andThenTraversal_(sa, ab)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function id<S, T = S>(): PLens<S, T, S, T> {
  return PLens({
    get: identity,
    replace_: (_, t) => t
  })
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function andThen_<S, T, A, B, C, D>(sa: PLens<S, T, A, B>, ab: PLens<A, B, C, D>): PLens<S, T, C, D> {
  return PLens({
    get: flow(sa.get, ab.get),
    replace_: (s, d) => sa.modify_(s, ab.replace(d))
  })
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function andThen<A, B, C, D>(ab: PLens<A, B, C, D>): <S, T>(sa: PLens<S, T, A, B>) => PLens<S, T, C, D> {
  return (sa) => andThen_(sa, ab)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category = P.Category<LensF>({
  id,
  andThen_
})

/*
 * -------------------------------------------
 * Invariant
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap_<I, A, B>(ea: Lens<I, A>, ab: (a: A) => B, ba: (b: B) => A): Lens<I, B> {
  return PLens({
    get: flow(ea.get, ab),
    replace_: (i, b) => ea.replace_(i, ba(b))
  })
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Lens<I, A>) => Lens<I, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<LensF> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Return a `Optional` from a `Lens` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fromNullable<S, A>(sa: Lens<S, A>): Optional<S, NonNullable<A>> {
  return andThenPrism_(sa, _.prismFromNullable<A>())
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A> {
  return andThenPrism(_.prismFromPredicate(predicate))
}

export function prop_<S, A, P extends keyof A>(lens: Lens<S, A>, prop: P): Lens<S, A[P]> {
  return PLens({
    get: (s) => lens.get(s)[prop],
    replace_: (s, ap) => {
      const oa = lens.get(s)
      if (ap === oa[prop]) {
        return s
      }
      return lens.replace_(s, Object.assign({}, oa, { [prop]: ap }))
    }
  })
}

/**
 * Return a `Lens` from a `Lens` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: Lens<S, A>) => Lens<S, A[P]> {
  return (lens) => prop_(lens, prop)
}

function nestPath<A>(p: ReadonlyArray<string>, a: A): {} {
  const out = {}
  let view  = out
  let last  = ''

  for (let i = 0; i < p.length; i++) {
    view[p[i]] = {}
    if (!(i === p.length - 1)) {
      view = view[p[i]]
    }
    last = p[i]
  }

  view[last] = a
  return out
}

/**
 * Return a `Lens` from a `Lens` and a path
 *
 * @category Combinators
 * @since 1.0.0
 */
export function path_<S, A, P extends List<string>>(lens: Lens<S, A>, path: [...AutoPath<A, P>]): Lens<S, Path<A, P>> {
  return PLens({
    get: (s) =>
      pipe(
        path,
        A.foldl(lens.get(s), (b, p) => b[p as string])
      ) as Path<A, P>,
    replace_: (s, a) => {
      const os = lens.get(s)
      const oa = pipe(
        path,
        A.foldl(os, (b, p) => b[p as string])
      )
      if (a === oa) {
        return s
      }
      return lens.replace_(s, Object.assign({}, os, nestPath(path, a)))
    }
  })
}

/**
 * Return a `Lens` from a `Lens` and a path
 *
 * @category Combinators
 * @since 1.0.0
 */
export function path<A, P extends List<string>>(
  path: [...AutoPath<A, P>]
): <S>(lens: Lens<S, A>) => Lens<S, Path<A, P>> {
  return (lens) =>
    PLens({
      get: (s) =>
        pipe(
          path,
          A.foldl(lens.get(s), (b, p) => b[p as string])
        ) as Path<A, P>,
      replace_: (s, a) => {
        const os = lens.get(s)
        const oa = pipe(
          path,
          A.foldl(os, (b, p) => b[p as string])
        )
        if (a === oa) {
          return s
        }
        return lens.replace_(s, Object.assign({}, os, nestPath(path, a)))
      }
    })
}

export function props_<S, A, P extends keyof A>(
  lens: Lens<S, A>,
  ...props: [P, P, ...Array<P>]
): Lens<
  S,
  {
    [K in P]: A[K]
  }
> {
  return PLens({
    get: (s) => {
      const a = lens.get(s)
      const r: {
        [K in P]?: A[K]
      } = {}
      for (const k of props) {
        r[k] = a[k]
      }
      return r as any
    },
    replace_: (s, a) => {
      const oa = lens.get(s)
      for (const k of props) {
        if (a[k] !== oa[k]) {
          return lens.replace_(s, Object.assign({}, oa, a))
        }
      }
      return s
    }
  })
}

/**
 * Return a `Lens` from a `Lens` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: Lens<S, A>) => Lens<S, { [K in P]: A[K] }> {
  return (sa) => props_(sa, ...props)
}

export function component_<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
  lens: Lens<S, A>,
  prop: P
): Lens<S, A[P]> {
  return PLens({
    get: (s) => lens.get(s)[prop],
    replace_: (s, ap) => {
      const oa = lens.get(s)
      if (ap === oa[prop]) {
        return s
      }
      const copy: A = oa.slice() as any
      copy[prop]    = ap
      return lens.replace_(s, copy)
    }
  })
}

/**
 * Return a `Lens` from a `Lens` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: Lens<S, A>) => Lens<S, A[P]> {
  return (sa) => component_(sa, prop)
}

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number) {
  return <S, A>(sa: Lens<S, ReadonlyArray<A>>): Optional<S, A> => pipe(sa, andThenOptional(Ix.array<A>().index(i)))
}

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string) {
  return <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Optional<S, A> =>
    pipe(sa, andThenOptional(Ix.record<A>().index(key)))
}

/**
 * Return a `Lens` from a `Lens` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 */
export function atKey(key: string) {
  return <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Lens<S, O.Maybe<A>> =>
    pipe(sa, andThen(At.atRecord<A>().at(key)))
}

/**
 * Return a `Optional` from a `Lens` focused on the `Just` of a `Maybe` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const just: <S, A>(soa: Lens<S, O.Maybe<A>>) => Optional<S, A> = andThenPrism(_.prismJust())

/**
 * Return a `Optional` from a `Lens` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Lens<S, E.Either<E, A>>) => Optional<S, A> = andThenPrism(_.prismRight())

/**
 * Return a `Optional` from a `Lens` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Lens<S, E.Either<E, A>>) => Optional<S, E> = andThenPrism(_.prismLeft())

/**
 * Return a `Traversal` from a `Lens` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.HKT, C = HKT.None>(
  T: P.Traversable<T, C>
): <S, K, Q, W, X, I, S_, R, E, A>(sta: Lens<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>) => Traversal<S, A> {
  return flow(andThenTraversal(_.fromTraversable(T)()))
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(predicate: Predicate<A>) => <S>(sa: Lens<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
  _.findFirst,
  andThenOptional
)
