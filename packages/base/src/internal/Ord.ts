import type { Ord } from '../Ord'

export { Ord }

export function min_<A>(O: Ord<A>): (x: A, y: A) => A {
  return (x, y) => (x === y || O.compare_(x, y) < 1 ? x : y)
}

export function max_<A>(O: Ord<A>): (x: A, y: A) => A {
  return (x, y) => (x === y || O.compare_(x, y) > -1 ? x : y)
}
