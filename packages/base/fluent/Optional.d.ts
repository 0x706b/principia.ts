import type * as HKT from '@principia/base/HKT'
import type * as Op from '@principia/base/Optional'
import type { Predicate } from '@principia/base/Predicate'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement } from '@principia/base/Refinement'
import type { Traversable } from '@principia/base/Traversable'
import type { PTraversal, Traversal } from '@principia/base/Traversal'

/* eslint typescript-sort-keys/interface: "error" */
declare global {
  export const Optional: POptionalStaticOps
  export interface PLens<S, T, A, B> extends Op.POptional<S, T, A, B> {}
  export interface Lens<S, A> extends Op.Optional<S, A> {}
}

declare module '@principia/base/Optional/core' {
  interface POptional<S, T, A, B> extends POptionalOps {}
  interface Optional<S, A> extends POptionalOps {}
}

export interface POptionalStaticOps {
  readonly Category: typeof Op.Category
  readonly Invariant: typeof Op.Invariant
  readonly fromFind: typeof Op.fromFind
  readonly fromNullable: typeof Op.fromNullable
  readonly id: typeof Op.id
}

export interface POptionalOps {
  /**
   * @rewrite component_ from "@principia/base/Optional"
   */
  component<S, A extends ReadonlyArray<unknown>, P extends keyof A>(
    this: Op.Optional<S, A>,
    prop: P
  ): Op.Optional<S, A[P]>
  /**
   * @rewrite compose_ from "@principia/base/Optional"
   */
  compose<S, T, A, B, C, D>(this: Op.POptional<S, T, A, B>, that: Op.POptional<A, B, C, D>): Op.POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Optional"
   */
  compose<S, T, A, B, C, D>(this: Op.POptional<S, T, A, B>, that: PPrism<A, B, C, D>): Op.POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Optional"
   */
  compose<S, T, A, B, C, D>(this: Op.POptional<S, T, A, B>, that: PLens<A, B, C, D>): Op.POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Optional"
   */
  compose<S, T, A, B, C, D>(this: Op.POptional<S, T, A, B>, that: PTraversal<A, B, C, D>): PTraversal<S, T, C, D>
  /**
   * @rewrite filter_ from "@principia/base/Optional"
   */
  filter<S, A, B extends A>(this: Op.Optional<S, A>, refinement: Refinement<A, B>): Op.Optional<S, B>
  /**
   * @rewrite filter_ from "@principia/base/Optional"
   */
  filter<S, A>(this: Op.Optional<S, A>, predicate: Predicate<A>): Op.Optional<S, A>
  /**
   * @rewrite fromNullable from "@principia/base/Optional"
   */
  fromNullable<S, A>(this: Op.Optional<S, A>): Op.Optional<S, NonNullable<A>>
  /**
   * @rewrite index_ from "@principia/base/Optional"
   */
  index<S, A>(this: Op.Optional<S, ReadonlyArray<A>>, i: number): Op.Optional<S, A>
  /**
   * @rewrite invmap_ from "@principia/base/Optional"
   */
  invmap<I, A, B>(this: Op.Optional<I, A>, ab: (a: A) => B, ba: (b: B) => A): Op.Optional<I, B>
  /**
   * @rewrite key_ from "@principia/base/Optional"
   */
  key<S, A>(this: Op.Optional<S, ReadonlyRecord<string, A>>, key: string): Op.Optional<S, A>

  /**
   * @rewrite prop_ from "@principia/base/Optional"
   */
  prop<S, A, P extends keyof A>(this: Op.Optional<S, A>, prop: P): Op.Optional<S, A[P]>
  /**
   * @rewrite props_ from "@principia/base/Optional"
   */
  props<S, A, P extends keyof A>(
    this: Op.Optional<S, A>,
    ...props: [P, P, ...Array<P>]
  ): Op.Optional<S, { [K in P]: A[K] }>
  /**
   * @rewriteConstraint traverse from "@principia/base/Optional"
   */
  traverse<S, K, Q, W, X, I, S_, R, E, A, T extends HKT.HKT, C = HKT.None>(
    this: Op.Optional<S, HKT.Kind<T, C, K, Q, W, X, I, S_, R, E, A>>,
    T: Traversable<T, C>
  ): Traversal<S, A>
}
