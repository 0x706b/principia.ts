import type { Maybe } from '../Maybe'
import type { FiberId } from './FiberId'
import type { FiberStatus } from './FiberStatus'

export interface FiberDump {
  _tag: 'FiberDump'
  fiberId: FiberId
  fiberName: Maybe<string>
  status: FiberStatus
}

export function fiberDump(fiberId: FiberId, fiberName: Maybe<string>, status: FiberStatus): FiberDump {
  return {
    _tag: 'FiberDump',
    fiberId,
    fiberName,
    status
  }
}
