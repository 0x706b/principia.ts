import type { Cast, Equals, Extends, Is, Match } from './Any'
import type { List, Prepend } from './List'

export type IntersectionOf<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type Last<U> = IntersectionOf<U extends unknown ? (x: U) => void : never> extends (x: infer P) => void
  ? P
  : never

type _ListOf<U, LN extends List = [], LastU = Last<U>> = {
  0: _ListOf<Exclude<U, LastU>, Prepend<LN, LastU>>
  1: LN
}[Extends<[U], [never]>]

export type ListOf<U> = _ListOf<U> extends infer X ? Cast<X, List> : never

export type Has<A, B> = [B] extends [A] ? 1 : 0

export type Select<U, M, _ extends Match = 'default'> = U extends unknown
  ? {
      0: never
      1: U & M
    }[Is<U, M, _>]
  : never

export type Filter<U, M, _ extends Match = 'default'> = U extends unknown
  ? {
      0: U & M
      1: never
    }[Is<U, M, _>]
  : never

export type Intersect<A, B> = A extends unknown ? (B extends unknown ? { 1: A, 0: never }[Equals<A, B>] : never) : never

export type Exclude<A, B> = A extends B ? never : A

export type Pop<U> = Exclude<U, Last<U>>
