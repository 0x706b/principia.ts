import type { IO, UIO } from '@principia/base/IO'
import type { Option } from '@principia/base/Option'

declare module '@principia/base/FiberRef/core' {
  export interface FiberRef<A> {
    /**
     * @rewriteGetter get from "@principia/base/FiberRef"
     */
    get: UIO<A>

    /**
     * @rewrite getAndSet_ from "@principia/base/FiberRef"
     */
    getAndSet(a: A): UIO<A>

    /**
     * @rewrite getAndUpdate_ from "@principia/base/FiberRef"
     */
    getAndUpdate(f: (a: A) => A): UIO<A>

    /**
     * @rewrite getAndUpdateSome_ from "@principia/base/FiberRef"
     */
    getAndUpdateSome(f: (a: A) => Option<A>): UIO<A>

    /**
     * @rewrite locally_ from "@principia/base/FiberRef"
     */
    locally<R, E, B>(value: A, use: IO<R, E, B>): IO<R, E, B>

    /**
     * @rewrite modify_ from "@principia/base/FiberRef"
     */
    modify<B>(f: (a: A) => readonly [B, A]): UIO<B>

    /**
     * @rewrite set_ from "@principia/base/FiberRef"
     */
    set(a: A): UIO<void>

    /**
     * @rewrite update_ from "@principia/base/FiberRef"
     */
    update(f: (a: A) => A): UIO<void>
  }
}
