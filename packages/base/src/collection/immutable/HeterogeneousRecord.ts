/**
 * Operations on heterogeneous records
 */
import type * as HKT from '../../HKT'
import type { EnforceNonEmptyRecord, UnionToIntersection } from '../../prelude'
import type { NonEmptyArray } from './NonEmptyArray'
import type { ReadonlyRecord } from './Record'
import type { List } from '@principia/typelevel/List'
import type { AutoPath, Path } from '@principia/typelevel/Object'

import * as Eq from '../../Eq'
import * as Ev from '../../Eval'
import { pipe, unsafeCoerce } from '../../function'
import * as G from '../../Guard'
import * as L from '../../Lens/core'
import * as P from '../../prelude'
import * as S from '../../Show'
import * as Str from '../../string'
import * as A from './Array/core'
import * as R from './Record'

type Eq<A> = Eq.Eq<A>

/*
 * -------------------------------------------------------------------------------------------------
 * *** experimental ***
 * -------------------------------------------------------------------------------------------------
 */

export type EnsureLiteral<N> = string extends N ? never : [N] extends [P.UnionToIntersection<N>] ? N : never

export type TestLiteral<N> = string extends N ? unknown : [N] extends [P.UnionToIntersection<N>] ? N : unknown

export type EnsureNonexistentProperty<T, N extends string> = Extract<keyof T, N> extends never ? T : never

export type EnsureLiteralKeys<O> = string extends keyof O ? never : O

export type EnsureLiteralTuple<A extends ReadonlyArray<unknown>> = unknown extends {
  [K in keyof A]: A[K] extends string ? TestLiteral<A[K]> : unknown
}[number]
  ? never
  : A

/*
 * -------------------------------------------------------------------------------------------------
 * operations
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Inserts a key value pair into a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function insertAt_<O extends ReadonlyRecord<string, any>, N extends string, A>(
  s: EnsureNonexistentProperty<O, N>,
  k: EnsureLiteral<N>,
  a: A
): { [P in keyof O | N]: P extends keyof O ? O[P] : A } {
  return {
    ...s,
    [k]: a
  }
}

/**
 * Inserts a key value pair into a struct
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst insertAt_
 */
