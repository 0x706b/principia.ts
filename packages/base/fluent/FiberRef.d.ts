import type { IO, UIO } from '@principia/base/IO'
import type * as FR from '@principia/base/IO/FiberRef'
import type { Maybe } from '@principia/base/Maybe'

declare global {
  export const FiberRef: FiberRefStaticOps
  export interface FiberRef<A> extends FR.FiberRef<A> {}
}

interface FiberRefStaticOps {
  make: typeof FR.make
}

declare module '@principia/base/IO/FiberRef/core' {
  export interface FiberRef<A> {
    /**
     * @rewriteGetter get from "@principia/base/IO/FiberRef"
     */
    get: UIO<A>

    /**
     * @rewrite getAndSet_ from "@principia/base/IO/FiberRef"
     */
    getAndSet<A>(this: FiberRef<A>, a: A): UIO<A>

    /**
     * @rewrite getAndUpdate_ from "@principia/base/IO/FiberRef"
     */
    getAndUpdate<A>(this: FiberRef<A>, f: (a: A) => A): UIO<A>

    /**
     * @rewrite getAndUpdateJust_ from "@principia/base/IO/FiberRef"
     */
    getAndUpdateJust<A>(this: FiberRef<A>, f: (a: A) => Maybe<A>): UIO<A>

    /**
     * @rewrite locally_ from "@principia/base/IO/FiberRef"
     */
    locally<A, R, E, B>(this: FiberRef<A>, value: A, use: IO<R, E, B>): IO<R, E, B>

    /**
     * @rewrite modify_ from "@principia/base/IO/FiberRef"
     */
    modify<A, B>(this: FiberRef<A>, f: (a: A) => readonly [B, A]): UIO<B>

    /**
     * @rewrite set_ from "@principia/base/IO/FiberRef"
     */
    set<A>(this: FiberRef<A>, a: A): UIO<void>

    /**
     * @rewrite update_ from "@principia/base/IO/FiberRef"
     */
    update<A>(this: FiberRef<A>, f: (a: A) => A): UIO<void>
  }
}
