import type { EnsureLiteral, EnsureNonexistentProperty } from '@principia/base/collection/immutable/HeterogeneousRecord'
import type { ReadonlyRecord } from '@principia/base/collection/immutable/Record'
import type { Struct } from '@principia/base/collection/immutable/Struct'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/prelude'
import type { UnionToIntersection } from '@principia/base/prelude'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  /**
   * @rewrite identity from "smart:identity"
   */
  function Struct<A extends Record<string, any>>(struct: A): Struct<A>
}

declare module '@principia/base/collection/immutable/Struct' {
  interface Struct<A> {
    /**
     * @rewrite hmap_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    hmap<S extends ReadonlyRecord<string, any>, F extends { [K in keyof S]: (a: S[K]) => any }>(
      this: Struct<S>,
      fs: F
    ): Struct<{ readonly [K in keyof F]: ReturnType<F[K]> }>
    /**
     * @rewrite insertAt_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    insertAt<S extends ReadonlyRecord<string, any>, K extends string, A>(
      this: Struct<EnsureNonexistentProperty<S, K>>,
      k: EnsureLiteral<K>,
      a: A
    ): Struct<{ [P in keyof S | K]: P extends keyof S ? S[P] : A }>
    /**
     * @rewrite intersect from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    intersect<
      S extends ReadonlyRecord<string, any>,
      A extends ReadonlyArray<Struct<Record<string, any>> | Record<string, any>>
    >(
      this: Struct<S>,
      ...members: A
    ): Struct<UnionToIntersection<S | { [K in keyof A]: A[K] extends Struct<infer St> ? St : A[K] }[number]>>
    /**
     * @rewrite modifyAt_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    modifyAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
      this: Struct<S>,
      k: K,
      f: (a: S[K]) => B
    ): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }>
    /**
     * @rewriteConstraint modifyAtF_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    modifyAtF<S_ extends ReadonlyRecord<string, any>, F extends HKT.HKT, C = HKT.Auto>(
      this: Struct<S_>,
      F: P.Functor<F, C>
    ): <K_ extends keyof S_, K, Q, W, X, I, S, R, E, B>(
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
    >
    /**
     * @rewrite omit_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    omit<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
      this: Struct<S>,
      ...keys: K
    ): Struct<{ [P in Exclude<keyof S, K[number]>]: S[P] }>
    /**
     * @rewrite pick_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    pick<S extends ReadonlyRecord<string, any>, K extends ReadonlyArray<keyof S>>(
      this: Struct<S>,
      ...keys: K
    ): Struct<{ [P in K[number]]: S[P] }>
    /**
     * @rewrite identity from smart:identity
     */
    toRecord<S extends ReadonlyRecord<string, any>>(this: Struct<S>): S
    /**
     * @rewrite updateAt_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    updateAt<S extends ReadonlyRecord<string, any>, K extends keyof S, B>(
      this: Struct<S>,
      k: K,
      b: B
    ): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : B }>
    /**
     * @rewrite upsertAt_ from "@principia/base/collection/immutable/HeterogeneousRecord"
     */
    upsertAt<S extends ReadonlyRecord<string, any>, K extends string, A>(
      this: Struct<S>,
      k: EnsureLiteral<K>,
      a: A
    ): Struct<{ readonly [P in Exclude<keyof S, K> | K]: P extends Exclude<keyof S, K> ? S[P] : A }>
  }
}
