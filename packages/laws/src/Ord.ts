import type { Ord } from '@principia/base/Ord'

export const OrdLaws = {
  totality: <A>(O: Ord<A>) => (a: A, b: A): boolean => {
    return O.compare_(a, b) <= 0 || O.compare_(b, a) <= 0
  },
  reflexivity: <A>(O: Ord<A>) => (a: A): boolean => {
    return O.compare_(a, a) <= 0
  },
  antisymmetry: <A>(O: Ord<A>) => (a: A, b: A): boolean => {
    return O.compare_(a, b) <= 0 && O.compare_(b, a) <= 0 === O.equals_(a, b)
  },
  transitivity: <A>(O: Ord<A>) => (a: A, b: A, c: A): boolean => {
    return !(O.compare_(a, b) <= 0 && O.compare_(b, c) <= 0) || O.compare_(a, c) <= 0
  }
}
