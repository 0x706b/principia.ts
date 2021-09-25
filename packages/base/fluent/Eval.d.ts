import type * as Ev from '@principia/base/Eval'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Eval: EvalStaticOps
  export interface Eval<A> extends Ev.Eval<A> {}
}

export interface EvalStaticOps {
  /**
   * @rewriteStatic Applicative from "@principia/base/Eval"
   */
  Applicative: typeof Ev.Applicative
  /**
   * @rewriteStatic Functor from "@principia/base/Eval"
   */
  Functor: typeof Ev.Functor
  /**
   * @rewriteStatic Monad from "@principia/base/Eval"
   */
  Monad: typeof Ev.Monad
  /**
   * @rewriteStatic MonoidalFunctor from "@principia/base/Eval"
   */
  MonoidalFunctor: typeof Ev.MonoidalFunctor
  /**
   * @rewriteStatic SemimonoidalFunctor from "@principia/base/Eval"
   */
  SemimonoidalFunctor: typeof Ev.SemimonoidalFunctor
  /**
   * @rewriteStatic always from "@principia/base/Eval"
   */
  always: typeof Ev.always
  /**
   * @rewriteStatic apS from "@principia/base/Eval"
   */
  apS: typeof Ev.apS
  /**
   * @rewriteStatic apT from "@principia/base/Eval"
   */
  apT: typeof Ev.apT
  /**
   * @rewriteStatic defer from "@principia/base/Eval"
   */
  defer: typeof Ev.defer
  /**
   * @rewriteStatic gen from "@principia/base/Eval"
   */
  gen: typeof Ev.gen
  /**
   * @rewriteStatic later from "@principia/base/Eval"
   */
  later: typeof Ev.later
  /**
   * @rewriteStatic mapN from "@principia/base/Eval"
   */
  mapN: typeof Ev.mapN_
  /**
   * @rewriteStatic now from "@principia/base/Eval"
   */
  now: typeof Ev.now
  /**
   * @rewriteStatic pure from "@principia/base/Eval"
   */
  pure: typeof Ev.pure
  /**
   * @rewriteStatic sequenceS from "@principia/base/Eval"
   */
  sequenceS: typeof Ev.sequenceS
  /**
   * @rewriteStatic sequenceT from "@principia/base/Eval"
   */
  sequenceT: typeof Ev.sequenceT
  /**
   * @rewriteStatic unit from "@principia/base/Eval"
   */
  unit: typeof Ev.unit
}
declare module '@principia/base/Eval/core' {
  interface Eval<A> {
    /**
     * @rewrite chain_ from "@principia/base/Eval"
     */
    chain<A, B>(this: Eval<A>, f: (a: A) => Eval<B>): Eval<B>

    /**
     * @rewrite cross_ from "@principia/base/Eval"
     */
    cross<A, B>(this: Eval<A>, that: Eval<B>): Eval<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Eval"
     */
    crossWith<A, B, C>(this: Eval<A>, that: Eval<B>, f: (a: A, b: B) => C): Eval<C>

    /**
     * @rewrite map_ from "@principia/base/Eval"
     */
    map<A, B>(this: Eval<A>, f: (a: A) => B): Eval<B>
  }
}

export {}
