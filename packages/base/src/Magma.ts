/**
 * A `Magma` is a pair `(A, concat)` in which `A` is a non-empty set and `concat` is a binary operation on `A`
 *
 * `Magma` is a precursor to `Semigroup`: `Magma` only has a closure requrement, while `Semigroup` must have an associative operation.
 *
 * @category Type Classes
 * @since 1.0.0
 */
export interface Magma<A> {
  readonly combine_: (x: A, y: A) => A
  readonly combine: (y: A) => (x: A) => A
}

export interface CombineFn_<A> {
  (x: A, y: A): A
}

export interface CombineFn<A> {
  (y: A): (x: A) => A
}
