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

export class Emit {
  readonly _tag = ChannelStateTag.Emit
  readonly _R!: (_: unknown) => void
  readonly _E!: () => never
  get effect(): I.UIO<any> {
    return I.unit()
  }
}
export const _Emit = new Emit()
export class Done {
  readonly _tag = ChannelStateTag.Done
  readonly _R!: (_: unknown) => void
  readonly _E!: () => never
  get effect(): I.UIO<any> {
    return I.unit()
  }
}
export const _Done = new Done()
export class Effect<R, E> {
  readonly _tag = ChannelStateTag.Effect
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(readonly io: IO<R, E, any>) {}
  get effect(): I.IO<R, E, any> {
    return this.io
  }
}

export class Read<R, E> {
  readonly _tag = ChannelStateTag.Read
  constructor(
    readonly upstream: ErasedExecutor<R> | null,
    readonly onEffect: (_: I.IO<R, never, void>) => I.IO<R, never, void>,
    readonly onEmit: (_: any) => I.IO<R, never, void> | null,
    readonly onDone: (exit: Exit<any, any>) => I.IO<R, never, void> | null
  ) {}
  get effect(): I.IO<R, E, any> {
    return I.unit()
  }
}

export type ChannelState<R, E> = Emit | Done | Effect<R, E> | Read<R, E>

export function effectOrNullIgnored<R, E>(channelState: ChannelState<R, E> | null): I.IO<R, never, void> | null {
  if (channelState === null) {
    return null
  }
  return channelState._tag === ChannelStateTag.Effect ? pipe(channelState.effect, I.ignore, I.asUnit) : null
}
