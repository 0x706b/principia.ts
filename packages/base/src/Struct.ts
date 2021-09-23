/**
 * Operations on heterogeneous records
 */
import type * as HKT from './HKT'
import type * as P from './prelude'
import type { UnionToIntersection } from './prelude'
import type { ReadonlyRecord } from './Record'

import * as A from './Array/core'
import * as HR from './HeterogeneousRecord'
import { isObject } from './util/predicates'

export const StructTypeId = Symbol.for('@principia/base/Struct')
export type StructTypeId = typeof StructTypeId

export const StructStore   = Symbol.for('@principia/base/Struct/StructStore')
export const StructOperate = Symbol.for('@principia/base/Struct/StructOperate')

export class Struct<A> {
  readonly [StructTypeId]: StructTypeId = StructTypeId;
  readonly [StructStore]: A

  constructor(store: A) {
    this[StructStore] = store
  }

  [StructOperate]<B extends Record<string, any>>(f: (_: A) => B): Struct<B> {
    return new Struct(f(this[StructStore]))
  }
}

export function isStruct(u: unknown): u is Struct<Record<string, unknown>> {
  return isObject(u) && StructTypeId in u
}

export function fromRecord<R extends ReadonlyRecord<string, any>>(record: R): Struct<R> {
  return new Struct(record)
}

export function toRecord<S extends ReadonlyRecord<string, any>>(struct: Struct<S>): S {
  return struct[StructStore]
}

/*
 * -------------------------------------------------------------------------------------------------
 * *** experimental ***
 * -------------------------------------------------------------------------------------------------
 */

export type EnsureLiteral<K> = string extends K ? never : [K] extends [P.UnionToIntersection<K>] ? K : never

export type TestLiteral<K> = string extends K ? unknown : [K] extends [P.UnionToIntersection<K>] ? K : unknown

export type EnsureNonexistentProperty<T, K extends string> = Extract<keyof T, K> extends never ? T : never

export type EnsureLiteralKeys<S> = string extends keyof S ? never : S

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
export function insertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: Struct<EnsureNonexistentProperty<S, K>>,
  k: EnsureLiteral<K>,
  a: A
): Struct<{ [P in keyof S | K]: P extends keyof S ? S[P] : A }> {
  // @ts-expect-error
  return s[StructOperate](HR.insertAt(k, a))
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
  s: Struct<EnsureNonexistentProperty<S, K>>
) => Struct<{ [P in keyof S | K]: P extends keyof S ? S[P] : A }> {
  return (s) => insertAt_(s, k, a)
}

/**
 * Replaces a value in a struct if it exists, or inserts if it does not
 *
 * @category combinators
 * @since 1.0.0
 */
export function upsertAt_<S extends ReadonlyRecord<string, any>, K extends string, A>(
  s: Struct<S>,
  k: EnsureLiteral<K>,
  a: A
): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A }> {
  // @ts-expect-error
  return s[StructOperate](HR.upsertAt(k, a))
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
  s: Struct<S>
) => Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A }> {
  return (s) => upsertAt_(s, k, a)
}

/**
 * Maps over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: Struct<S>,
  k: K,
  f: (a: S[K]) => B
): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }> {
  // @ts-expect-error
  return s[StructOperate](HR.modifyAt(k, f))
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
  s: Struct<keyof S extends never ? S1 : S>
) => K extends keyof S
  ? Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }>
  : Struct<{ readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B }> {
  return (s) => modifyAt_(s, k as any, f as any) as any
}

/**
 * Effectfully map over one value of a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function modifyAtF_<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_ extends ReadonlyRecord<string, any>, K_ extends keyof S_, K, Q, W, X, I, S, R, E, B>(
  s: Struct<S_>,
  k: K_,
  f: (a: S_[K_]) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
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
  Struct<{ readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }>
> {
  // @ts-expect-error
  return (s, k, f) => s[StructOperate](HR.modifyAtE(F)(k, f))
}

export function modifyAtF<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): <S_, K_ extends keyof S_ extends never ? string : keyof S, K, Q, W, X, I, S, R, E, A, B>(
  k: keyof S_ extends never ? EnsureLiteral<K_> : K_,
  f: (a: K_ extends keyof S_ ? S_[K_] : A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
) => <S1 extends { [K in K_]: A }>(
  s: Struct<keyof S_ extends never ? S1 : S_>
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
  K_ extends keyof S_
    ? Struct<{ readonly [P in Exclude<keyof S_, K_> | K_]: P extends Exclude<keyof S_, K_> ? S_[P] : B }>
    : Struct<
        {
          readonly [P in Exclude<keyof S1, K_> | K_]: P extends Exclude<keyof S1, K_> ? S1[P] : B
        }
      >
> {
  const modifyAtEF_ = modifyAtF_(F)
  return (k, f) => (s) => modifyAtEF_(s, k as any, f as any)
}

/**
 * Replaces a value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function updateAt_<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
  s: Struct<S>,
  k: K,
  b: B
): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }> {
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
  s: Struct<keyof S extends never ? S1 : S>
) => K extends keyof S
  ? Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }>
  : Struct<{ readonly [P in Exclude<keyof S1, K> | K]: P extends Exclude<keyof S1, K> ? S1[P] : B }> {
  return (s) => modifyAt_(s, k as any, () => b) as any
}

/**
 * Maps over every value in a struct
 *
 * @category combinators
 * @since 1.0.0
 */
export function hmap_<S extends ReadonlyRecord<string, any>, F extends { [K in keyof S]: (a: S[K]) => any }>(
  s: Struct<S>,
  fs: F
): Struct<{ readonly [K in keyof F]: ReturnType<F[K]> }> {
  // @ts-expect-error
  return s[StructOperate](hmap(fs))
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
  s: Struct<keyof S extends never ? S1 : S>
) => Struct<{ readonly [K in keyof F]: ReturnType<F[K]> }> {
  return (s) => hmap_(s, fs as any) as any
}

export function pick_<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
  s: Struct<S>,
  ...keys: K
): Struct<{ [P in K[number]]: S[P] }> {
  // @ts-expect-error
  return s[StructOperate](HR.pick(...keys))
}

export function pick<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: Struct<keyof S extends never ? S1 : S>
) => Struct<K[number] extends keyof S ? { readonly [P in K[number]]: S[P] } : { readonly [P in K[number]]: S1[P] }> {
  return (s) => pick_(s, ...(keys as any)) as any
}

export function omit_<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
  s: Struct<S>,
  ...keys: K
): Struct<{ [P in Exclude<keyof S, K[number]>]: S[P] }> {
  // @ts-expect-error
  return s[StructOperate](HR.omit(...keys))
}

export function omit<S, K extends ReadonlyArray<keyof S extends never ? string : keyof S>>(
  ...keys: keyof S extends never ? EnsureLiteralTuple<K> : K
): <S1 extends { [P in K[number]]: any }>(
  s: Struct<keyof S extends never ? S1 : S>
) => K[number] extends keyof S
  ? Struct<{ readonly [P in Exclude<keyof S, K[number]>]: S[P] }>
  : Struct<{ readonly [P in Exclude<keyof S1, K[number]>]: S1[P] }> {
  return (s) => omit_(s, ...(keys as any)) as any
}

export function intersect<A extends ReadonlyArray<Struct<Record<string, any>> | Record<string, any>>>(
  ...members: A
): Struct<UnionToIntersection<{ [K in keyof A]: A[K] extends Struct<infer S> ? S : A[K] }[number]>> {
  // @ts-expect-error
  return fromRecord(HR.intersect(...A.map_(members, (s) => (isStruct(s) ? toRecord(s) : s))))
}
