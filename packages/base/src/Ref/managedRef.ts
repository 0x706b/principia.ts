import { flow } from '../function'
import { toManaged } from '../IO/combinators/toManaged'
import { make } from './core'

/**
 * Creates a new `IORef` with the specified value.
 */
export const managedRef = flow(make, toManaged())
