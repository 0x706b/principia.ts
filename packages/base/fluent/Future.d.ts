import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Exit } from '@principia/base/IO/Exit'
import type { FiberId } from '@principia/base/IO/Fiber'
import type * as F from '@principia/base/IO/Future'
import type { Maybe } from '@principia/base/Maybe'

declare global {
  export const Future: FutureStaticOps
  export interface Future<E, A> extends F.Future<E, A> {}
}

interface FutureStaticOps {
  /**
   * @rewriteStatic make from "@principia/base/IO/Future"
   */
  make: typeof F.make
  /**
   * @rewriteStatic makeAs from "@principia/base/IO/Future"
   */
  makeAs: typeof F.makeAs
  /**
   * @rewriteStatic unsafeMake from "@principia/base/IO/Future"
   */
  unsafeMake: typeof F.unsafeMake
}

declare module '@principia/base/IO/Future' {
  export interface Future<E, A> {
    /**
     * @rewrite halt_ from "@principia/base/IO/Future"
     */
    halt<E, A>(this: Future<E, A>, defect: unknown): I.UIO<boolean>
    /**
     * @rewrite done_ from "@principia/base/IO/Future"
     */
    done<E, A>(this: Future<E, A>, exit: Exit<E, A>): I.UIO<boolean>
    /**
     * @rewrite fulfill_ from "@principia/base/IO/Future"
     */
    fulfill<E, A, R>(this: Future<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean>
    /**
     * @rewrite fulfillWith_ from "@principia/base/IO/Future"
     */
    fulfillWith<E, A>(this: Future<E, A>, io: I.FIO<E, A>): I.UIO<boolean>
    /**
     * @rewrite failCause_ from "@principia/base/IO/Future"
     */
    failCause<E, A>(this: Future<E, A>, cause: Cause<E>): I.UIO<boolean>
    /**
     * @rewriteGetter interrupt from "@principia/base/IO/Future"
     */
    interrupt: I.UIO<boolean>
    /**
     * @rewrite interruptAs_ from "@principia/base/IO/Future"
     */
    interruptAs<E, A>(this: Future<E, A>, id: FiberId): I.UIO<boolean>
    /**
     * @rewriteGetter isDone from "@principia/base/IO/Future"
     */
    isDone: I.UIO<boolean>
    /**
     * @rewriteGetter poll from "@principia/base/IO/Future"
     */
    poll: I.UIO<Maybe<I.FIO<E, A>>>
    /**
     * @rewrite succeed_ from "@principia/base/IO/Future"
     */
    succeed<E, A>(this: Future<E, A>, a: A): I.UIO<boolean>
  }
}
