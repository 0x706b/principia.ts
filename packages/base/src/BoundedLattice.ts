/**
 * A `BoundedLattice` must satisfy the following in addition to `BoundedMeetSemilattice` and `BoundedJoinSemilattice` laws:
 *
 * - Absorption law for meet: `a ∧ (a ∨ b) <-> a`
 * - Absorption law for join: `a ∨ (a ∧ b) <-> a`
 *
 * @since 1.0.0
 */
import type { BoundedJoinSemilattice } from './BoundedJoinSemilattice'
import type { BoundedMeetSemilattice } from './BoundedMeetSemilattice'

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface BoundedLattice<A> extends BoundedJoinSemilattice<A>, BoundedMeetSemilattice<A> {}
