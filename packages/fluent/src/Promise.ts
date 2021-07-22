import type { Cause } from '@principia/base/Cause'
import type { Exit } from '@principia/base/Exit'
import type { FiberId } from '@principia/base/Fiber'
import type * as I from '@principia/base/IO'
import type { Option } from '@principia/base/Option'

declare module '@principia/base/Promise' {
  export interface Promise<E, A> {
    /**
     * @rewrite halt_ from "@principia/base/Promise"
     */
    halt(defect: unknown): I.UIO<boolean>
    /**
     * @rewrite done_ from "@principia/base/Promise"
     */
    done(exit: Exit<E, A>): I.UIO<boolean>
    /**
     * @rewrite fulfill_ from "@principia/base/Promise"
     */
    fulfill<R>(io: I.IO<R, E, A>): I.IO<R, never, boolean>
    /**
     * @rewrite fulfillWith_ from "@principia/base/Promise"
     */
    fulfillWith<E, A>(io: I.FIO<E, A>): I.UIO<boolean>
    /**
     * @rewrite failCause_ from "@principia/base/Promise"
     */
    failCause(cause: Cause<E>): I.UIO<boolean>
    /**
     * @rewriteGetter interrupt from "@principia/base/Promise"
     */
    interrupt: I.UIO<boolean>
    /**
     * @rewrite interruptAs_ from "@principia/base/Promise"
     */
    interruptAs(id: FiberId): I.UIO<boolean>
    /**
     * @rewriteGetter isDone from "@principia/base/Promise"
     */
    isDone: I.UIO<boolean>
    /**
     * @rewriteGetter poll from "@principia/base/Promise"
     */
    poll: I.UIO<Option<I.FIO<E, A>>>
    /**
     * @rewrite succeed_ from "@principia/base/Promise"
     */
    succeed(a: A): I.UIO<boolean>
  }
}
