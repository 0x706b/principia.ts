import type * as P from './prelude'

export type Ordering = -1 | 0 | 1

export const LT = -1
export const EQ = 0
export const GT = 1

export const sign = (n: number): Ordering => (n <= -1 ? LT : n >= 1 ? GT : EQ)

export const invert = (O: Ordering): Ordering => {
  switch (O) {
    case LT:
      return GT
    case GT:
      return LT
    case EQ:
      return EQ
  }
}

export const Monoid: P.Monoid<Ordering> = {
  combine_: (x, y) => (x !== 0 ? x : y),
  combine: (x) => (y) => (x !== 0 ? x : y),
  nat: 0
}
