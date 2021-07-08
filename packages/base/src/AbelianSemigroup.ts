import type { Commutative } from './Commutative'
import type { Semigroup } from './Semigroup'

/**
 * `AbelianSemigroup` defines a binary operator `combine` on given type `A` that is both associative and commutative
 *
 * For a binary operation `*` on type `A`:
 *
 * ```
 * For all a, b, c in A
 * (a * b) * c === a * (b * c)
 * a * b === b * a
 * ```
 */
export interface AbelianSemigroup<A> extends Semigroup<A>, Commutative {}
