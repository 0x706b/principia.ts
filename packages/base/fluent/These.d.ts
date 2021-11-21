import type * as HKT from '@principia/base/HKT'
import type { Applicative, Monoid } from '@principia/base/prelude'
import type * as Th from '@principia/base/These'

declare global {
  export const These: TheseStaticOps
  export type These<E, A> = Th.These<E, A>
}

declare module '@principia/base/internal/These' {
  interface Left<E> extends TheseOps {}
  interface Right<A> extends TheseOps {}
  interface Both<E, A> extends TheseOps {}
}

export interface TheseStaticOps {
  /**
   * @rewriteStatic Left from "@principia/base/These"
   */
  Left: typeof Th.Left
  /**
   * @rewriteStatic left from "@principia/base/These"
   */
  left: typeof Th.left
  /**
   * @rewriteStatic Right from "@principia/base/These"
   */
  Right: typeof Th.Right
  /**
   * @rewriteStatic right from "@principia/base/These"
   */
  right: typeof Th.right
  /**
   * @rewriteStatic Both from "@principia/base/These"
   */
  Both: typeof Th.Both
  /**
   * @rewriteStatic both from "@principia/base/These"
   */
  both: typeof Th.both
  /**
   * @rewriteStatic unit from "@principia/base/These"
   */
  unit: typeof Th.unit
  /**
   * @rewriteStatic getMonad from "@principia/base/These"
   */
  getMonad: typeof Th.getMonad
  /**
   * @rewriteStatic getMonadExcept from "@principia/base/These"
   */
  getMonadExcept: typeof Th.getMonadExcept
  /**
   * @rewriteStatic getSemigroup from "@principia/base/These"
   */
  getSemigroup: typeof Th.getSemigroup
  /**
   * @rewriteStatic getEq from "@principia/base/These"
   */
  getEq: typeof Th.getEq
  /**
   * @rewriteStatic getSemimonoidal from "@principia/base/These"
   */
  getSemimonoidal: typeof Th.getSemimonoidal
  /**
   * @rewriteStatic getApplicativeExcept from "@principia/base/These"
   */
  getApplicativeExcept: typeof Th.getApplicativeExcept
  /**
   * @rewriteStatic getApplicative from "@principia/base/These"
   */
  getApplicative: typeof Th.getApplicativeExcept
  /**
   * @rewriteStatic getApply from "@principia/base/These"
   */
  getApply: typeof Th.getApply
  /**
   * @rewriteStatic getMonoidal from "@principia/base/These"
   */
  getMonoidal: typeof Th.getMonoidal
}
export interface TheseOps {
  /**
   * @rewrite isBoth from "@principia/base/These"
   */
  isBoth<E, A>(this: Th.These<E, A>): this is Th.Both<E, A>
  /**
   * @rewrite isLeft from "@principia/base/These"
   */
  isLeft<E, A>(this: Th.These<E, A>): this is Th.Left<E>
  /**
   * @rewrite isRight from "@principia/base/These"
   */
  isRight<E, A>(this: Th.These<E, A>): this is Th.Right<A>
  /**
   * @rewrite getLeft_ from "@principia/base/These"
   */
  getLeft<E, A>(this: Th.These<E, A>): Maybe<E>
  /**
   * @rewrite getLeftOnly_ from "@principia/base/These"
   */
  getLeftOnly<E, A>(this: Th.These<E, A>): Maybe<E>
  /**
   * @rewrite getRight_ from "@principia/base/These"
   */
  getRight<E, A>(this: Th.These<E, A>): Maybe<A>
  /**
   * @rewrite getRightOnly_ from "@principia/base/These"
   */
  getRightOnly<E, A>(this: Th.These<E, A>): Maybe<A>
  /**
   * @rewrite match_ from "@principia/base/These"
   */
  match<E, A, B, C, D>(
    this: Th.These<E, A>,
    onLeft: (e: E) => B,
    onRight: (a: A) => C,
    onBoth: (e: E, a: A) => D
  ): B | C | D
  /**
   * @rewrite toTuple_ from "@principia/base/These"
   */
  toTuple<E, A>(this: Th.These<E, A>, e: E, a: A): readonly [E, A]
  /**
   * @rewrite map_ from "@principia/base/These"
   */
  map<E, A, B>(this: Th.These<E, A>, f: (a: A) => B): Th.These<E, B>
  /**
   * @rewrite bimap_ from "@principia/base/These"
   */
  bimap<E, A, G, B>(this: Th.These<E, A>, f: (e: E) => G, g: (a: A) => B): Th.These<G, B>
  /**
   * @rewrite mapLeft_ from "@principia/base/These"
   */
  mapLeft<E, A, G>(this: Th.These<E, A>, f: (e: E) => G): Th.These<G, A>
  /**
   * @rewrite swap from "@principia/base/These"
   */
  swap<E, A>(this: Th.These<E, A>): Th.These<A, E>
  /**
   * @rewrite foldl_ from "@principia/base/These"
   */
  foldl<E, A, B>(this: Th.These<E, A>, b: B, f: (b: B, a: A) => B): B
  /**
   * @rewriteConstraint foldMap_ from "@principia/base/These"
   */
  foldMap<E, A, M>(this: Th.These<E, A>, M: Monoid<M>): (f: (a: A) => M) => M
  /**
   * @rewrite foldr_ from "@principia/base/These"
   */
  foldr<E, A, B>(this: Th.These<E, A>, b: B, f: (a: A, b: B) => B): B
  /**
   * @rewriteConstraint traverse_ from "@principia/base/These"
   */
  traverse<E, A, F extends HKT.HKT, C = HKT.Auto>(
    this: Th.These<E, A>,
    A: Applicative<F, C>
  ): <K, Q, W, X, I, S, R, E1, B>(
    f: (a: A) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, B>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E1, Th.These<E, B>>
}
