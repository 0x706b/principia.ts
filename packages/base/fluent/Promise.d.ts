import type * as I from '@principia/base/IO'
import type { Cause } from '@principia/base/IO/Cause'
import type { Exit } from '@principia/base/IO/Exit'
import type { FiberId } from '@principia/base/IO/Fiber'
import type { Option } from '@principia/base/Option'

declare module '@principia/base/IO/Promise' {
  export interface Promise<E, A> {
    /**
     * @rewrite halt_ from "@principia/base/IO/Promise"
     */
    halt<E, A>(this: Promise<E, A>, defect: unknown): I.UIO<boolean>
    /**
     * @rewrite done_ from "@principia/base/IO/Promise"
     */
    done<E, A>(this: Promise<E, A>, exit: Exit<E, A>): I.UIO<boolean>
    /**
     * @rewrite fulfill_ from "@principia/base/IO/Promise"
     */
    fulfill<E, A, R>(this: Promise<E, A>, io: I.IO<R, E, A>): I.IO<R, never, boolean>
    /**
     * @rewrite fulfillWith_ from "@principia/base/IO/Promise"
     */
    fulfillWith<E, A>(this: Promise<E, A>, io: I.FIO<E, A>): I.UIO<boolean>
    /**
     * @rewrite failCause_ from "@principia/base/IO/Promise"
     */
    failCause<E, A>(this: Promise<E, A>, cause: Cause<E>): I.UIO<boolean>
    /**
     * @rewriteGetter interrupt from "@principia/base/IO/Promise"
     */
    interrupt: I.UIO<boolean>
    /**
     * @rewrite interruptAs_ from "@principia/base/IO/Promise"
     */
    interruptAs<E, A>(this: Promise<E, A>, id: FiberId): I.UIO<boolean>
    /**
     * @rewriteGetter isDone from "@principia/base/IO/Promise"
     */
    isDone: I.UIO<boolean>
    /**
     * @rewriteGetter poll from "@principia/base/IO/Promise"
     */
    poll: I.UIO<Option<I.FIO<E, A>>>
    /**
     * @rewrite succeed_ from "@principia/base/IO/Promise"
     */
    succeed<E, A>(this: Promise<E, A>, a: A): I.UIO<boolean>
  }
}
