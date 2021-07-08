import type { SafeFunction } from '@principia/base/SafeFunction'

declare global {
  interface Function {
    /**
     * @rewrite single from "@principia/base/SafeFunction"
     */
    safe<A, B>(this: (a: A) => B): SafeFunction<A, B>
  }
}

export {}
