import type * as Ex from '../../Exit/generic'
import type { FiberId } from '../../IO/Fiber'

export type Exit<E, A> = Ex.GenericExit<FiberId, E, A>

export * from '../../Exit'
