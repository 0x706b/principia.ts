import type { Eq } from '@principia/base/Eq'

export const allEquals = <A>(E: Eq<A>) => (a: A, ...as: Array<A>): boolean => {
  return as.every((item) => E.equals_(item, a))
}

export interface MaybeAsyncEq<A> {
  readonly equals_: (x: A, y: A) => boolean | Promise<boolean>
  readonly equals: (y: A) => (x: A) => boolean | Promise<boolean>
}

export const isPromise = <A>(p: A | Promise<A>): p is Promise<A> => p instanceof Promise
