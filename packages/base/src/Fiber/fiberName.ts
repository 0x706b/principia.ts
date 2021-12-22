import * as FR from '../FiberRef'
import * as M from '../Maybe'

export const fiberName = FR.unsafeMake<M.Maybe<string>>(M.nothing())
