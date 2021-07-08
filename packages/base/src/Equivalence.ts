/**
 * An `Equivalence<A, B>` defines an equivalence between two types `A` and `B`.
 * These types represent different ways to store the same information.
 *
 * Equivalences are symmetrical. So if `A` is equivalent to `B`, then `B` is
 * equivalent to `A`.
 */
export interface Equivalence<A, B> {
  readonly to: (a: A) => B
  readonly from: (b: B) => A
}

export function Equivalence<A, B>(to: (a: A) => B, from: (b: B) => A): Equivalence<A, B> {
  return { to, from }
}

/**
 * Constructs an equivalence between a right-associated nested tuple, and a
 * left-associated nested tuple.
 */
export function tuple<A, B, C>(): Equivalence<readonly [A, readonly [B, C]], readonly [readonly [A, B], C]> {
  return {
    to: ([a, [b, c]]) => [[a, b], c],
    from: ([[a, b], c]) => [a, [b, c]]
  }
}

export function tupleUnit<A>(): Equivalence<readonly [A, void], A> {
  return {
    to: ([a, _]) => a,
    from: (a) => [a, undefined]
  }
}

export function tupleFlip<A, B>(): Equivalence<readonly [A, B], readonly [B, A]> {
  return {
    to: ([a, b]) => [b, a],
    from: ([b, a]) => [a, b]
  }
}

export function andThen_<A, B, C>(ab: Equivalence<A, B>, bc: Equivalence<B, C>): Equivalence<A, C> {
  return {
    from: (c) => ab.from(bc.from(c)),
    to: (a) => bc.to(ab.to(a))
  }
}

export function andThen<B, C>(bc: Equivalence<B, C>): <A>(ab: Equivalence<A, B>) => Equivalence<A, C> {
  return (ab) => andThen_(ab, bc)
}
