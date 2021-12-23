import type * as FR from '@principia/base/FiberRef'
import type { IO } from '@principia/base/IO'
import type { Managed } from '@principia/base/Managed'
import type { Maybe } from '@principia/base/Maybe'

declare global {
  export const FiberRef: FiberRefStaticOps
  export interface FiberRef<EA, EB, A, B> extends FR.FiberRef<EA, EB, A, B> {}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace FiberRef {
  export interface Runtime<A> extends FR.Runtime<A> {}
}

interface FiberRefStaticOps {
  /**
   * @rewriteStatic make from "@principia/base/FiberRef"
   */
  make: typeof FR.make
  /**
   * @rewriteStatic unsafeMake from "@principia/base/FiberRef"
   */
  unsafeMake: typeof FR.unsafeMake
}

declare module '@principia/base/FiberRef/core' {
  export interface FiberRef<EA, EB, A, B> {
    /**
     * @rewriteGetter get from "@principia/base/FiberRef"
     */
    get: FIO<EB, B>

    /**
     * @rewrite getAndSet_ from "@principia/base/FiberRef"
     */
    getAndSet<EA, EB, A>(this: FiberRef<EA, EB, A, A>, a: A): FIO<EA | EB, A>

    /**
     * @rewrite getAndUpdate_ from "@principia/base/FiberRef"
     */
    getAndUpdate<EA, EB, A>(this: FiberRef<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, A>

    /**
     * @rewrite getAndUpdateJust_ from "@principia/base/FiberRef"
     */
    getAndUpdateJust<EA, EB, A>(this: FiberRef<EA, EB, A, A>, f: (a: A) => Maybe<A>): FIO<EA | EB, A>

    /**
     * @rewrite locally_ from "@principia/base/IO/FiberRef"
     */
    locally<EA, EB, A, B, R1, E1, C>(this: FiberRef<EA, EB, A, B>, value: A, use: IO<R1, E1, C>): IO<R1, EA | E1, C>

    /**
     * @rewrite modify_ from "@principia/base/IO/FiberRef"
     */
    modify<EA, EB, A, B>(this: FiberRef<EA, EB, A, A>, f: (a: A) => readonly [B, A]): FIO<EA | EB, B>

    /**
     * @rewrite set_ from "@principia/base/IO/FiberRef"
     */
    set<EA, EB, A>(this: FiberRef<EA, EB, A, A>, a: A): FIO<EA, void>

    /**
     * @rewrite update_ from "@principia/base/IO/FiberRef"
     */
    update<EA, EB, A>(this: FiberRef<EA, EB, A, A>, f: (a: A) => A): FIO<EA | EB, void>

    /**
     * @rewrite getWith_ from "@principia/base/IO/FiberRef"
     */
    getWith<EA, EB, A, B, R, E, C>(this: FiberRef<EA, EB, A, B>, f: (b: B) => IO<R, E, C>): IO<R, EB | E, C>

    /**
     * @rewrite locallyManaged_ from "@principia/base/IO/FiberRef"
     */
    locallyManaged<EA, EB, A, B>(this: FiberRef<EA, EB, A, B>, value: A): Managed<unknown, EA, void>
  }
}
