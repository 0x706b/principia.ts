/**
 * A `BoundedDistributiveLattice` is a lattice that is both bounded and distributive
 *
 * @since 1.0.0
 */
import type { BoundedLattice } from './BoundedLattice'
import type { DistributiveLattice } from './DistributiveLattice'
import type { Ord } from './Ord'

import * as DL from './DistributiveLattice'

/**
 * @category Type Classes
 * @since 1.0.0
 */
export interface BoundedDistributiveLattice<A> extends BoundedLattice<A>, DistributiveLattice<A> {}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMinMax<A>(O: Ord<A>): (min: A, max: A) => BoundedDistributiveLattice<A> {
  const L = DL.getMinMax(O)
  return (min, max) => ({
    join: L.join,
    meet: L.meet,
    zero: min,
    one: max
  })
}
