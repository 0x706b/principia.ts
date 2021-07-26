import type * as AS from './ActorSystem'
import type * as En from './Envelope'
import type { ActorSystemException } from './exceptions'
import type * as Su from './Supervisor'
import type { Clock } from '@principia/base/Clock'
import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IOEnv'
import type { _R } from '@principia/base/util/types'
import type * as S from '@principia/schema'

import '@principia/base/Operators'

import * as C from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as P from '@principia/base/Promise'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import { tuple } from '@principia/base/tuple'

import * as AM from './Message'

export type PendingMessage<A extends AM.AnyMessage> = readonly [
  A,
  P.Promise<AM.ErrorOf<A> | ActorSystemException, AM.ResponseOf<A>>
]

export class Actor<F1 extends AM.AnyMessage> {
  constructor(
    readonly messages: AM.MessageRegistry<F1>,
    readonly queue: Q.UQueue<PendingMessage<F1>>,
    readonly optOutActorSystem: () => I.IO<IOEnv, ActorSystemException, void>
  ) {}

  runOp(command: En.Command) {
    switch (command._tag) {
      case 'Ask':
        return I.chain_(AM.decodeCommand(this.messages)(command.msg), ([msg, encode, encodeError]) =>
          I.bimap_(this.ask(msg), encodeError, encode)
        )
      case 'Tell':
        return I.chain_(AM.decodeCommand(this.messages)(command.msg), ([msg]) => this.tell(msg))
      case 'Stop':
        return this.stop
    }
  }

  ask<A extends F1>(fa: A) {
    return pipe(
      P.make<AM.ErrorOf<A> | ActorSystemException, AM.ResponseOf<A>>(),
      I.tap((promise) => Q.offer_(this.queue, tuple(fa, promise))),
      I.chain(P.await)
    )
  }

  /**
   * This is a fire-and-forget operation, it justs put a message onto the actor queue,
   * so there is no guarantee that it actually gets consumed by the actor.
   */
  tell(fa: F1) {
    return pipe(
      P.make<AM.ErrorOf<F1> | ActorSystemException, any>(),
      I.chain((promise) => Q.offer_(this.queue, tuple(fa, promise))),
      I.crossSecond(I.unit())
    )
  }

  readonly stop = pipe(
    Q.takeAll(this.queue),
    I.tap(() => Q.shutdown(this.queue)),
    I.tap(this.optOutActorSystem),
    I.map(C.map((_) => undefined)) // TODO: wtf? maybe casting to any would be better?
  )
}

export abstract class AbstractStateful<R, S, F1 extends AM.AnyMessage> {
  abstract readonly messages: AM.MessageRegistry<F1>
  abstract makeActor(
    supervisor: Su.Supervisor<R, ActorSystemException | AM.ErrorOf<F1>>,
    context: AS.Context<any>,
    optOutActorSystem: () => I.IO<IOEnv, ActorSystemException, void>,
    mailboxSize?: number
  ): (initial: S) => I.IO<R & IOEnv, ActorSystemException, Actor<F1>>
}

export type StatefulEnvelope<F1 extends AM.AnyMessage> = {
  [Tag in AM.TagsOf<F1>]: {
    _tag: Tag
    payload: AM.RequestOf<AM.ExtractTagged<F1, Tag>>
  }
}[AM.TagsOf<F1>]

export interface StatefulMatcher<F1 extends AM.AnyMessage> {
  <
    X extends {
      [Tag in AM.TagsOf<F1>]: (
        _: AM.RequestOf<AM.ExtractTagged<F1, Tag>>
      ) => I.IO<
        any,
        ActorSystemException | AM.ErrorOf<AM.ExtractTagged<F1, Tag>>,
        AM.ResponseOf<AM.ExtractTagged<F1, Tag>>
      >
    }
  >(
    handlers: X
  ): (
    msg: StatefulEnvelope<F1>
  ) => I.IO<_R<ReturnType<X[AM.TagsOf<F1>]>>, ActorSystemException | AM.ErrorOf<F1>, AM.ResponseOf<F1>>
}

