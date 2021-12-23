import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type * as L from '@principia/base/Layer'
import type * as M from '@principia/base/Managed'

/* eslint typescript-sort-keys/interface: "error" */

declare global {
  export const Layer: LayerStaticOps
  export interface Layer<R, E, A> extends L.Layer<R, E, A> {}
  export interface ULayer<A> extends L.Layer<unknown, never, A> {}
  export interface FLayer<E, A> extends L.Layer<unknown, E, A> {}
  export interface URLayer<R, A> extends L.Layer<R, never, A> {}
}

interface LayerStaticOps {
  /**
   * @rewriteStatic bracketConstructor from "@principia/base/Layer"
   */
  bracketConstructor: typeof L.bracketConstructor
  /**
   * @rewriteStatic bracketConstructorIO from "@principia/base/Layer"
   */
  bracketConstructorIO: typeof L.bracketConstructorIO
  /**
   * @rewriteStatic defer from "@principia/base/Layer"
   */
  defer: typeof L.defer
  /**
   * @rewriteStatic fail from "@principia/base/Layer"
   */
  fail: typeof L.fail
  /**
   * @rewriteStatic fromConstructor from "@principia/base/Layer"
   */
  fromConstructor: typeof L.fromConstructor
  /**
   * @rewriteStatic fromConstructorIO from "@principia/base/Layer"
   */
  fromConstructorIO: typeof L.fromConstructorIO
  /**
   * @rewriteStatic fromConstructorManaged from "@principia/base/Layer"
   */
  fromConstructorManaged: typeof L.fromConstructorManaged
  /**
   * @rewriteStatic fromFunctionIO from "@principia/base/Layer"
   */
  fromFunctionIO: typeof L.fromFunctionIO
  /**
   * @rewriteStatic fromFunctionManaged from "@principia/base/Layer"
   */
  fromFunctionManaged: typeof L.fromFunctionManaged
  /**
   * @rewriteStatic fromIO from "@principia/base/Layer"
   */
  fromIO: typeof L.fromIO
  /**
   * @rewriteStatic fromManaged from "@principia/base/Layer"
   */
  fromManaged: typeof L.fromManaged
  /**
   * @rewriteStatic fromRawFunction from "@principia/base/Layer"
   */
  fromRawFunction: typeof L.fromRawFunction
  /**
   * @rewriteStatic fromRawFunctionIO from "@principia/base/Layer"
   */
  fromRawFunctionIO: typeof L.fromRawFunctionIO
  /**
   * @rewriteStatic fromRawFunctionManaged from "@principia/base/Layer"
   */
  fromRawFunctionManaged: typeof L.fromRawFunctionManaged
  /**
   * @rewriteStatic fromRawIO from "@principia/base/Layer"
   */
  fromRawIO: typeof L.fromRawIO
  /**
   * @rewriteStatic fromRawManaged from "@principia/base/Layer"
   */
  fromRawManaged: typeof L.fromRawManaged
  /**
   * @rewriteStatic identity from "@principia/base/Layer"
   */
  identity: typeof L.identity
  /**
   * @rewriteStatic restrict from "@principia/base/Layer"
   */
  restrict: typeof L.restrict
  /**
   * @rewriteStatic succeed from "@principia/base/Layer"
   */
  succeed: typeof L.succeed
}

declare module '@principia/base/Layer/core' {
  export interface Layer<R, E, A> {
    /**
     * @rewrite and_ from "@principia/base/Layer"
     */
    and<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, right: Layer<R1, E1, A1>): Layer<R & R1, E1 | E, A & A1>
    /**
     * @rewrite andSeq_ from "@principia/base/Layer"
     */
    andSeq<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, that: Layer<R1, E1, A1>): Layer<R & R1, E1 | E, A & A1>
    /**
     * @rewrite andThen_ from "@principia/base/Layer"
     */
    andThen<R, E, A, E1, A1>(this: Layer<R, E, A>, to: Layer<A, E1, A1>): Layer<R, E | E1, A1>
    /**
     * @rewriteGetter build from "@principia/base/Layer"
     */
    build: M.Managed<R, E, A>
    /**
     * @rewrite catchAll_ from "@principia/base/Layer"
     */
    catchAll<R, E, A, R1, E1, B>(
      this: Layer<R, E, A>,
      handler: Layer<readonly [R1, E], E1, B>
    ): Layer<R & R1, E1, A | B>
    /**
     * @rewrite chain_ from "@principia/base/Layer"
     */
    chain<R, E, A, R1, E1, B>(this: Layer<R, E, A>, f: (a: A) => Layer<R1, E1, B>): Layer<R & R1, E1 | E, B>
    /**
     * @rewrite compose_ from "@principia/base/Layer"
     */
    compose<R, E, A, R0, E1>(this: Layer<R, E, A>, from: Layer<R0, E1, R>): Layer<R0, E | E1, A>
    /**
     * @rewrite cross_ from "@principia/base/Layer"
     */
    cross<R, E, A, R1, E1, B>(this: Layer<R, E, A>, right: Layer<R1, E1, B>): Layer<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossC_ from "@principia/base/Layer"
     */
    crossC<R, E, A, R1, E1, B>(this: Layer<R, E, A>, right: Layer<R1, E1, B>): Layer<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossWith_ from "@principia/base/Layer"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: Layer<R, E, A>,
      fb: Layer<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Layer<R & R1, E | E1, C>
    /**
     * @rewrite crossWithC_ from "@principia/base/Layer"
     */
    crossWithC<R, E, A, R1, E1, B, C>(
      this: Layer<R, E, A>,
      fb: Layer<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Layer<R & R1, E | E1, C>
    /**
     * @rewriteGetter fresh from "@principia/base/Layer"
     */
    fresh: Layer<R, E, A>
    /**
     * @rewrite launch from "@principia/base/Layer"
     */
    launch<E, A>(this: Layer<unknown, E, A>): I.FIO<E, never>
    /**
     * @rewrite map_ from "@principia/base/Layer"
     */
    map<R, E, A, B>(this: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B>
    /**
     * @rewrite mapError_ from "@principia/base/Layer"
     */
    mapError<R, E, A, E1>(this: Layer<R, E, A>, f: (e: E) => E1): Layer<R, E1, A>
    /**
     * @rewrite matchLayer_ from "@principia/base/Layer"
     */
    matchLayer<R, E, A, R1, E1, B, E2, C>(
      this: Layer<R, E, A>,
      onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
      onSuccess: Layer<A, E2, C>
    ): Layer<R & R1, E1 | E2, B | C>
    /**
     * @rewriteGetter memoize from "@principia/base/Layer"
     */
    memoize: M.Managed<unknown, never, Layer<R, E, A>>
    /**
     * @rewriteGetter orDie from "@principia/base/Layer"
     */
    orDie: Layer<R, never, A>
    /**
     * @rewrite orElse_ from "@principia/base/Layer"
     */
    orElse<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, that: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A | A1>
  }
}
