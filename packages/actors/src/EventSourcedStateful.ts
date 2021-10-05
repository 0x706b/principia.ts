import type * as AS from './ActorSystem'
import type { ActorSystemException } from './exceptions'
import type { Journal, PersistenceId } from './Journal'
import type * as AM from './Message'
import type * as SUP from './Supervisor'
import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IO/IOEnv'
import type { IsEqualTo } from '@principia/base/util/types'
import type * as SCH from '@principia/schema'

import * as CH from '@principia/base/Chunk'
import { pipe } from '@principia/base/function'
import * as T from '@principia/base/IO'
import * as S from '@principia/base/IO/experimental/Stream'
import * as F from '@principia/base/IO/Future'
import * as Q from '@principia/base/IO/Queue'
import * as Ref from '@principia/base/IO/Ref'
import * as M from '@principia/base/Maybe'
import { tuple } from '@principia/base/tuple'

import * as A from './Actor'
import { JournalFactory } from './Journal'

type EventSourcedEnvelope<S, F1 extends AM.AnyMessage, EV> = {
  [Tag in AM.TagsOf<F1>]: {
    _tag: Tag
    payload: AM.RequestOf<AM.ExtractTagged<F1, Tag>>
    return: (
      ev: CH.Chunk<EV>,
      r: IsEqualTo<AM.ResponseOf<AM.ExtractTagged<F1, Tag>>, void> extends true
        ? void
        : (state: S) => AM.ResponseOf<AM.ExtractTagged<F1, Tag>>
    ) => T.IO<unknown, never, EventSourcedResponse<S, AM.ExtractTagged<F1, Tag>, EV>>
  }
}[AM.TagsOf<F1>]

type EventSourcedResponse<S, F1 extends AM.AnyMessage, EV> = {
  [Tag in AM.TagsOf<F1>]: readonly [CH.Chunk<EV>, (state: S) => AM.ResponseOf<AM.ExtractTagged<F1, Tag>>]
}[AM.TagsOf<F1>]

export function eventSourcedStateful<S, F1 extends AM.AnyMessage, EV>(
  messages: AM.MessageRegistry<F1>,
  stateSchema: SCH.Standard<S>,
  eventSchema: SCH.Standard<EV>
) {
  return <R>(
    persistenceId: PersistenceId,
    receive: (
      state: S,
      context: AS.Context<F1>
    ) => (
      msg: EventSourcedEnvelope<S, F1, EV>
    ) => T.IO<R & IOEnv, ActorSystemException, EventSourcedResponse<S, F1, EV>>,
    sourceEvent: (state: S) => (event: EV) => S
  ) => new EventSourcedStateful<R, S, F1, EV>(messages, stateSchema, eventSchema, persistenceId, receive, sourceEvent)
}

export class EventSourcedStateful<R, S, F1 extends AM.AnyMessage, EV> extends A.AbstractStateful<
  R & Has<JournalFactory>,
  S,
  F1
> {
  constructor(
    readonly messages: AM.MessageRegistry<F1>,
    readonly stateSchema: SCH.Standard<S>,
    readonly eventSchema: SCH.Standard<EV>,
    readonly persistenceId: PersistenceId,
    readonly receive: (
      state: S,
      context: AS.Context<F1>
    ) => (
      msg: EventSourcedEnvelope<S, F1, EV>
    ) => T.IO<R & IOEnv, ActorSystemException, EventSourcedResponse<S, F1, EV>>,
    readonly sourceEvent: (state: S) => (event: EV) => S
  ) {
    super()
  }

  defaultMailboxSize = 10000

  applyEvents(events: CH.Chunk<EV>, state: S) {
    return CH.foldl_(events, state, (s, e) => this.sourceEvent(s)(e))
  }

  makeActor(
    supervisor: SUP.Supervisor<R, AM.ErrorOf<F1> | ActorSystemException>,
    context: AS.Context<F1>,
    optOutActorSystem: () => T.IO<IOEnv, ActorSystemException, void>,
    mailboxSize: number = this.defaultMailboxSize
  ): (initial: S) => T.IO<R & Has<JournalFactory> & IOEnv, ActorSystemException, A.Actor<F1>> {
    const self    = this
    const process = (
      msg: A.PendingMessage<F1>,
      state: Ref.URef<S>,
      journal: Journal<S, EV>
    ): T.IO<R & IOEnv, ActorSystemException, void> => {
      return T.gen(function* (_) {
        const s             = yield* _(Ref.get(state))
        const [fa, promise] = msg
        const reciever      = self.receive(
          s,
          context
        )({
          _tag: fa._tag,
          payload: fa,
          return: (ev: CH.Chunk<EV>, r: (s: S) => AM.ResponseOf<F1> = () => undefined as any) => T.succeed(tuple(ev, r))
        } as any)
        const effectfulCompleter = (s: S, a: AM.ResponseOf<F1>) =>
          pipe(
            T.asUnit(Ref.set_(state, s)),
            T.chain(() => F.succeed_(promise, a))
          )
        const idempotentCompleter = (a: AM.ResponseOf<F1>) => T.asUnit(F.succeed_(promise, a))
        const fullCompleter       = ([ev, sa]: readonly [CH.Chunk<EV>, (s: S) => AM.ResponseOf<F1>]) =>
          ev.length === 0
            ? idempotentCompleter(sa(s))
            : T.gen(function* (_) {
                const updatedState = self.applyEvents(ev, s)
                yield* _(
                  journal.persistEntry(self.persistenceId, self.eventSchema, ev, self.stateSchema, M.just(updatedState))
                )
                yield* _(effectfulCompleter(updatedState, sa(updatedState)))
              })
        yield* _(
          T.matchIO_(
            reciever,
            (e) =>
              pipe(
                supervisor.supervise(reciever, e),
                T.matchIO(() => T.asUnit(F.fail_(promise, e)), fullCompleter)
              ),
            fullCompleter
          )
        )
      })
    }

    const retrieveJournal = pipe(
      T.askService(JournalFactory),
      T.chain((jf) => jf.getJournal<S, EV>(context.actorSystem.actorSystemName))
    )

    return (initial) =>
      T.gen(function* (_) {
        const journal = yield* _(retrieveJournal)
        const state   = yield* _(Ref.make(initial))
        const queue   = yield* _(Q.makeBounded<A.PendingMessage<F1>>(mailboxSize))
        yield* _(
          T.fork(
            T.gen(function* (_) {
              const [persistedState, persistedEvents] = yield* _(
                journal.getEntry(self.persistenceId, self.eventSchema, self.stateSchema)
              )
              yield* _(
                M.match_(
                  persistedState,
                  () => T.unit(),
                  (s) => Ref.set_(state, s)
                )
              )
              yield* _(
                pipe(
                  persistedEvents,
                  S.mapIO((ev) => Ref.update_(state, (s) => self.sourceEvent(s)(ev))),
                  S.runDrain
                )
              )
              yield* _(
                pipe(
                  Q.take(queue),
                  T.tap((t) => process(t, state, journal)),
                  T.forever
                )
              )
            })
          )
        )
        return new A.Actor(self.messages, queue, optOutActorSystem)
      })
  }
}
