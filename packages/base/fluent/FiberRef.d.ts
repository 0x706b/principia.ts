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
    getAndSet<A>(this: FiberRef<A>, a: A): UIO<A>

    /**
     * @rewrite getAndUpdate_ from "@principia/base/FiberRef"
     */
    getAndUpdate<A>(this: FiberRef<A>, f: (a: A) => A): UIO<A>

    /**
     * @rewrite getAndUpdateSome_ from "@principia/base/FiberRef"
     */
    getAndUpdateSome<A>(this: FiberRef<A>, f: (a: A) => Option<A>): UIO<A>

    /**
     * @rewrite locally_ from "@principia/base/FiberRef"
     */
    locally<A, R, E, B>(this: FiberRef<A>, value: A, use: IO<R, E, B>): IO<R, E, B>

    /**
     * @rewrite modify_ from "@principia/base/FiberRef"
     */
    modify<A, B>(this: FiberRef<A>, f: (a: A) => readonly [B, A]): UIO<B>

    /**
     * @rewrite set_ from "@principia/base/FiberRef"
     */
    set<A>(this: FiberRef<A>, a: A): UIO<void>

    /**
     * @rewrite update_ from "@principia/base/FiberRef"
     */
    update<A>(this: FiberRef<A>, f: (a: A) => A): UIO<void>
  }
}
