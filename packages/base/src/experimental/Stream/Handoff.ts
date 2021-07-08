import type * as Ca from '../../Cause'
import type * as C from '../../Chunk'
import type * as SER from './SinkEndReason'

import { pipe } from '../../function'
import * as I from '../../IO'
import * as O from '../../Option'
import * as P from '../../Promise'
import * as Ref from '../../Ref'
import { tuple } from '../../tuple'

export class Handoff<A> {
  constructor(readonly ref: Ref.URef<State<A>>) {}
}

export function make<A>() {
  return pipe(
    P.make<never, void>(),
    I.chain((p) => Ref.make<State<A>>(new Empty(p))),
    I.map((_) => new Handoff(_))
  )
}

export const StateTypeId = Symbol()

export const EmptyTypeId = Symbol()
export class Empty {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof EmptyTypeId      = EmptyTypeId

  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

export const FullTypeId = Symbol()
export class Full<A> {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof FullTypeId       = FullTypeId

  constructor(readonly a: A, readonly notifyConsumer: P.Promise<never, void>) {}
}

export type State<A> = Empty | Full<A>

export function offer<A>(handoff: Handoff<A>, a: A): I.UIO<void> {
  return I.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(I.crossSecond_(P.await(s.notifyConsumer), offer(handoff, a)), s)
        } else {
          return tuple(I.crossSecond_(P.succeed_(s.notifyConsumer, undefined), P.await(p)), new Full(a, p))
        }
      }),
      I.flatten
    )
  })
}

export function take<A>(handoff: Handoff<A>): I.UIO<A> {
  return I.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(I.as_(P.succeed_(s.notifyConsumer, undefined), s.a), new Empty(p))
        } else {
          return tuple(I.crossSecond_(P.await(s.notifyConsumer), take(handoff)), s)
        }
      }),
      I.flatten
    )
  })
}

export function poll<A>(handoff: Handoff<A>): I.UIO<O.Option<A>> {
  return I.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(I.as_(P.succeed_(s.notifyConsumer, undefined), O.some(s.a)), new Empty(p))
        } else {
          return tuple(I.succeed(O.none()), s)
        }
      }),
      I.flatten
    )
  })
}

export const HandoffSignalTypeId = Symbol()

export const EmitTypeId = Symbol()
export type EmitTypeId = typeof EmitTypeId
export class Emit<A> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EmitTypeId                       = EmitTypeId

  constructor(readonly els: C.Chunk<A>) {}
}

export const HaltTypeId = Symbol()
export type HaltTypeId = typeof HaltTypeId
export class Halt<E> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof HaltTypeId                       = HaltTypeId

  constructor(readonly error: Ca.Cause<E>) {}
}

export const EndTypeId = Symbol()
export type EndTypeId = typeof EndTypeId
export class End<C> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EndTypeId                        = EndTypeId

  constructor(readonly reason: SER.SinkEndReason<C>) {}
}

export type HandoffSignal<C, E, A> = Emit<A> | Halt<E> | End<C>

export function matchSignal_<C, E, A, B, D, F>(
  signal: HandoffSignal<C, E, A>,
  cases: {
    Emit: (_: Emit<A>) => B
    Halt: (_: Halt<E>) => D
    End: (_: End<C>) => F
  }
): B | D | F {
  switch (signal._typeId) {
    case EmitTypeId:
      return cases.Emit(signal)
    case HaltTypeId:
      return cases.Halt(signal)
    case EndTypeId:
      return cases.End(signal)
  }
}

export function matchSignal<C, E, A, B, D, F>(cases: {
  Emit: (_: Emit<A>) => B
  Halt: (_: Halt<E>) => D
  End: (_: End<C>) => F
}): (signal: HandoffSignal<C, E, A>) => B | D | F {
  return (signal) => matchSignal_(signal, cases)
}
