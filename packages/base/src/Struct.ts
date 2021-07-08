/**
 * Operations on heterogeneous records
 */
import type * as HKT from './HKT'
import type { NonEmptyArray } from './NonEmptyArray'
import type { EnforceNonEmptyRecord, UnionToIntersection } from './prelude'
import type { ReadonlyRecord } from './Record'

import * as A from './Array/core'
import * as Eq from './Eq'
import * as Ev from './Eval'
import * as G from './Guard'
import { pipe } from './prelude'
import * as P from './prelude'
import * as R from './Record'
import * as S from './Show'
import * as Str from './string'

type Eq<A> = Eq.Eq<A>

/*
 * -------------------------------------------------------------------------------------------------
 * *** experimental ***
 * -------------------------------------------------------------------------------------------------
 */

type EnsureLiteral<K> = string extends K ? never : [K] extends [P.UnionToIntersection<K>] ? K : never

type TestLiteral<K> = string extends K ? unknown : [K] extends [P.UnionToIntersection<K>] ? K : unknown

type EnsureNonexistentProperty<T, K extends string> = Extract<keyof T, K> extends never ? T : never

type EnsureLiteralKeys<S> = string extends keyof S ? never : S

type EnsureLiteralTuple<A extends ReadonlyArray<unknown>> = unknown extends {
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
export function insertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: EnsureNonexistentProperty<S, K>,
  k: EnsureLiteral<K>,
  a: A
): { [P in keyof S | K]: P extends keyof S ? S[P] : A } {
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
 */
export function insertAt<K extends string, A>(
  k: EnsureLiteral<K>,
  a: A
): <S extends ReadonlyRecord<string, any>>(
  s: EnsureNonexistentProperty<S, K>
) => { [P in keyof S | K]: P extends keyof S ? S[P] : A } {
  return (s) => insertAt_(s, k, a)
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 */
export function upsertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: S,
  k: EnsureLiteral<K>,
  a: A
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A } {
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
 */
export function upsertAt<K extends string, A>(
  k: EnsureLiteral<K>,
  a: A
): <S extends ReadonlyRecord<string, any>>(
  s: S
) => { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A } {
  return (s) => upsertAt_(s, k, a)
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: S,
  k: K,
  f: (a: S[K]) => B
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
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
 */
export function modifyAt<S, K extends keyof S extends never ? string : keyof S, A, B>(
  k: keyof S extends never ? EnsureLiteral<K> : K,
  f: (a: K extends keyof S ? S[K] : A) => B
): <S1 extends { [P in K]: A }>(
  s: keyof S extends never ? S1 : S
) => K extends keyof S
  ? { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }
  : { readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, f as any) as any
}

/**
 * Effectfully map over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAtE_<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_ extends ReadonlyRecord<string, any>, K_ extends keyof S_, N extends string, K, Q, W, X, I, S, R, E, B>(
  s: S_,
  k: K_,
  f: (a: S_[K_]) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
) => HKT.Kind<
  F,
  C,
  N,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  { readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }
> {
  return (s, k, f) =>
    F.map_(f(s[k]), (b) => ({
      ...s,
      [k]: b
    }))
}

export function modifyAtE<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_, K_ extends keyof S_ extends never ? string : keyof S, N extends string, K, Q, W, X, I, S, R, E, A, B>(
  k: keyof S_ extends never ? EnsureLiteral<K_> : K_,
  f: (a: K_ extends keyof S_ ? S_[K_] : A) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
) => <S1 extends { [K in K_]: A }>(
  s: keyof S_ extends never ? S1 : S_
) => HKT.Kind<
  F,
  C,
  N,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  K_ extends keyof S_
    ? { readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }
    : {
        readonly [P in Exclude<keyof S1, K_> | K_]: P extends Exclude<keyof S1, K_> ? S1[P] : B
      }
> {
  const modifyAtEF_ = modifyAtE_(F)
  return (k, f) => (s) => modifyAtEF_(s, k as any, f as any)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: S,
  k: K,
  b: B
): { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B } {
  return modifyAt_(s, k, () => b)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt<S, K extends keyof S extends never ? string : keyof S, B>(
  k: keyof S extends never ? EnsureLiteral<K> : K,
  b: B
): <S1 extends { [P in K]: any }>(
  s: keyof S extends never ? S1 : S
) => K extends keyof S
  ? { readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }
  : { readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B } {
  return (s) => modifyAt_(s, k as any, () => b) as any
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap_<S extends ReadonlyRecord<string, any>, F extends { [K in keyof S]: (a: S[K]) => any }>(
  s: S,
  fs: F
): { readonly [K in keyof F]: ReturnType<F[K]> } {
  const keys    = R.keys(s)
  const mut_out = {} as any
  for (let i = 0; i < keys.length; i++) {
    const key    = keys[i]
    mut_out[key] = fs[key](s[key])
  }
  return mut_out
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap<
  S,
  F extends keyof S extends never ? Record<string, (a: any) => any> : { [K in keyof S]: (a: S[K]) => any }
>(
  fs: keyof F extends never ? EnsureLiteralKeys<F> : F
): <S1 extends { [K in keyof F]: Parameters<F[K]>[0] }>(
  s: keyof S extends never ? S1 : S
) => { readonly [K in keyof F]: ReturnType<F[K]> } {
  return (s) => hmap_(s, fs as any) as any
}

export function pick_<S extends ReadonlyRecord<string, any>>(s: S) {
  return <K extends ReadonlyArray<keyof S>>(...keys: K): { [P in K[number]]: S[P] } => {
    const mut_out = {} as Pick<S, K[number]>
    for (let i = 0; i < keys.length; i++) {
      const key    = keys[i]
      mut_out[key] = s[key]
    }
    return mut_out
  }
}

export function pick<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: keyof S extends never ? S1 : S
) => K[number] extends keyof S ? { readonly [P in K[number]]: S[P] } : { readonly [P in K[number]]: S1[P] } {
  return (s) => pick_(s)(...(keys as any)) as any
}

export function omit_<S extends ReadonlyRecord<string, any>>(s: S) {
  return <K extends ReadonlyArray<keyof S>>(...keys: K): { [P in Exclude<keyof S, K[number]>]: S[P] } => {
    const newKeys = A.difference_(Str.Eq)(R.keys(s), keys as ReadonlyArray<string>)
    const mut_out = {} as Omit<S, K[number]>
    for (let i = 0; i < newKeys.length; i++) {
      const key    = newKeys[i]
      mut_out[key] = s[key]
    }
    return mut_out
  }
}

export function omit<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: keyof S extends never ? S1 : S
) => K[number] extends keyof S
  ? { readonly [P in Exclude<keyof S, K[number]>]: S[P] }
  : { readonly [P in Exclude<keyof S1, K[number]>]: S1[P] } {
  return (s) => omit_(s)(...(keys as any)) as any
}

function _intersect<A extends ReadonlyArray<Record<string, any>>>(
  ...members: A
): Ev.Eval<UnionToIntersection<A[number]>> {
  if (A.isEmpty(members)) {
    return Ev.now({} as any)
  }
  return Ev.foldl_(members.slice(1), members[0] as UnionToIntersection<A[number]>, (mut_out, a) =>
    Ev.defer(() => {
      let computation = Ev.now(mut_out)
      for (const k in a) {
        const ak = a[k]
        if (R.UnknownRecordGuard.is(ak) && R.UnknownRecordGuard.is(mut_out[k])) {
          computation = pipe(
            computation,
            Ev.chain((mut_out) =>
              Ev.map_(_intersect(mut_out[k], ak), (intersected) => {
                mut_out[k] = intersected
                return mut_out
              })
            )
          )
        } else {
          computation = pipe(
            computation,
            Ev.map((mut_out) => {
              mut_out[k] = ak
              return mut_out
            })
          )
        }
      }
      return computation
    })
  )
}

export function intersect<A extends ReadonlyArray<Record<string, any>>>(...members: A): UnionToIntersection<A[number]> {
  return _intersect(...members).value
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

type EnsureTagEq<T extends string, Members extends Record<string, Eq<any>>> = Members &
  {
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
  return P.pipe(R.UnknownRecordGuard, G.compose(getKeysGuard(properties)), G.compose(getStrictGuard(properties)))
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
  return P.pipe(R.UnknownRecordGuard, G.compose(getStrictPartialGuard(properties)))
}

export function getIntersectionGuard<M extends NonEmptyArray<G.Guard<any, Record<string, any>>>>(
  ...members: M
): G.Guard<UnionToIntersection<G.InputOf<M[number]>>, UnionToIntersection<G.TypeOf<M[number]>>> {
  return G.Guard((i): i is UnionToIntersection<G.TypeOf<M[number]>> =>
    A.foldl_(members, true as boolean, (b, g) => b && g.is(i))
  )
}

type EnsureTagGuard<T extends string, Members extends Record<string, G.Guard<any, any>>> = Members &
  {
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
        R.ifoldl_(a, A.empty<string>(), (b, k, _) => A.append_(b, `${k}: unknown`)),
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
        R.ifoldl(A.empty<string>(), (b, k, s) => A.append_(b, `${k}: ${s.show(a[k])}`)),
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
        R.ifoldl(A.empty<string>(), (b, k, s) => (a[k] == null ? b : A.append_(b, `${k}: ${s.show(a[k])}`))),
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

type EnsureTagShow<T extends string, M extends Record<string, S.Show<any>>> = M &
  {
    [K in keyof M]: S.Show<{ [tag in T]: K }>
  }

export function getSumShow<T extends string>(
  tag: T
): <M extends Record<string, S.Show<Record<string, any>>>>(
  members: EnforceNonEmptyRecord<EnsureTagShow<T, M>>
) => S.Show<{ [K in keyof M]: S.TypeOf<M[K]> }[keyof M]> {
  return (members) => S.Show((a: Record<string, any>) => members[a[tag]].show(a))
}
