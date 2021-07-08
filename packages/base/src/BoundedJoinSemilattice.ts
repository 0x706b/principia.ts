/**
 * A `BoundedJoinSemilattice` must satisfy the following laws in addition to `JoinSemilattice` laws:
 *
 * - `a ∨ 0 <-> a`
 *
 * @since 1.0.0
 */
import type { JoinSemilattice } from './JoinSemilattice'

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface BoundedJoinSemilattice<A> extends JoinSemilattice<A> {
  readonly zero: A
}
