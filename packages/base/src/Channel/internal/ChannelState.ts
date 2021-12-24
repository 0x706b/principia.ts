import type { IO } from '../../IO'
import type { Exit } from '../../IO/Exit'
import type { ErasedExecutor } from './ChannelExecutor'

import { pipe } from '../../function'
import * as I from '../../IO'

export const ChannelStateTag = {
  Emit: 'Emit',
  Done: 'Done',
  Effect: 'Effect',
  Read: 'Read'
} as const

export const ChannelStateTypeId = Symbol.for('@principia/base/ChannelState')
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

export class Read<R, E> extends ChannelState<R, E> {
  readonly _tag = ChannelStateTag.Read
  constructor(
    readonly upstream: ErasedExecutor<R> | null,
    readonly onEffect: (_: I.IO<R, never, void>) => I.IO<R, never, void>,
    readonly onEmit: (_: any) => I.IO<R, never, void> | null,
    readonly onDone: (exit: Exit<any, any>) => I.IO<R, never, void> | null
  ) {
    super()
  }
}

/**
 * @optimize remove
 */
export function concrete<R, E>(_: ChannelState<R, E>): asserts _ is Emit | Done | Effect<R, E> | Read<R, E> {
  //
}

export function effectOrNullIgnored<R, E>(channelState: ChannelState<R, E> | null): I.IO<R, never, void> | null {
  if (channelState === null) {
    return null
  }
  concrete(channelState)
  return channelState._tag === ChannelStateTag.Effect ? pipe(channelState.effect, I.ignore, I.asUnit) : null
}
