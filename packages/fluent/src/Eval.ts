declare module '@principia/base/Eval/core' {
  interface Eval<A> {
    /**
     * @rewrite chain_ from "@principia/base/Eval"
     */
    chain<B>(f: (a: A) => Eval<B>): Eval<B>

    /**
     * @rewrite cross_ from "@principia/base/Eval"
     */
    cross<B>(that: Eval<B>): Eval<readonly [A, B]>

    /**
     * @rewrite crossWith_ from "@principia/base/Eval"
     */
    crossWith<B, C>(that: Eval<B>, f: (a: A, b: B) => C): Eval<C>

    /**
     * @rewrite map_ from "@principia/base/Eval"
     */
    map<B>(f: (a: A) => B): Eval<B>
  }
}

export {}
