import type { Either } from '../../../internal/Either'
import type { IO } from '../../../IO'

import * as E from '../../../Either'
import * as I from '../../../IO'

export const ChannelStateTag = {
  Emit: 'Emit',
  Done: 'Done',
  Effect: 'Effect'
} as const

export const ChannelStateTypeId = Symbol()
export type ChannelStateTypeId = typeof ChannelStateTypeId

export abstract class ChannelState<R, E> {
  readonly [ChannelStateTypeId]: ChannelStateTypeId = ChannelStateTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E

  get effect(): IO<R, E, any> {
    concrete(this)
    switch (this._tag) {
      case ChannelStateTag.Effect:
        return this.io
      default:
        return I.unit()
    }
  }
}

export class Emit extends ChannelState<unknown, never> {
  readonly _tag = ChannelStateTag.Emit
}
export const _Emit = new Emit()
export class Done extends ChannelState<unknown, never> {
  readonly _tag = ChannelStateTag.Done
}
export const _Done = new Done()
export class Effect<R, E> extends ChannelState<R, E> {
  readonly _tag = ChannelStateTag.Effect
  constructor(readonly io: IO<R, E, any>) {
    super()
  }
}

export function concrete<R, E>(_: ChannelState<R, E>): asserts _ is Emit | Done | Effect<R, E> {
  //
}

export function unroll<R, E>(runStep: () => ChannelState<R, E>): IO<R, E, Either<Emit, Done>> {
  const state = runStep()
  concrete(state)
  switch (state._tag) {
    case ChannelStateTag.Done:
      return I.succeed(E.right(_Done))
    case ChannelStateTag.Emit:
      return I.succeed(E.left(_Emit))
    case ChannelStateTag.Effect:
      return state.io['*>'](unroll(runStep))
  }
}
