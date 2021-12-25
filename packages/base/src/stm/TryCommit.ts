import type * as Ex from '../IO/Exit'
import type { Journal } from './Journal'

export type TryCommit<E, A> = Done<E, A> | Suspend

export const DoneTypeId = Symbol.for('@principia/base/IO/stm/TryCommit/Done')
export type DoneTypeId = typeof DoneTypeId

export class Done<E, A> {
  readonly _tag: DoneTypeId = DoneTypeId
  constructor(readonly exit: Ex.Exit<E, A>) {}
}

export const SuspendTypeId = Symbol.for('@principia/base/IO/stm/TryCommit/Suspend')
export type SuspendTypeId = typeof SuspendTypeId

export class Suspend {
  readonly _tag: SuspendTypeId = SuspendTypeId
  constructor(readonly journal: Journal) {}
}
