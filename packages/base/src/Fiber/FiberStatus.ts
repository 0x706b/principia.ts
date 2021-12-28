import type { FiberId } from './FiberId'

export class Done {
  readonly _tag = 'Done'
}

export class Finishing {
  readonly _tag = 'Finishing'
  constructor(readonly interrupting: boolean) {}
}

export class Running {
  readonly _tag = 'Running'
  constructor(readonly interrupting: boolean) {}
}

export class Suspended {
  readonly _tag = 'Suspended'
  constructor(
    readonly previous: FiberStatus,
    readonly interruptible: boolean,
    readonly epoch: number,
    readonly blockingOn: FiberId
  ) {}
}

export type FiberStatus = Done | Finishing | Running | Suspended

export function isInterrupting(s: FiberStatus): boolean {
  switch (s._tag) {
    case 'Done':
      return false
    case 'Suspended':
      return isInterrupting(s.previous)
    default:
      return s.interrupting
  }
}

export function withInterrupting(s: FiberStatus, b: boolean): FiberStatus {
  switch (s._tag) {
    case 'Done':
      return s
    case 'Finishing':
      return new Finishing(b)
    case 'Running':
      return new Running(b)
    case 'Suspended':
      return new Suspended(withInterrupting(s.previous, b), s.interruptible, s.epoch, s.blockingOn)
  }
}

export function toFinishing(s: FiberStatus): FiberStatus {
  switch (s._tag) {
    case 'Suspended':
      return toFinishing(s.previous)
    default:
      return s
  }
}

export function isDone(s: FiberStatus): boolean {
  return s._tag === 'Done'
}
