import type { UIO } from '../IO'
import type { Exit } from '../IO/Exit'
import type { FiberId } from './FiberId'

import * as C from '../IO/Cause'
import * as CS from './CancellerState'
import * as FS from './FiberStatus'

export type FiberState<E, A> = Executing<E, A> | Done<E, A>

export type Callback<E, A> = (exit: Exit<E, A>) => void

export class Executing<E, A> {
  readonly _tag = 'Executing'

  constructor(
    public status: FS.FiberStatus,
    public observers: Set<Callback<never, Exit<E, A>>>,
    public suppressed: C.Cause<never>,
    public interruptors: Set<FiberId>,
    public asyncCanceller: CS.CancellerState,
    public mailbox: UIO<any> | null
  ) {}
}

export class Done<E, A> {
  readonly _tag = 'Done'

  readonly interrupted                = C.empty
  readonly status: FS.FiberStatus     = new FS.Done()
  readonly interruptors: Set<FiberId> = new Set()

  constructor(readonly value: Exit<E, A>) {}
}

export function initial<E, A>(): FiberState<E, A> {
  return new Executing(new FS.Running(false), new Set(), C.empty, new Set(), new CS.Empty(), null)
}

export function interruptorsCause<E, A>(state: FiberState<E, A>): C.Cause<never> {
  let cause: C.Cause<never> = C.empty
  for (const id of state.interruptors) {
    cause = C.then(cause, C.interrupt(id))
  }
  return cause
}
