import type { Optional, POptional } from '@principia/base/Optional'
import type { Predicate } from '@principia/base/Predicate'
import type * as Pr from '@principia/base/Prism'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement } from '@principia/base/Refinement'
import type { PTraversal } from '@principia/base/Traversal'

/* eslint typescript-sort-keys/interface: "error" */

declare module '@principia/base/Prism/core' {
  interface PPrism<S, T, A, B> extends PPrismOps {}
  interface Prism<S, A> extends PPrismOps {}
}

declare global {
  export const Prism: PPrismStaticOps
  interface PPrism<S, T, A, B> extends Pr.PPrism<S, T, A, B> {}
  interface Prism<S, A> extends Pr.Prism<S, A> {}
}

export interface PPrismStaticOps {
  /**
   * @rewriteStatic Category from "@principia/base/Prism"
   */
  readonly Category: typeof Pr.Category
  /**
   * @rewriteStatic Invariant from "@principia/base/Prism"
   */
  readonly Invariant: typeof Pr.Invariant
  /**
   * @rewriteStatic fromNullable from "@principia/base/Prism"
   */
  readonly fromNullable: typeof Pr.fromNullable
  /**
   * @rewriteStatic fromPredicate from "@principia/base/Prism"
   */
  readonly fromPredicate: typeof Pr.fromPredicate
  /**
   * @rewriteStatic id from "@principia/base/Prism"
   */
  readonly id: typeof Pr.id
  /**
   * @rewriteStatic newtype from "@principia/base/Prism"
   */
  readonly newtype: typeof Pr.newtype
}

export interface PPrismOps {
  /**
   * @rewrite component_ from "@principia/base/Prism"
   */
  component<S, A extends ReadonlyArray<unknown>, P extends keyof A>(this: Pr.Prism<S, A>, props: P): Optional<S, A[P]>
  /**
   * @rewrite compose_ from "@principia/base/Prism"
   */
  compose<S, T, A, B, C, D>(this: Pr.PPrism<S, T, A, B>, that: PLens<A, B, C, D>): POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Prism"
   */
  compose<S, T, A, B, C, D>(this: Pr.PPrism<S, T, A, B>, that: POptional<A, B, C, D>): POptional<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Prism"
   */
  compose<S, T, A, B, C, D>(this: Pr.PPrism<S, T, A, B>, that: PTraversal<A, B, C, D>): PTraversal<S, T, C, D>
  /**
   * @rewrite compose_ from "@principia/base/Prism"
   */
  compose<S, T, A, B, C, D>(this: Pr.PPrism<S, T, A, B>, that: Pr.PPrism<A, B, C, D>): Pr.PPrism<S, T, C, D>
  /**
   * @rewrite filter_ from "@principia/base/Prism"
   */
  filter<S, A, B extends A>(this: Pr.Prism<S, A>, refinement: Refinement<A, B>): Pr.Prism<S, B>
  /**
   * @rewrite filter_ from "@principia/base/Prism"
   */
  filter<S, A>(this: Pr.Prism<S, A>, predicate: Predicate<A>): Pr.Prism<S, A>
  /**
   * @rewrite index_ from "@principia/base/Prism"
   */
  index<S, A>(this: Pr.Prism<S, ReadonlyArray<A>>, i: number): Optional<S, A>
  /**
   * @rewrite invmap_ from "@principia/base/Prism"
   */
  invmap<S, A, B>(this: Pr.Prism<S, A>, ab: (a: A) => B, ba: (b: B) => A): Pr.Prism<S, B>
  /**
   * @rewrite key_ from "@principia/base/Prism"
   */
  key<S, A>(this: Pr.Prism<S, ReadonlyRecord<string, A>>, key: string): Optional<S, A>
  /**
   * @rewrite nullable from "@principia/base/Prism"
   */
  nullable<S, A>(this: Pr.Prism<S, A>): Pr.Prism<S, NonNullable<A>>
  /**
   * @rewrite prop_ from "@principia/base/Prism"
   */
  prop<S, A, P extends keyof A>(this: Pr.Prism<S, A>, prop: P): Optional<S, A[P]>
  /**
   * @rewrite props_ from "@principia/base/Prism"
   */
  props<S, A, P extends keyof A>(this: Pr.Prism<S, A>, ...props: [P, P, ...Array<P>]): Optional<S, { [K in P]: A[K] }>
}
