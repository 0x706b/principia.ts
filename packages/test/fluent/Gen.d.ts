import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { Sample } from '@principia/test/Sample'

/* eslint typescript-sort-keys/interface: "error" */

declare module '@principia/test/Gen/core' {
  interface Gen<R, A> {
    /**
     * @rewrite chain_ from "@principia/test/Gen"
     */
    chain<R, A, R1, B>(this: Gen<R, A>, f: (a: A) => Gen<R1, B>): Gen<R & R1, B>
    /**
     * @rewrite cross_ from "@principia/test/Gen"
     */
    cross<R, A, R1, B>(this: Gen<R, A>, that: Gen<R1, B>): Gen<R & R1, readonly [A, B]>
    /**
     * @rewrite crossWith_ from "@principia/test/Gen"
     */
    crossWith<R, A, R1, B, C>(this: Gen<R, A>, that: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C>
    /**
     * @rewrite filter_ from "@principia/test/Gen"
     */
    filter<R, A, B extends A>(fa: Gen<R, A>, f: Refinement<A, B>): Gen<R, B>
    /**
     * @rewrite filter_ from "@principia/test/Gen"
     */
    filter<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A>
    /**
     * @rewrite filterNot_ from "@principia/test/Gen"
     */
    filterNot<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A>
    /**
     * @rewrite flatten from "@principia/test/Gen"
     */
    flatten<R, R1, A>(this: Gen<R, Gen<R1, A>>): Gen<R & R1, A>
    /**
     * @rewrite map_ from "@principia/test/Gen"
     */
    map<R, A, B>(this: Gen<R, A>, f: (a: A) => B): Gen<R, B>
    /**
     * @rewrite mapIO_ from "@principia/test/Gen"
     */
    mapIO<R, A, R1, B>(this: Gen<R, A>, f: (a: A) => IO<R1, never, B>): Gen<R & R1, B>
    /**
     * @rewrite reshrink_ from "@principia/test/Gen"
     */
    reshrink<R, A, R1, B>(this: Gen<R, A>, f: (a: A) => Sample<R1, B>): Gen<R & R1, B>
    /**
     * @rewrite zipWith_ from "@principia/test/Gen"
     */
    zipWith<R, A, R1, B, C>(this: Gen<R, A>, that: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C>
  }
}