export function stateful<S, F1 extends AM.AnyMessage>(messages: AM.MessageRegistry<F1>, stateSchema: S.Standard<S>) {
  return <R>(
    receive: (
      state: Ref.URef<S>,
      context: AS.Context<F1>,
      match: StatefulMatcher<F1>
    ) => (msg: StatefulEnvelope<F1>) => I.IO<R, AM.ErrorOf<F1> | ActorSystemException, AM.ResponseOf<F1>>
  ) => new Stateful<R, S, F1>(messages, stateSchema, receive)
}

export class Stateful<R, S, F1 extends AM.AnyMessage> extends AbstractStateful<R, S, F1> {
  constructor(
    readonly messages: AM.MessageRegistry<F1>,
    readonly stateSchema: S.Standard<S>,
    readonly receive: (
      state: Ref.URef<S>,
      context: AS.Context<F1>,
      match: StatefulMatcher<F1>
    ) => (msg: StatefulEnvelope<F1>) => I.IO<R, AM.ErrorOf<F1> | ActorSystemException, AM.ResponseOf<F1>>
  ) {
    super()
  }

  defaultMailboxSize = 10000

  makeActor(
    supervisor: Su.Supervisor<R, ActorSystemException | AM.ErrorOf<F1>>,
    context: AS.Context<F1>,
    optOutActorSystem: () => I.IO<unknown, ActorSystemException, void>,
    mailboxSize: number = this.defaultMailboxSize
  ): (initial: S) => I.URIO<R & Has<Clock>, Actor<F1>> {
    const self    = this
    const process = (msg: PendingMessage<F1>, state: Ref.URef<S>): I.URIO<R & Has<Clock>, void> =>
      I.gen(function* (_) {
        const s             = yield* _(pipe(Ref.get(state), I.chain(Ref.make)))
        const [fa, promise] = msg
        const reciever      = self.receive(
          s,
          context,
          (rec) => (msg) => rec[msg._tag](msg.payload)
        )({
          _tag: fa._tag,
          payload: fa as any
        })
        const completer = (a: AM.ResponseOf<F1>) =>
          pipe(Ref.get(s), I.chain(state.set), I.crossSecond(P.succeed_(promise, a)), I.asUnit)
        return yield* _(
          I.matchIO_(
            reciever,
            (e) =>
              pipe(
                supervisor.supervise(reciever, e),
                I.matchIO(() => I.asUnit(P.fail_(promise, e)), completer)
              ),
            completer
          )
        )
      })

    return (initial) =>
      I.gen(function* (_) {
        const state = yield* _(Ref.make(initial))
        const queue = yield* _(Q.makeBounded<PendingMessage<F1>>(mailboxSize))
        yield* _(
          pipe(
            Q.take(queue),
            I.chain((t) => process(t, state)),
            I.forever,
            I.fork
          )
        )
        return new Actor(self.messages, queue, optOutActorSystem)
      })
  }
}

export class ActorProxy<R, S, F1 extends AM.AnyMessage, E> extends AbstractStateful<R, S, F1> {
  constructor(
    readonly messages: AM.MessageRegistry<F1>,
    readonly process: (queue: Q.UQueue<PendingMessage<F1>>, context: AS.Context<F1>, initial: S) => I.IO<R, E, never>
  ) {
    super()
  }

  defaultMailboxSize = 10_000

  makeActor(
    _supervisor: Su.Supervisor<R, ActorSystemException | AM.ErrorOf<F1>>,
    context: AS.Context<F1>,
    optOutActorSystem: () => I.IO<unknown, ActorSystemException, void>,
    mailboxSize: number = this.defaultMailboxSize
  ): (initial: S) => I.URIO<R & Has<Clock>, Actor<F1>> {
    const self = this
    return (initial) =>
      I.gen(function* (_) {
        const queue = yield* _(Q.makeBounded<PendingMessage<F1>>(mailboxSize))
        yield* _(pipe(self.process(queue, context, initial), I.fork))
        return new Actor(self.messages, queue, optOutActorSystem)
      })
  }
}
