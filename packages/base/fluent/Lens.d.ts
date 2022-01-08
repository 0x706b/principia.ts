import type { ReadonlyRecord } from '@principia/base/collection/immutable/Record'
import type * as HKT from '@principia/base/HKT'
import type * as L from '@principia/base/Lens'
import type { Optional, POptional } from '@principia/base/Optional'
import type { Predicate } from '@principia/base/Predicate'
import type * as P from '@principia/base/prelude'
import type { PPrism } from '@principia/base/Prism'
import type { Refinement } from '@principia/base/Refinement'
import type { PTraversal, Traversal } from '@principia/base/Traversal'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Lens: PLensStaticOps
  export interface PLens<S, T, A, B> extends L.PLens<S, T, A, B> {}
  export interface Lens<S, A> extends L.Lens<S, A> {}
}

declare module '@principia/base/Lens/core' {
  interface PLens<S, T, A, B> extends PLensOps {}
  interface Lens<S, A> extends PLensOps {}
}

interface PLensStaticOps {
  /**
   * @rewriteStatic Category from "@principia/base/Lens"
   */
  readonly Category: typeof L.Category
  /**
   * @rewriteStatic Invariant from "@principia/base/Lens"
   */
  readonly Invariant: typeof L.Invariant
  /**
   * @rewriteStatic id from "@principia/base/Lens"
   */
  readonly id: typeof L.id
}

interface PLensOps {
  /**
   * @rewrite component_ from "@principia/base/Lens"
   */
  component<S, A extends ReadonlyArray<unknown>, P extends keyof A>(this: L.Lens<S, A>, prop: P): L.Lens<S, A[P]>
  /**
   * @rewrite compose_ from "@principia/base/Lens"
   */
  compose<S, T, A, B, C, D>(this: L.PLens<S, T, A, B>, that: PPrism<A, B, C, D>): POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Lens"
   */
  compose<S, T, A, B, C, D>(this: L.PLens<S, T, A, B>, that: POptional<A, B, C, D>): POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Lens"
   */
  compose<S, T, A, B, C, D>(this: L.PLens<S, T, A, B>, that: PTraversal<A, B, C, D>): PTraversal<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Lens"
   */
  compose<S, T, A, B, C, D>(this: L.PLens<S, T, A, B>, that: L.PLens<A, B, C, D>): L.PLens<S, T, C, D>
  /**
   * @rewrite filter_ from "@principia/base/Lens"
   */
  filter<S, A, B extends A>(this: L.Lens<S, A>, refinement: Refinement<A, B>): Optional<S, B>
  /**
   * @rewrite filter_ from "@principia/base/Lens"
   */
  filter<S, A>(this: L.Lens<S, A>, predicate: Predicate<A>): Optional<S, A>
  /**
   * @rewrite fromNullable from "@principia/base/Lens"
   */
  fromNullable<S, A>(this: L.Lens<S, A>): Optional<S, NonNullable<A>>
  /**
   * @rewrite index_ from "@principia/base/Lens"
   */
  index<S, A>(this: L.Lens<S, ReadonlyArray<A>>, i: number): Optional<S, A>
  /**
   * @rewrite invmap_ from "@principia/base/Lens"
   */
  invmap<I, A, B>(this: L.Lens<I, A>, ab: (a: A) => B, ba: (b: B) => A): L.Lens<I, B>
  /**
   * @rewrite key_ from "@principia/base/Lens"
   */
  key<S, A>(this: L.Lens<S, ReadonlyRecord<string, A>>, key: string): Optional<S, A>

  // Disabled in fluent since typescript@4.5.4 - type instantiation is excessively deep and possibly infinite
  // /**
  //  * @rewrite path_ from "@principia/base/Lens"
  //  */
  // path<S, A, P extends List<string>>(this: L.Lens<S, A>, path: [...AutoPath<A, P>]): L.Lens<S, Path<A, P>>

  /**
   * @rewrite prop_ from "@principia/base/Lens"
   */
  prop<S, A, P extends keyof A>(this: L.Lens<S, A>, prop: P): L.Lens<S, A[P]>
  /**
   * @rewrite props_ from "@principia/base/Lens"
   */
  props<S, A, P extends keyof A>(this: L.Lens<S, A>, ...props: [P, P, ...Array<P>]): L.Lens<S, { [K in P]: A[K] }>
  /**
   * @rewriteConstraint traverse from "@principia/base/Lens"
   */
  traverse<S, K, Q, W, X, I, S_, R, E, A, T extends HKT.HKT, C = HKT.None>(
    this: L.Lens<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>,
    T: P.Traversable<T, C>
  ): Traversal<S, A>
}
