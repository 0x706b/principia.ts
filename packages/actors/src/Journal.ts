import type { ActorSystemException } from './exceptions'
import type * as SCH from '@principia/schema'

import { CaseClass } from '@principia/base/Case'
import * as CH from '@principia/base/Chunk'
import * as S from '@principia/base/experimental/Stream'
import { pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as HM from '@principia/base/HashMap'
import * as T from '@principia/base/IO'
import * as M from '@principia/base/Maybe'
import * as Ref from '@principia/base/Ref'
import { tuple } from '@principia/base/tuple'

export class PersistenceId extends CaseClass<{ id: string }> {}

export interface Journal<S, EV> {
  persistEntry(
    persistenceId: PersistenceId,
    eventSchema: SCH.Standard<EV>,
    events: CH.Chunk<EV>,
    stateSchema: SCH.Standard<S>,
    state: M.Maybe<S>
  ): T.IO<unknown, ActorSystemException, void>
  getEntry(
    persistenceId: PersistenceId,
    eventSchema: SCH.Standard<EV>,
    stateSchema: SCH.Standard<S>
  ): T.IO<unknown, ActorSystemException, readonly [M.Maybe<S>, S.Stream<unknown, ActorSystemException, EV>]>
}

export interface JournalFactory {
  getJournal<S, EV>(actorSystemName: string): T.IO<unknown, ActorSystemException, Journal<S, EV>>
}
export const JournalFactory = tag<JournalFactory>()

export class InMemoryJournal<S, EV> implements Journal<S, EV> {
  constructor(private readonly journalRef: Ref.URef<HM.HashMap<PersistenceId, CH.Chunk<EV>>>) {}

  persistEntry(
    persistenceId: PersistenceId,
    eventSchema: SCH.Standard<EV>,
    events: CH.Chunk<EV>,
    stateSchema: SCH.Standard<S>,
    state: M.Maybe<S>
  ): T.IO<unknown, ActorSystemException, void> {
    return pipe(
      Ref.update_(
        this.journalRef,
        HM.modify(persistenceId, (a) =>
          M.just(
            CH.foldl_(
              events,
              M.getOrElse_(a, () => CH.empty<EV>()),
              (s, a) => CH.append_(s, a)
            )
          )
        )
      )
    )
  }

  getEntry(
    persistenceId: PersistenceId,
    eventSchema: SCH.Standard<EV>,
    stateSchema: SCH.Standard<S>
  ): T.IO<unknown, ActorSystemException, readonly [M.Maybe<S>, S.Stream<unknown, ActorSystemException, EV>]> {
    return pipe(
      Ref.get(this.journalRef),
      T.map((_) => M.getOrElse_(HM.get_(_, persistenceId), () => CH.empty<EV>())),
      T.map((e) => tuple(M.nothing() as M.Maybe<S>, S.fromChunk(e)))
    )
  }
}

export class InMemoryJournalFactory implements JournalFactory {
  constructor(private readonly journalMap: Ref.URef<HM.HashMap<string, InMemoryJournal<any, any>>>) {}

  getJournal<S, EV>(actorSystemName: string): T.IO<unknown, ActorSystemException, Journal<S, EV>> {
    const currentJournal = pipe(Ref.get(this.journalMap), T.map(HM.get(actorSystemName)))

    return pipe(
      currentJournal,
      T.chain(
        M.match(
          () =>
            pipe(
              T.do,
              T.chainS('journalRef', (_) => Ref.make(HM.makeDefault<PersistenceId, CH.Chunk<EV>>())),
              T.map((_) => new InMemoryJournal<S, EV>(_.journalRef)),
              T.tap((_) => Ref.update_(this.journalMap, HM.set(actorSystemName, _)))
            ),
          T.succeed
        )
      )
    )
  }
}

export const makeInMemoryJournal = pipe(
  Ref.make<HM.HashMap<string, InMemoryJournal<any, any>>>(HM.makeDefault()),
  T.map((_) => new InMemoryJournalFactory(_))
)
