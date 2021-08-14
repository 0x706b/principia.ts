import type { PendingMessage } from '@principia/actors/Actor'
import type { ActorSystemException } from '@principia/actors/exceptions'
import type * as AM from '@principia/actors/Message'
import type * as SUP from '@principia/actors/Supervisor'
import type { Has } from '@principia/base/Has'
import type { IOEnv } from '@principia/base/IOEnv'

import { AbstractStateful, Actor } from '@principia/actors/Actor'
import { withSystem } from '@principia/actors/ActorRef'
import * as AS from '@principia/actors/ActorSystem'
import { defaultPrettyPrint } from '@principia/base/Cause'
import * as C from '@principia/base/Chunk'
import { identity, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as T from '@principia/base/IO'
import * as L from '@principia/base/Layer'
import * as M from '@principia/base/Managed'
import * as O from '@principia/base/Option'
import * as P from '@principia/base/Promise'
import * as Q from '@principia/base/Queue'
import * as Ref from '@principia/base/Ref'
import { hash } from '@principia/base/Structural'
import * as PG from '@principia/pg'
import * as S from '@principia/schema'
import * as Decoder from '@principia/schema/Decoder'
import * as Encoder from '@principia/schema/Encoder'

export type TransactionalEnvelope<F1 extends AM.AnyMessage> = {
  [Tag in AM.TagsOf<F1>]: {
    _tag: Tag
    payload: AM.RequestOf<AM.ExtractTagged<F1, Tag>>
    handle: <R, E>(
      _: T.IO<R, E, AM.ResponseOf<AM.ExtractTagged<F1, Tag>>>
    ) => T.IO<R, E, AM.ResponseOf<AM.ExtractTagged<F1, Tag>>>
  }
}[AM.TagsOf<F1>]

export function transactional<S, F1 extends AM.AnyMessage, Ev = never>(
  messages: AM.MessageRegistry<F1>,
  stateSchema: S.Standard<S>,
  eventSchema: O.Option<S.Standard<Ev>>
) {
  return <R>(
    receive: (
      dsl: {
        state: {
          get: T.UIO<S>
          set: (s: S) => T.UIO<void>
        }
        event: {
          emit: (e: Ev) => T.UIO<void>
        }
      },
      context: AS.Context<F1>
    ) => (
      msg: TransactionalEnvelope<F1>
    ) => T.IO<R, ActorSystemException, AM.ResponseOf<AM.ExtractTagged<F1, F1['_tag']>>>
  ) => new Transactional<R, S, Ev, F1>(messages, stateSchema, eventSchema, receive)
}

export interface StateStorageAdapter {
  readonly transaction: (persistenceId: string) => <R, E, A>(effect: T.IO<R, E, A>) => T.IO<R, E, A>

  readonly get: (persistenceId: string) => T.IO<
    unknown,
    never,
    O.Option<{
      persistenceId: string
      shard: number
      state: unknown
      event_sequence: number
    }>
  >

  readonly set: (persistenceId: string, value: unknown, event_sequence: number) => T.IO<unknown, never, void>

  readonly emit: (persistenceId: string, value: unknown, event_sequence: number) => T.IO<unknown, never, void>
}

export const StateStorageAdapter = tag<StateStorageAdapter>()

export interface ShardConfig {
  shards: number
}

export const ShardConfig = tag<ShardConfig>()

export const LiveStateStorageAdapter = L.fromManaged(StateStorageAdapter)(
  M.gen(function* (_) {
    const cli = yield* _(PG.PG)

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "state_journal" (
        persistence_id  text PRIMARY KEY,
        shard           integer,
        event_sequence  integer,
        state           jsonb
      );`)
    )

    yield* _(
      cli.query(`
      CREATE TABLE IF NOT EXISTS "event_journal" (
        persistence_id  text,
        shard           integer,
        sequence        integer,
        event           jsonb,
        PRIMARY KEY(persistence_id, sequence)
      );`)
    )

    const transaction: (persistenceId: string) => <R, E, A>(effect: T.IO<R, E, A>) => T.IO<R, E, A> = () =>
      cli.transaction

    const get = (
      persistenceId: string
    ): T.IO<
      unknown,
      never,
      O.Option<{
        persistenceId: string
        shard: number
        state: unknown
        event_sequence: number
      }>
    > =>
      pipe(
        cli.query(`SELECT * FROM "state_journal" WHERE "persistence_id" = '${persistenceId}'`),
        T.map((res) =>
          pipe(
            O.fromNullable(res.rows?.[0]),
            O.map((row) => ({
              persistenceId: row.actor_name,
              shard: row.shard,
              state: row['state'],
              event_sequence: row.event_sequence
            }))
          )
        )
      )

    const set: (persistenceId: string, value: unknown, event_sequence: number) => T.IO<unknown, never, void> = (
      persistenceId,
      value,
      event_sequence
    ) =>
      pipe(
        calcShard(persistenceId),
        T.chain((shard) =>
          cli.query(
            `INSERT INTO "state_journal" ("persistence_id", "shard", "state", "event_sequence") VALUES('${persistenceId}', $2::integer, $1::jsonb, $3::integer) ON CONFLICT ("persistence_id") DO UPDATE SET "state" = $1::jsonb, "event_sequence" = $3::integer`,
            [JSON.stringify(value), shard, event_sequence]
          )
        ),
        T.asUnit
      )

    const emit: (persistenceId: string, value: unknown, event_sequence: number) => T.IO<unknown, never, void> = (
      persistenceId,
      value,
      event_sequence
    ) =>
      pipe(
        calcShard(persistenceId),
        T.chain((shard) =>
          cli.query(
            `INSERT INTO "event_journal" ("persistence_id", "shard", "event", "sequence") VALUES('${persistenceId}', $2::integer, $1::jsonb, $3::integer)`,
            [JSON.stringify(value), shard, event_sequence]
          )
        ),
        T.asUnit
      )['|>'](
        T.tapCause((c) =>
          T.succeedLazy(() => {
            console.log(defaultPrettyPrint(c))
          })
        )
      )

    return identity<StateStorageAdapter>({
      transaction,
      get,
      set,
      emit
    })
  })
)

const mod = (m: number) => (x: number) => x < 0 ? (x % m) + m : x % m

const calcShard = (id: string) =>
  T.asks((r: unknown) => {
    const maybe = ShardConfig.readOption(r)
    if (O.isSome(maybe)) {
      return mod(maybe.value.shards)(hash(id))
    } else {
      return mod(16)(hash(id))
    }
  })

export class Transactional<R, S, Ev, F1 extends AM.AnyMessage> extends AbstractStateful<
  R & Has<StateStorageAdapter>,
  S,
  F1
> {
  private readonly dbStateSchema = S.properties({
    current: S.prop(this.stateSchema)
  })

  readonly decodeState = (s: unknown, system: AS.ActorSystem) =>
    S.condemnHalt((u) => withSystem(system)(() => Decoder.for(this.dbStateSchema)(u)))(s)

  readonly encodeState = Encoder.for(this.dbStateSchema)

  readonly encodeEvent = O.map_(this.eventSchema, (s) => Encoder.for(S.properties({ event: S.prop(s) })))

  readonly getState = (initial: S, system: AS.ActorSystem, actorName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    return T.gen(function* (_) {
      const { get } = yield* _(StateStorageAdapter)

      const state = yield* _(get(actorName))

      if (O.isSome(state)) {
        return [(yield* _(self.decodeState(state.value.state, system))).current, state.value.event_sequence] as const
      }
      return [initial, 0] as const
    })
  }

  readonly setState = (current: S, actorName: string, sequence: number) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    return T.gen(function* (_) {
      const { set } = yield* _(StateStorageAdapter)

      yield* _(set(actorName, self.encodeState({ current }), sequence))
    })
  }

  readonly emitEvent = (event: Ev, actorName: string, sequence: number) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    return T.gen(function* (_) {
      const { emit } = yield* _(StateStorageAdapter)
      const encode   = yield* _(self.encodeEvent)

      yield* _(emit(actorName, encode({ event }), sequence))
    })
  }

  constructor(
    readonly messages: AM.MessageRegistry<F1>,
    readonly stateSchema: S.Standard<S>,
    readonly eventSchema: O.Option<S.Standard<Ev>>,
    readonly receive: (
      dsl: {
        state: {
          get: T.UIO<S>
          set: (s: S) => T.UIO<void>
        }
        event: {
          emit: (e: Ev) => T.UIO<void>
        }
      },
      context: AS.Context<F1>
    ) => (
      msg: TransactionalEnvelope<F1>
    ) => T.IO<R, ActorSystemException, AM.ResponseOf<AM.ExtractTagged<F1, F1['_tag']>>>
  ) {
    super()
  }

  defaultMailboxSize = 10000

  makeActor(
    supervisor: SUP.Supervisor<R, AM.ErrorOf<F1> | ActorSystemException>,
    context: AS.Context<F1>,
    optOutActorSystem: () => T.IO<IOEnv, ActorSystemException, void>,
    mailboxSize: number = this.defaultMailboxSize
  ): (initial: S) => T.URIO<R & IOEnv & Has<StateStorageAdapter>, Actor<F1>> {
    const self = this

    const process = (msg: PendingMessage<F1>, initial: S) => {
      return T.asksServicesIO({ prov: StateStorageAdapter })(({ prov }) =>
        pipe(
          AS.resolvePath(context.address)['|>'](T.orHalt),
          T.map(([sysName, __, ___, actorName]) => `${sysName}(${actorName})`),
          T.chain((actorName) =>
            prov.transaction(actorName)(
              pipe(
                T.do,
                T.chainS('s', () => self.getState(initial, context.actorSystem, actorName)),
                T.chainS('events', () => Ref.make(C.empty<Ev>())),
                T.chainS('state', (_) => Ref.make(_.s[0])),
                T.pureS('fa', () => msg[0]),
                T.pureS('promise', () => msg[1]),
                T.pureS('receiver', (_) => {
                  return this.receive(
                    {
                      event: {
                        emit: (ev) => Ref.update_(_.events, C.append(ev))
                      },
                      state: { get: Ref.get(_.state), set: (s) => Ref.set_(_.state, s) }
                    },
                    context
                  )({ _tag: _.fa._tag as any, payload: _.fa as any, handle: identity })
                }),
                T.pureS(
                  'completer',
                  (_) => (a: AM.ResponseOf<F1>) =>
                    pipe(
                      T.cross_(Ref.get(_.events), Ref.get(_.state)),
                      T.chain(([evs, s]) =>
                        T.cross_(
                          self.setState(s, actorName, _.s[1] + evs.length),
                          T.foreach_(C.zipWithIndexOffset_(evs, _.s[1] + 1), ([ev, seq]) =>
                            self.emitEvent(ev, actorName, seq)
                          )
                        )
                      ),
                      T.crossSecond(P.succeed_(_.promise, a)),
                      T.as(T.unit)
                    )
                ),
                T.chain((_) =>
                  T.matchIO_(
                    _.receiver,
                    (e) =>
                      pipe(
                        supervisor.supervise(_.receiver, e),
                        T.matchIO((__) => P.fail_(_.promise, e), _.completer)
                      ),
                    _.completer
                  )
                )
              )['|>'](
                T.tapCause((c) =>
                  T.succeedLazy(() => {
                    console.error(defaultPrettyPrint(c))
                  })
                )
              )
            )
          )
        )
      )
    }

    return (initial) =>
      pipe(
        T.do,
        T.chainS('state', () => Ref.make(initial)),
        T.chainS('queue', () => Q.makeBounded<PendingMessage<F1>>(mailboxSize)),
        T.chainS('ref', () => Ref.make(O.none<S>())),
        T.tap((_) =>
          pipe(
            Q.take(_.queue),
            T.chain((t) => process(t, initial)),
            T.forever,
            T.fork
          )
        ),
        T.map((_) => new Actor(this.messages, _.queue, optOutActorSystem))
      )
  }
}
