/**
 * A `Lattice` must satisfy the following in addition to `JoinSemilattice` and `MeetSemilattice` laws:
 *
 * - Absorbtion law for meet: `a ∧ (a ∨ b) <-> a`
 * - Absorbtion law for join: `a ∨ (a ∧ b) <-> a`
 *
 * @since 1.0.0
 */
import type { JoinSemilattice } from './JoinSemilattice'
import type { MeetSemilattice } from './MeetSemilattice'

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface Lattice<A> extends JoinSemilattice<A>, MeetSemilattice<A> {}
