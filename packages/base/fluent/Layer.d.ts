import type { Cause } from '@principia/base/IO/Cause'
import type * as I from '@principia/base/IO/IO'
import type * as M from '@principia/base/IO/Managed'

declare module '@principia/base/IO/Layer/core' {
  export interface Layer<R, E, A> {
    /**
     * @rewrite and_ from "@principia/base/IO/Layer"
     */
    and<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, right: Layer<R1, E1, A1>): Layer<R & R1, E1 | E, A & A1>
    /**
     * @rewrite andSeq_ from "@principia/base/IO/Layer"
     */
    andSeq<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, that: Layer<R1, E1, A1>): Layer<R & R1, E1 | E, A & A1>
    /**
     * @rewrite andThen_ from "@principia/base/IO/Layer"
     */
    andThen<R, E, A, E1, A1>(this: Layer<R, E, A>, to: Layer<A, E1, A1>): Layer<R, E | E1, A1>
    /**
     * @rewriteGetter build from "@principia/base/IO/Layer"
     */
    build: M.Managed<R, E, A>
    /**
     * @rewrite catchAll_ from "@principia/base/IO/Layer"
     */
    catchAll<R, E, A, R1, E1, B>(
      this: Layer<R, E, A>,
      handler: Layer<readonly [R1, E], E1, B>
    ): Layer<R & R1, E1, A | B>
    /**
     * @rewrite chain_ from "@principia/base/IO/Layer"
     */
    chain<R, E, A, R1, E1, B>(this: Layer<R, E, A>, f: (a: A) => Layer<R1, E1, B>): Layer<R & R1, E1 | E, B>
    /**
     * @rewrite compose_ from "@principia/base/IO/Layer"
     */
    compose<R, E, A, R0, E1>(this: Layer<R, E, A>, from: Layer<R0, E1, R>): Layer<R0, E | E1, A>
    /**
     * @rewrite cross_ from "@principia/base/IO/Layer"
     */
    cross<R, E, A, R1, E1, B>(this: Layer<R, E, A>, right: Layer<R1, E1, B>): Layer<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossPar_ from "@principia/base/IO/Layer"
     */
    crossPar<R, E, A, R1, E1, B>(this: Layer<R, E, A>, right: Layer<R1, E1, B>): Layer<R & R1, E | E1, readonly [A, B]>
    /**
     * @rewrite crossWith_ from "@principia/base/IO/Layer"
     */
    crossWith<R, E, A, R1, E1, B, C>(
      this: Layer<R, E, A>,
      fb: Layer<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Layer<R & R1, E | E1, C>
    /**
     * @rewrite crossWithPar_ from "@principia/base/IO/Layer"
     */
    crossWithPar<R, E, A, R1, E1, B, C>(
      this: Layer<R, E, A>,
      fb: Layer<R1, E1, B>,
      f: (a: A, b: B) => C
    ): Layer<R & R1, E | E1, C>
    /**
     * @rewriteGetter fresh from "@principia/base/IO/Layer"
     */
    fresh: Layer<R, E, A>
    /**
     * @rewrite launch from "@principia/base/IO/Layer"
     */
    launch<E, A>(this: Layer<unknown, E, A>): I.FIO<E, never>
    /**
     * @rewrite map_ from "@principia/base/IO/Layer"
     */
    map<R, E, A, B>(this: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B>
    /**
     * @rewrite mapError_ from "@principia/base/IO/Layer"
     */
    mapError<R, E, A, E1>(this: Layer<R, E, A>, f: (e: E) => E1): Layer<R, E1, A>
    /**
     * @rewrite matchLayer_ from "@principia/base/IO/Layer"
     */
    matchLayer<R, E, A, R1, E1, B, E2, C>(
      this: Layer<R, E, A>,
      onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
      onSuccess: Layer<A, E2, C>
    ): Layer<R & R1, E1 | E2, B | C>
    /**
     * @rewriteGetter memoize from "@principia/base/IO/Layer"
     */
    memoize: M.Managed<unknown, never, Layer<R, E, A>>
    /**
     * @rewriteGetter orDie from "@principia/base/IO/Layer"
     */
    orDie: Layer<R, never, A>
    /**
     * @rewrite orElse_ from "@principia/base/IO/Layer"
     */
    orElse<R, E, A, R1, E1, A1>(this: Layer<R, E, A>, that: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A | A1>
  }
}
