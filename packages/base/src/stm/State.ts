import type { TExit } from './TExit'

import * as Ex from '../IO/Exit'
import { FailTypeId, HaltTypeId, InterruptTypeId, RetryTypeId, SucceedTypeId } from './TExit'

export interface Done<E, A> {
  readonly _tag: 'Done'
  readonly exit: Ex.Exit<E, A>
}

export function Done<E, A>(exit: Ex.Exit<E, A>): Done<E, A> {
  return {
    _tag: 'Done',
    exit
  }
}

export interface Interrupted {
  readonly _tag: 'Interrupted'
}

export const Interrupted: CommitState<never, never> = {
  _tag: 'Interrupted'
}

export interface Running {
  readonly _tag: 'Running'
}

export const Running: CommitState<never, never> = {
  _tag: 'Running'
}

export type CommitState<E, A> = Done<E, A> | Interrupted | Running

export function isRunning<E, A>(state: CommitState<E, A>): boolean {
  return state._tag === 'Running'
}

export function done<E, A>(texit: TExit<E, A>): CommitState<E, A> {
  switch (texit._tag) {
    case SucceedTypeId:
      return Done(Ex.succeed(texit.value))
    case HaltTypeId:
      return Done(Ex.halt(texit.value))
    case FailTypeId:
      return Done(Ex.fail(texit.value))
    case InterruptTypeId:
      return Done(Ex.interrupt(texit.fiberId))
    case RetryTypeId:
      throw new Error('Defect: done being called on TExit.Retry')
  }
}
