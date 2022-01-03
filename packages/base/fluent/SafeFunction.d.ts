declare module '@principia/base/SafeFunction' {
  export interface SafeFunction<I, A> {
    /**
     * @rewrite composef_ from "@principia/base/SafeFunction"
     */
    compose<I, A, B>(this: SafeFunction<I, A>, f: (a: A) => B): SafeFunction<I, B>
    /**
     * @rewrite compose_ from "@principia/base/SafeFunction"
     */
    compose<I, A, B>(this: SafeFunction<I, A>, f: SafeFunction<A, B>): SafeFunction<I, B>
  }
}

export {}
