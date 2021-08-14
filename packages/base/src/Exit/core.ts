import type { FiberId } from '../Fiber'
import type * as Ex from './generic'

export type Exit<E, A> = Ex.GenericExit<FiberId, E, A>

export * from './generic'
