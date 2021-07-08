declare module '@principia/base/SafeFunction' {
  export interface SafeFunction<I, A> {
    /**
     * @rewrite andThen_ from "@principia/base/SafeFunction"
     */
    andThen<B>(f: (a: A) => B): SafeFunction<I, B>
    /**
     * @rewrite pipeTo_ from "@principia/base/SafeFunction"
     */
    pipeTo<B>(f: SafeFunction<A, B>): SafeFunction<I, B>
  }
}

export {}
