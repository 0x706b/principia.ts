import type { IO } from '../IO/core'

export class Empty {
  readonly _tag = 'Empty'
}

export class Pending {
  readonly _tag = 'Pending'
}

export class Registered {
  readonly _tag = 'Registered'
  constructor(readonly asyncCanceller: IO<any, any, any>) {}
}

export type CancellerState = Empty | Pending | Registered
