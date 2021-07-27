declare module '@principia/base/Eval/core' {
  interface Eval<A> {
    /**
     * @rewrite chain_ from "@principia/base/Eval"
     */
    chain<A, B>(this: Eval<A>, f: (a: A) => Eval<B>): Eval<B>

    /**
     * @rewrite cross_ from "@principia/base/Eval"
     */
    cross<A, B>(this: Eval<A>, that: Eval<B>): Eval<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Eval"
     */
    crossWith<A, B, C>(this: Eval<A>, that: Eval<B>, f: (a: A, b: B) => C): Eval<C>

    /**
     * @rewrite map_ from "@principia/base/Eval"
     */
    map<A, B>(this: Eval<A>, f: (a: A) => B): Eval<B>
  }
}

export {}