export function insertAt<N extends string, A>(
  k: EnsureLiteral<N>,
  a: A
): <O extends ReadonlyRecord<string, any>>(
  s: EnsureNonexistentProperty<O, N>
) => { [P in keyof O | N]: P extends keyof O ? O[P] : A } {
  return (s) => insertAt_(s, k, a)
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 */
export function upsertAt_<O extends ReadonlyRecord<string, any>, N extends string, A>(
  s: O,
  k: EnsureLiteral<N>,
  a: A
): { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : A } {
  if (R.has_(s, k) && s[k] === a) {
    return s
  }
  return {
    ...s,
    [k]: a
  }
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst upsertAt_
 */
export function upsertAt<N extends string, A>(
  k: EnsureLiteral<N>,
  a: A
): <O extends ReadonlyRecord<string, any>>(
  s: O
) => { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : A } {
  return (s) => upsertAt_(s, k, a)
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt_<O extends ReadonlyRecord<string, any>, N extends keyof O, B>(
  s: O,
  k: N,
  f: (a: O[N]) => B
): { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B } {
  return {
    ...s,
    [k]: f(s[k])
  }
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst modifyAt_
 */
export function modifyAt<O, N extends keyof O extends never ? string : keyof O, A, B>(
  k: keyof O extends never ? EnsureLiteral<N> : N,
  f: (a: N extends keyof O ? O[N] : A) => B
): <S1 extends { [P in N]: A }>(
  s: keyof O extends never ? S1 : O
) => N extends keyof O
  ? { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B }
  : { readonly [P in Exclude<keyof S1, N> | N]: P extends Exclude<keyof S1, N> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, f as any) as any
}

/**
 * Effectfully map over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAtE_<F extends HKT.HKT, C = HKT.None>(
  F: P.Functor<F, C>
): <O extends ReadonlyRecord<string, any>, N extends keyof O, K, Q, W, X, I, S, R, E, B>(
  s: O,
  k: N,
  f: (a: O[N]) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
) => HKT.Kind<
  F,
  C,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B }
> {
  return (s, k, f) =>
    F.map_(f(s[k]), (b) => ({
      ...s,
      [k]: b
    }))
}

/**
 * @dataFirst modifyAtE_
 */
export function modifyAtE<F extends HKT.HKT, C = HKT.None>(
  F: P.Functor<F, C>
): <O, N extends keyof O extends never ? string : keyof S, K, Q, W, X, I, S, R, E, A, B>(
  k: keyof O extends never ? EnsureLiteral<N> : N,
  f: (a: N extends keyof O ? O[N] : A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
) => <S1 extends { [K in N]: A }>(
  s: keyof O extends never ? S1 : O
) => HKT.Kind<
  F,
  C,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  N extends keyof O
    ? { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B }
    : {
        readonly [P in Exclude<keyof S1, N> | N]: P extends Exclude<keyof S1, N> ? S1[P] : B
      }
> {
  const modifyAtEF_ = modifyAtE_(F)
  return (k, f) => (s) => unsafeCoerce(modifyAtEF_(s, k as any, f as any))
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt_<O extends ReadonlyRecord<string, any>, N extends keyof O, B>(
  s: O,
  k: N,
  b: B
): { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B } {
  return modifyAt_(s, k, () => b)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst updateAt_
 */
export function updateAt<O, N extends keyof O extends never ? string : keyof O, B>(
  k: keyof O extends never ? EnsureLiteral<N> : N,
  b: B
): <S1 extends { [P in N]: any }>(
  s: keyof O extends never ? S1 : O
) => N extends keyof O
  ? { readonly [P in Exclude<keyof O, N> | N]: P extends Exclude<keyof O, N> ? O[P] : B }
  : { readonly [P in Exclude<keyof S1, N> | N]: P extends Exclude<keyof S1, N> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, () => b) as any
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap_<O extends ReadonlyRecord<string, any>, F extends { [N in keyof O]: (a: O[N]) => any }>(
  s: O,
  fs: F
): { readonly [K in keyof F]: ReturnType<F[K]> } {
  const keys = R.keys(s)
  const out  = {} as any
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    out[key]  = fs[key](s[key])
  }
  return out
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 *
 * @dataFirst hmap_
 */
export function hmap<
  O,
  F extends keyof O extends never ? Record<string, (a: any) => any> : { [N in keyof O]: (a: O[N]) => any }
>(
  fs: keyof F extends never ? EnsureLiteralKeys<F> : F
): <S1 extends { [K in keyof F]: Parameters<F[K]>[0] }>(
  s: keyof O extends never ? S1 : O
) => { readonly [K in keyof F]: ReturnType<F[K]> } {
  return (s) => hmap_(s, fs as any) as any
}

export function pick_<O extends ReadonlyRecord<string, any>>(s: O) {
  return <K extends ReadonlyArray<keyof O>>(...keys: K): { [P in K[number]]: O[P] } => {
    const out = {} as Pick<O, K[number]>
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      out[key]  = s[key]
    }
    return out
  }
}

/**
 * @dataFirst pick_
 */
export function pick<O, N extends ReadonlyArray<keyof O extends never ? string : keyof O>>(
  ...keys: keyof O extends never ? EnsureLiteralTuple<N> : N
): <S1 extends { [P in N[number]]: any }>(
  s: keyof O extends never ? S1 : O
) => N[number] extends keyof O ? { readonly [P in N[number]]: O[P] } : { readonly [P in N[number]]: S1[P] } {
  return (s) => pick_(s)(...(keys as any)) as any
}

export function omit_<O extends ReadonlyRecord<string, any>>(s: O) {
  return <Ns extends ReadonlyArray<keyof O>>(...keys: Ns): { [P in Exclude<keyof O, Ns[number]>]: O[P] } => {
    const newKeys = A.difference_(Str.Eq)(R.keys(s), keys as ReadonlyArray<string>)
    const out     = {} as Omit<O, Ns[number]>
    for (let i = 0; i < newKeys.length; i++) {
      const key = newKeys[i]
      out[key]  = s[key]
    }
    return out
  }
}

/**
 * @dataFirst omit_
 */
export function omit<O, Ns extends ReadonlyArray<keyof O extends never ? string : keyof O>>(
  ...keys: keyof O extends never ? EnsureLiteralTuple<Ns> : Ns
): <S1 extends { [P in Ns[number]]: any }>(
  s: keyof O extends never ? S1 : O
) => Ns[number] extends keyof O
  ? { readonly [P in Exclude<keyof O, Ns[number]>]: O[P] }
  : { readonly [P in Exclude<keyof S1, Ns[number]>]: S1[P] } {
  return (s) => omit_(s)(...(keys as any)) as any
}

function _intersect<A extends ReadonlyArray<Record<string, any>>>(
  ...members: A
): Ev.Eval<UnionToIntersection<A[number]>> {
  if (A.isEmpty(members)) {
    return Ev.now({} as any)
  }
  return Ev.foldl_(members.slice(1), members[0] as UnionToIntersection<A[number]>, (out, a) =>
    Ev.defer(() => {
      let computation = Ev.now(out)
      for (const k in a) {
        const ak = a[k]
        if (R.UnknownRecordGuard.is(ak) && R.UnknownRecordGuard.is(out[k])) {
          computation = pipe(
            computation,
            Ev.chain((out) =>
              Ev.map_(_intersect(out[k], ak), (intersected) => {
                out[k] = intersected
                return out
              })
            )
          )
        } else {
          computation = pipe(
            computation,
            Ev.map((out) => {
              out[k] = ak
              return out
            })
          )
        }
      }
      return computation
    })
  )
}

export function intersect<A extends ReadonlyArray<Record<string, any>>>(...members: A): UnionToIntersection<A[number]> {
  return Ev.run(_intersect(...members))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Lens
 * -------------------------------------------------------------------------------------------------
 */

export function getPropL<A extends Record<string, any>>() {
  return <P extends keyof A>(prop: P): L.Lens<A, A[P]> =>
    L.PLens({
      get: (s) => s[prop],
      set_: (s, ap) => {
        if (ap === s[prop]) {
          return s
        }
        return Object.assign({}, s, { [prop]: ap })
      }
    })
}

export function propL_<S, A, P extends keyof A>(sa: L.Lens<S, A>, prop: P): L.Lens<S, A[P]> {
  return L.compose_(sa, getPropL<A>()(prop))
}

/**
 * @dataFirst propL_
 */
export function propL<A, P extends keyof A>(prop: P): <S>(sa: L.Lens<S, A>) => L.Lens<S, A[P]> {
  return (sa) => propL_(sa, prop)
}

export function getPropsL<A extends Record<string, any>>() {
  return <P extends keyof A>(...props: [P, P, ...Array<P>]): L.Lens<A, { [K in P]: A[K] }> =>
    L.PLens({
      get: (a) => {
        const r: { [K in P]?: A[K] } = {}
        for (const k of props) {
          r[k] = a[k]
        }
        return r as any
      },
      set_: (s, a) => {
        for (const k of props) {
          if (a[k] !== s[k]) {
            return Object.assign({}, s, a)
          }
        }
        return s
      }
    })
}

export function propsL_<S, A, P extends keyof A>(
  sa: L.Lens<S, A>,
  ...props: [P, P, ...Array<P>]
): L.Lens<S, { [K in P]: A[K] }> {
  return L.compose_(sa, getPropsL<A>()(...props))
}

/**
 * @dataFirst propsL_
 */
export function propsL<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(sa: L.Lens<S, A>) => L.Lens<S, { [K in P]: A[K] }> {
  return (sa) => propsL_(sa, ...props)
}

function nestPath<A>(p: NonEmptyArray<string>, a: A): {} {
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
export function pathL_<S, A, P extends List<string>>(
  sa: L.Lens<S, A>,
  path: [...AutoPath<A, P>]
): L.Lens<S, Path<A, P>> {
  return L.PLens({
    get: (s) =>
      pipe(
        path,
        A.foldl(sa.get(s), (b, p) => b[p as string])
      ) as Path<A, P>,
    set_: (s, a) => {
      const os = sa.get(s)
      const oa = pipe(
        path,
        A.foldl(os, (b, p) => b[p as string])
      )
      if (a === oa) {
        return s
      }
      return sa.set_(s, Object.assign({}, os, A.isNonEmpty(path) ? nestPath(path, a) : a))
    }
  })
}

/**
 * Return a `Lens` from a `Lens` and a path
 *
 * @category Combinators
 * @since 1.0.0
 *
 * @dataFirst pathL_
 */
export function pathL<A, P extends List<string>>(
  path: [...AutoPath<A, P>]
): <S>(lens: L.Lens<S, A>) => L.Lens<S, Path<A, P>> {
  return (sa) =>
    L.PLens({
      get: (s) =>
        pipe(
          path,
          A.foldl(sa.get(s), (b, p) => b[p as string])
        ) as Path<A, P>,
      set_: (s, a) => {
        const os = sa.get(s)
        const oa = pipe(
          path,
          A.foldl(os, (b, p) => b[p as string])
        )
        if (a === oa) {
          return s
        }
        return sa.set_(s, Object.assign({}, os, A.isNonEmpty(path) ? nestPath(path, a) : a))
      }
    })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getKeysEq<P extends Record<string, any>>(_: P): Eq<Record<keyof P, unknown>> {
  return R.getEq(Eq.any)
}

export function getEq<P extends Record<string, P.Eq<any>>>(
  properties: P
): Eq<Readonly<{ [K in keyof P]: Eq.TypeOf<P[K]> }>> {
  return P.Eq((x, y) => {
    for (const k in properties) {
      if (!properties[k].equals_(x[k], y[k])) {
        return false
      }
    }
    return true
  })
}

export function getPartialEq<P extends Record<string, P.Eq<any>>>(
  properties: P
): Eq<Partial<{ readonly [K in keyof P]: Eq.TypeOf<P[K]> }>> {
  return P.Eq((x, y) => {
    for (const k in properties) {
      const xk = x[k]
      const yk = y[k]
      if (!(xk === undefined || yk === undefined ? xk === yk : properties[k].equals_(xk, yk))) {
        return false
      }
    }
    return true
  })
}

export function getIntersectionEq<M extends NonEmptyArray<Eq<Record<string, any>>>>(
  ...members: M
): Eq<UnionToIntersection<Eq.TypeOf<M[number]>>>
export function getIntersectionEq(...members: ReadonlyArray<Eq<Record<string, any>>>): Eq<Record<string, any>> {
  return P.Eq((x, y) => A.foldl_(members, true as boolean, (b, a) => b && a.equals_(x, y)))
}

type EnsureTagEq<T extends string, Members extends Record<string, Eq<any>>> = Members & {
  [K in keyof Members]: Eq<{ [tag in T]: K }>
}

export function getSumEq<T extends string>(
  tag: T
): <M extends Record<string, Eq<Record<string, any>>>>(
  members: EnforceNonEmptyRecord<EnsureTagEq<T, M>>
) => Eq<Eq.TypeOf<M[keyof M]>> {
  return (members) =>
    P.Eq((x, y) => {
      const vx = x[tag]
      const vy = y[tag]
      if (vx !== vy) {
        return false
      }
      return members[vx].equals_(x, y)
    })
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guard
 * -------------------------------------------------------------------------------------------------
 */

export function getKeysGuard<P extends Record<string, any>>(properties: P): G.Guard<unknown, Record<keyof P, unknown>> {
  return G.compose_(
    R.UnknownRecordGuard,
    G.Guard((u): u is Record<keyof P, unknown> => {
      for (const key in properties) {
        if (!(key in u)) {
          return false
        }
      }
      return true
    })
  )
}

export function getStrictGuard<P extends Record<string, G.AnyGuard>>(
  properties: P
): G.Guard<{ readonly [K in keyof P]: G.InputOf<P[K]> }, { readonly [K in keyof P]: G.TypeOf<P[K]> }> {
  return G.Guard((r): r is { readonly [K in keyof P]: G.TypeOf<P[K]> } => {
    for (const key in properties) {
      if (!properties[key].is(r[key])) {
        return false
      }
    }
    return true
  })
}

export function getGuard<P extends Record<string, G.AnyUGuard>>(
  properties: P
): G.Guard<unknown, { [K in keyof P]: G.TypeOf<P[K]> }>
export function getGuard(properties: Record<string, G.AnyUGuard>): G.Guard<unknown, Record<string, any>> {
  return pipe(R.UnknownRecordGuard, G.compose(getKeysGuard(properties)), G.compose(getStrictGuard(properties)))
}

export function getStrictPartialGuard<P extends Record<string, G.AnyGuard>>(
  properties: P
): G.Guard<
  Partial<{ readonly [K in keyof P]: G.InputOf<P[K]> }>,
  Partial<{ readonly [K in keyof P]: G.TypeOf<P[K]> }>
> {
  return G.Guard((r): r is Partial<{ [K in keyof P]: G.TypeOf<P[K]> }> => {
    for (const key in properties) {
      const v = r[key]
      if (v !== undefined && !properties[key].is(v)) {
        return false
      }
    }
    return true
  })
}

export function getPartialGuard<P extends Record<string, G.Guard<unknown, any>>>(
  properties: P
): G.Guard<unknown, Partial<{ [K in keyof P]: G.TypeOf<P[K]> }>>
export function getPartialGuard(properties: Record<string, G.AnyUGuard>): G.Guard<unknown, any> {
  return pipe(R.UnknownRecordGuard, G.compose(getStrictPartialGuard(properties)))
}

export function getIntersectionGuard<M extends NonEmptyArray<G.Guard<any, Record<string, any>>>>(
  ...members: M
): G.Guard<UnionToIntersection<G.InputOf<M[number]>>, UnionToIntersection<G.TypeOf<M[number]>>> {
  return G.Guard((i): i is UnionToIntersection<G.TypeOf<M[number]>> =>
    A.foldl_(members, true as boolean, (b, g) => b && g.is(i))
  )
}

type EnsureTagGuard<T extends string, Members extends Record<string, G.Guard<any, any>>> = Members & {
  [K in keyof Members]: G.Guard<any, { [tag in T]: K }>
}

export function getStrictSumGuard<T extends string>(tag: T) {
  return <M extends Record<string, G.Guard<any, Record<string, any>>>>(
    members: EnforceNonEmptyRecord<EnsureTagGuard<T, M>>
  ): G.Guard<G.InputOf<M[keyof M]>, G.TypeOf<M[keyof M]>> =>
    G.Guard((i): i is { readonly [K in keyof M]: G.TypeOf<M[K]> }[keyof M] => {
      const v = i[tag]
      if (v in members) {
        return members[v].is(i)
      }
      return false
    })
}

export function getSumGuard<T extends string>(
  tag: T
): <M extends Record<string, G.Guard<unknown, Record<string, any>>>>(
  members: EnforceNonEmptyRecord<EnsureTagGuard<T, M>>
) => G.Guard<unknown, G.TypeOf<M[keyof M]>>
export function getSumGuard(
  tag: string
): (members: Record<string, G.Guard<unknown, Record<string, any>>>) => G.Guard<unknown, Record<string, any>> {
  return (members) => pipe(R.UnknownRecordGuard, G.compose(getStrictSumGuard(tag)(members)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getKeysShow<P extends Record<string, unknown>>(_: P): S.Show<Record<keyof P, unknown>> {
  return S.Show(
    (a) =>
      `{ ${pipe(
        R.ifoldl_(a, A.empty<string>(), (k, b, _) => A.append_(b, `${k}: unknown`)),
        A.join(', ')
      )} }`
  )
}

export function getShow<P extends Record<string, S.Show<any>>>(
  properties: P
): S.Show<{ [K in keyof P]: S.TypeOf<P[K]> }> {
  return S.Show(
    (a) =>
      `{ ${pipe(
        properties,
        R.ifoldl(A.empty<string>(), (k, b, s) => A.append_(b, `${k}: ${s.show(a[k])}`)),
        A.join(', ')
      )} }`
  )
}

export function getPartialShow<P extends Record<string, S.Show<any>>>(
  properties: P
): S.Show<Partial<{ [K in keyof P]: S.TypeOf<P[K]> }>> {
  return S.Show(
    (a) =>
      `${pipe(
        properties,
        R.ifoldl(A.empty<string>(), (k, b, s) => (a[k] == null ? b : A.append_(b, `${k}: ${s.show(a[k])}`))),
        A.join(', ')
      )}`
  )
}

export function getIntersectionShow<M extends NonEmptyArray<S.Show<Record<string, any>>>>(
  ...members: M
): S.Show<UnionToIntersection<S.TypeOf<M[number]>>> {
  return S.Show((a) =>
    pipe(
      members,
      A.foldl(A.empty<string>(), (b, s) => A.append_(b, s.show(a as Record<string, any>))),
      A.join(' & ')
    )
  )
}

type EnsureTagShow<T extends string, M extends Record<string, S.Show<any>>> = M & {
  [K in keyof M]: S.Show<{ [tag in T]: K }>
}

export function getSumShow<T extends string>(
  tag: T
): <M extends Record<string, S.Show<Record<string, any>>>>(
  members: EnforceNonEmptyRecord<EnsureTagShow<T, M>>
) => S.Show<{ [K in keyof M]: S.TypeOf<M[K]> }[keyof M]> {
  return (members) => S.Show((a: Record<string, any>) => members[a[tag]].show(a))
}
