declare module '@principia/base/SafeFunction' {
  export interface SafeFunction<I, A> {
    /**
     * @rewrite andThen_ from "@principia/base/SafeFunction"
     */
    andThen<I, A, B>(this: SafeFunction<I, A>, f: (a: A) => B): SafeFunction<I, B>
    /**
     * @rewrite pipeTo_ from "@principia/base/SafeFunction"
     */
    pipeTo<I, A, B>(this: SafeFunction<I, A>, f: SafeFunction<A, B>): SafeFunction<I, B>
  }
}

export {}
