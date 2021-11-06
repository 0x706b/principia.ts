import type * as Ex from '../../Exit/core'
import type { FiberId } from '../../Fiber'

export type Exit<E, A> = Ex.PExit<FiberId, E, A>

export * from '../../Exit'
