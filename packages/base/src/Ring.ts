import type { SemiringMin } from './Semiring'

import { Semiring } from './Semiring'

export interface Ring<A> extends Semiring<A> {
  readonly sub_: (x: A, y: A) => A
  readonly sub: (y: A) => (x: A) => A
}

export type RingMin<A> = SemiringMin<A> & {
  readonly sub_: (x: A, y: A) => A
}

export function Ring<A>(R: RingMin<A>): Ring<A> {
  return {
    ...Semiring(R),
    sub_: R.sub_,
    sub: (y) => (x) => R.sub_(x, y)
  }
}
