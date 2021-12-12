import type { FiberId } from './FiberId'

import * as Ev from '../Eval'

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
  let current: FiberStatus | undefined = s
  while (current) {
    switch (current._tag) {
      case 'Running': {
        return current.interrupting
      }
      case 'Finishing': {
        return current.interrupting
      }
      case 'Done': {
        return false
      }
      case 'Suspended': {
        current = current.previous
        break
      }
    }
  }
  throw new Error('absurd')
}

/**
 * @internal
 */
export function withInterruptingEval(s: FiberStatus, b: boolean): Ev.Eval<FiberStatus> {
  return Ev.gen(function* (_) {
    switch (s._tag) {
      case 'Done': {
        return s
      }
      case 'Finishing': {
        return new Finishing(b)
      }
      case 'Running': {
        return new Running(b)
      }
      case 'Suspended': {
        return new Suspended(yield* _(withInterruptingEval(s.previous, b)), s.interruptible, s.epoch, s.blockingOn)
      }
    }
  })
}

export function withInterrupting(b: boolean): (s: FiberStatus) => FiberStatus {
  return (s) => Ev.evaluate(withInterruptingEval(s, b))
}

/**
 * @internal
 */
export function toFinishingEval(s: FiberStatus): Ev.Eval<FiberStatus> {
  return Ev.gen(function* (_) {
    switch (s._tag) {
      case 'Done': {
        return s
      }
      case 'Finishing': {
        return s
      }
      case 'Running': {
        return s
      }
      case 'Suspended': {
        return yield* _(toFinishingEval(s.previous))
      }
    }
  })
}

export function toFinishing(s: FiberStatus): FiberStatus {
  return Ev.evaluate(toFinishingEval(s))
}

export function isDone(s: FiberStatus): boolean {
  return s._tag === 'Done'
}
