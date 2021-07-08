export interface Semiring<A> {
  readonly add_: (x: A, y: A) => A
  readonly add: (y: A) => (x: A) => A
  readonly mul_: (x: A, y: A) => A
  readonly mul: (y: A) => (x: A) => A
  readonly zero: A
  readonly one: A
}

export type SemiringMin<A> = {
  readonly add_: (x: A, y: A) => A
  readonly mul_: (x: A, y: A) => A
  readonly zero: A
  readonly one: A
}

export function Semiring<A>(S: SemiringMin<A>): Semiring<A> {
  return {
    ...S,
    add: (y) => (x) => S.add_(x, y),
    mul: (y) => (x) => S.mul_(x, y),
  }
}

export const getFunctionSemiring = <A, B>(S: Semiring<B>): Semiring<(a: A) => B> => ({
  zero: () => S.zero,
  one: () => S.one,
  add: (f) => (g) => (x) => S.add_(f(x), g(x)),
  mul: (f) => (g) => (x) => S.mul_(f(x), g(x)),
  add_: (f, g) => (x) => S.add_(f(x), g(x)),
  mul_: (f, g) => (x) => S.mul_(f(x), g(x))
})
