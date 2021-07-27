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
    halt<E, A>(this: Promise<E, A>, defect: unknown): I.UIO<boolean>
    /**
     * @rewrite done_ from "@principia/base/Promise"
     */
    done<E, A>(this: Promise<E, A>, exit: Exit<E, A>): I.UIO<boolean>
    /**
     * @rewrite fulfill_ from "@principia/base/Promise"
     */
    fulfill<E, A, R>(this: Promise<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean>
    /**
     * @rewrite fulfillWith_ from "@principia/base/Promise"
     */
    fulfillWith<E, A>(this: Promise<E, A>, io: I.FIO<E, A>): I.UIO<boolean>
    /**
     * @rewrite failCause_ from "@principia/base/Promise"
     */
    failCause<E, A>(this: Promise<E, A>, cause: Cause<E>): I.UIO<boolean>
    /**
     * @rewriteGetter interrupt from "@principia/base/Promise"
     */
    interrupt: I.UIO<boolean>
    /**
     * @rewrite interruptAs_ from "@principia/base/Promise"
     */
    interruptAs<E, A>(this: Promise<E, A>, id: FiberId): I.UIO<boolean>
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
    succeed<E, A>(this: Promise<E, A>, a: A): I.UIO<boolean>
  }
}
