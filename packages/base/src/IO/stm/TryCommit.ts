import type * as I from '..'
import type { Journal } from './Journal'

export type TryCommit<E, A> = Done<E, A> | Suspend

export const DoneTypeId = Symbol.for('@principia/base/IO/stm/TryCommit/Done')
export type DoneTypeId = typeof DoneTypeId

export class Done<E, A> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly io: I.FIO<E, A>) {}
}

export const SuspendTypeId = Symbol.for('@principia/base/IO/stm/TryCommit/Suspend')
export type SuspendTypeId = typeof SuspendTypeId

export class Suspend {
  readonly _typeId: SuspendTypeId = SuspendTypeId
  constructor(readonly journal: Journal) {}
}
