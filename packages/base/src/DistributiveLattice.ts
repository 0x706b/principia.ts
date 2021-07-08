/**
 * A `DistributiveLattice` must satisfy the following laws in addition to `Lattice` laws:
 *
 * - Distributivity for meet: `a ∨ (b ∧ c) <-> (a ∨ b) ∧ (a ∨ c)`
 * - Distributivity for join: `a ∧ (b ∨ c) <-> (a ∧ b) ∨ (a ∧ c)`
 *
 * @since 1.0.0
 */
import type { Lattice } from './Lattice'
import type { Ord } from './Ord'

import { max_, min_ } from './internal/Ord'

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface DistributiveLattice<A> extends Lattice<A> {}

/**
 * @category instances
 * @since 1.0.0
 */
export function getMinMax<A>(O: Ord<A>): DistributiveLattice<A> {
  return {
    meet: min_(O),
    join: max_(O)
  }
}
